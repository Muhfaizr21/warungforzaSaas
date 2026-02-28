package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ReservationTTL is the default time-to-live for stock reservations
const ReservationTTL = 30 * time.Minute

// ========================================
// RESERVATION CREATION & MANAGEMENT
// ========================================

// ReserveStockInput represents the request to reserve stock
type ReserveStockInput struct {
	ProductID uint `json:"product_id" binding:"required"`
	Quantity  int  `json:"quantity" binding:"required,min=1"`
}

// ReserveStock creates a stock reservation for checkout
// This locks the stock for a limited time while user completes payment
func ReserveStock(c *gin.Context) {
	var input ReserveStockInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from context (auth middleware sets this as uint)
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// userID is set as uint in middleware
	userID, ok := userIDVal.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	reservation, err := CreateReservation(input.ProductID, input.Quantity, userID, 0)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{
			"error":   err.Error(),
			"message": "Unable to reserve stock. Item may be out of stock or reserved by another customer.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Stock reserved successfully",
		"reservation": reservation,
		"expires_at":  reservation.ExpiresAt,
		"ttl_seconds": int(reservation.TimeRemaining().Seconds()),
	})
}

// CreateReservation handles the actual reservation logic with proper locking
// This is the core function that prevents race conditions
func CreateReservation(productID uint, quantity int, userID uint, orderID uint) (*models.StockReservation, error) {
	var reservation models.StockReservation

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Lock the product row for update (prevents concurrent reads)
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&product, productID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("product not found")
			}
			return err
		}

		// 2. Calculate available stock (total - reserved)
		availableStock := product.Stock - product.ReservedQty
		if availableStock < quantity {
			return errors.New("insufficient stock available")
		}

		// 3. Create the reservation
		reservation = models.StockReservation{
			OrderID:   orderID,
			ProductID: productID,
			Quantity:  quantity,
			Status:    models.ReservationReserved,
			ExpiresAt: time.Now().Add(ReservationTTL),
		}

		if err := tx.Create(&reservation).Error; err != nil {
			return err
		}

		// 4. Update product's reserved quantity
		if err := tx.Model(&product).
			Update("reserved_qty", gorm.Expr("reserved_qty + ?", quantity)).Error; err != nil {
			return err
		}

		log.Printf("📦 RESERVATION CREATED: Product %d, Qty %d, Expires %s",
			productID, quantity, reservation.ExpiresAt.Format("15:04:05"))

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &reservation, nil
}

// ========================================
// RESERVATION CONSUMPTION (Payment Success)
// ========================================

// ConsumeReservation converts a reservation to actual stock deduction
// Called when payment is confirmed
func ConsumeReservation(reservationID uint) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get and lock the reservation
		var reservation models.StockReservation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&reservation, reservationID).Error; err != nil {
			return err
		}

		// 2. Verify it's still in reserved status
		if reservation.Status != models.ReservationReserved {
			return errors.New("reservation is no longer active")
		}

		// 3. Lock the product
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&product, reservation.ProductID).Error; err != nil {
			return err
		}

		// 4. Deduct actual stock and reserved qty
		now := time.Now()
		if err := tx.Model(&product).Updates(map[string]interface{}{
			"stock":        gorm.Expr("stock - ?", reservation.Quantity),
			"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", reservation.Quantity),
		}).Error; err != nil {
			return err
		}

		// 5. Mark reservation as consumed
		if err := tx.Model(&reservation).Updates(map[string]interface{}{
			"status":      models.ReservationConsumed,
			"consumed_at": now,
		}).Error; err != nil {
			return err
		}

		log.Printf("✅ RESERVATION CONSUMED: ID %d, Product %d, Qty %d",
			reservationID, reservation.ProductID, reservation.Quantity)

		return nil
	})
}

// ConsumeReservationByOrderID consumes all reservations for an order
func ConsumeReservationByOrderID(orderID uint) error {
	var reservations []models.StockReservation
	if err := config.DB.Where("order_id = ? AND status = ?", orderID, models.ReservationReserved).
		Find(&reservations).Error; err != nil {
		return err
	}

	for _, r := range reservations {
		if err := ConsumeReservation(r.ID); err != nil {
			log.Printf("⚠️ Failed to consume reservation %d: %v", r.ID, err)
			// Continue with others, don't fail entirely
		}
	}

	return nil
}

// ========================================
// RESERVATION RELEASE (Cancellation/Expiry)
// ========================================

// ReleaseReservation releases a reservation and returns stock to available pool
func ReleaseReservation(reservationID uint, releasedBy string) error {
	return config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get and lock the reservation
		var reservation models.StockReservation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&reservation, reservationID).Error; err != nil {
			return err
		}

		// 2. Only release if currently reserved
		if reservation.Status != models.ReservationReserved {
			return nil // Already released/consumed, no action needed
		}

		// 3. Lock the product and release reserved qty
		var product models.Product
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&product, reservation.ProductID).Error; err != nil {
			return err
		}

		now := time.Now()
		if err := tx.Model(&product).
			Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", reservation.Quantity)).Error; err != nil {
			return err
		}

		// 4. Mark reservation as released
		status := models.ReservationReleased
		if releasedBy == "system_expiry" {
			status = models.ReservationExpired
		}

		if err := tx.Model(&reservation).Updates(map[string]interface{}{
			"status":      status,
			"released_at": now,
			"released_by": releasedBy,
		}).Error; err != nil {
			return err
		}

		log.Printf("🔓 RESERVATION RELEASED: ID %d, Product %d, Qty %d, By %s",
			reservationID, reservation.ProductID, reservation.Quantity, releasedBy)

		return nil
	})
}

// ReleaseReservationByOrderID releases all reservations for an order
func ReleaseReservationByOrderID(orderID uint, releasedBy string) error {
	var reservations []models.StockReservation
	if err := config.DB.Where("order_id = ? AND status = ?", orderID, models.ReservationReserved).
		Find(&reservations).Error; err != nil {
		return err
	}

	for _, r := range reservations {
		if err := ReleaseReservation(r.ID, releasedBy); err != nil {
			log.Printf("⚠️ Failed to release reservation %d: %v", r.ID, err)
		}
	}

	return nil
}

// ========================================
// EXPIRATION CLEANUP (Background Job)
// ========================================

// CleanupExpiredReservations finds and releases all expired reservations
// This should be called periodically by a cron job or ticker
func CleanupExpiredReservations() {
	var expired []models.StockReservation

	if err := config.DB.Where("status = ? AND expires_at < ?",
		models.ReservationReserved, time.Now()).Find(&expired).Error; err != nil {
		log.Printf("❌ Error finding expired reservations: %v", err)
		return
	}

	if len(expired) == 0 {
		return
	}

	log.Printf("🕐 Found %d expired reservations to cleanup", len(expired))

	for _, r := range expired {
		if err := ReleaseReservation(r.ID, "system_expiry"); err != nil {
			log.Printf("❌ Failed to release expired reservation %d: %v", r.ID, err)
			continue
		}

		// If this reservation was linked to an order, cancel the order too if it's still pending
		if r.OrderID != 0 {
			var order models.Order
			if err := config.DB.Preload("Invoices").First(&order, r.OrderID).Error; err == nil {
				if order.Status == "pending" {
					config.DB.Model(&order).Updates(map[string]interface{}{
						"status":         "cancelled",
						"internal_notes": order.InternalNotes + "\n[SYSTEM] Auto-cancelled: Payment reservation expired (30m).",
					})

					// Expire associated invoices
					for _, inv := range order.Invoices {
						if inv.Status == "unpaid" {
							config.DB.Model(&inv).Update("status", "expired")
						}
					}

					log.Printf("🚫 AUTO-CANCEL: Order %d cancelled due to reservation expiry", r.OrderID)
				}
			}
		}

		// Sektor 2: Waitlist / Restock Notifier
		var waitlists []models.RestockNotification
		if err := config.DB.Preload("User").Preload("Product").Where("product_id = ? AND status = ?", r.ProductID, "pending").Find(&waitlists).Error; err == nil && len(waitlists) > 0 {

			// Get actual available stock now
			availableStock, _ := GetAvailableStock(r.ProductID)
			if availableStock > 0 {
				for _, w := range waitlists {
					// Send email
					appURL := helpers.GetFrontendURL()
					emailBody := fmt.Sprintf(`
						<div style="font-family: sans-serif; padding: 20px;">
							<h2 style="color: #ef4444;">🎉 Kabar Gembira! Barang Impianmu Kembali Tersedia!</h2>
							<p>Halo %s,</p>
							<p>Seseorang baru saja terlambat membayar pesanannya untuk <strong>%s</strong>. Sekarang barang tersebut <strong>KEMBALI TERSEDIA (Sisa %d pcs)!</strong></p>
							<p>Siapa cepat dia dapat! Segera amankan barang ini sebelum disambar kolektor lain.</p>
							<a href="%s/product/%d" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display:inline-block; margin-top:15px; font-weight:bold;">Berburu Sekarang</a>
						</div>
					`, w.User.FullName, w.Product.Name, availableStock, appURL, w.Product.ID)

					helpers.SendEmail(w.User.Email, "🔥 ALERT! "+w.Product.Name+" Kembali Tersedia!", emailBody)
					helpers.NotifyUser(w.UserID, "RESTOCK_ALERT", fmt.Sprintf("%s kembali tersedia berdasarkan sistem pembatalan otomatis. Stok terbatas!", w.Product.Name), nil)

					// Mark as sent
					config.DB.Model(&w).Update("status", "sent")
				}
				log.Printf("📢 Waitlist Restock Alert sent for Product %d to %d users", r.ProductID, len(waitlists))
			}
		}
	}

	log.Printf("✅ Expired reservations cleanup complete")
}

// CleanupExpiredOrders cancels orders where the invoice due date has passed
func CleanupExpiredOrders() {
	var expiredInvoices []models.Invoice
	now := time.Now()

	err := config.DB.Preload("Order.Items").
		Where("status = ? AND due_date < ?", "unpaid", now).
		Find(&expiredInvoices).Error

	if err != nil || len(expiredInvoices) == 0 {
		return
	}

	tx := config.DB.Begin()
	cancelledCount := 0

	for _, inv := range expiredInvoices {
		if inv.Order.ID == 0 || inv.Order.Status != "pending" {
			continue
		}

		// 1. Release Stock
		for _, item := range inv.Order.Items {
			helpers.RecordStockMovement(tx, item.ProductID, -item.Quantity, "reserved", "cancellation", "ORDER", inv.Order.OrderNumber, "Auto-cancel: Payment expired", nil)
			tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
				Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity))

			// Sektor 2: Waitlist / Restock Notifier
			var waitlists []models.RestockNotification
			if err := tx.Preload("User").Preload("Product").Where("product_id = ? AND status = ?", item.ProductID, "pending").Find(&waitlists).Error; err == nil && len(waitlists) > 0 {
				var product models.Product
				if tx.Select("stock", "reserved_qty").First(&product, item.ProductID).Error == nil {
					availableStock := product.Stock - product.ReservedQty
					if availableStock > 0 {
						for _, w := range waitlists {
							appURL := helpers.GetFrontendURL()
							emailBody := fmt.Sprintf(`
								<div style="font-family: sans-serif; padding: 20px;">
									<h2 style="color: #ef4444;">🎉 Kabar Gembira! Barang Impianmu Kembali Tersedia!</h2>
									<p>Halo %s,</p>
									<p>Seseorang baru saja terlambat membayar pesanannya untuk <strong>%s</strong>. Sekarang barang tersebut <strong>KEMBALI TERSEDIA (Sisa %d pcs)!</strong></p>
									<p>Siapa cepat dia dapat! Segera amankan barang ini sebelum disambar kolektor lain.</p>
									<a href="%s/product/%d" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display:inline-block; margin-top:15px; font-weight:bold;">Berburu Sekarang</a>
								</div>
							`, w.User.FullName, w.Product.Name, availableStock, appURL, w.Product.ID)

							helpers.SendEmail(w.User.Email, "🔥 ALERT! "+w.Product.Name+" Kembali Tersedia!", emailBody)
							helpers.NotifyUser(w.UserID, "RESTOCK_ALERT", fmt.Sprintf("%s kembali tersedia berdasarkan sistem pembatalan otomatis. Stok terbatas!", w.Product.Name), nil)
							tx.Model(&w).Update("status", "sent")
						}
					}
				}
			}
		}

		// 2. Cancel Order
		inv.Order.Status = "cancelled"
		inv.Order.InternalNotes += "\n[SYSTEM] Auto-cancelled: Payment time expired."
		tx.Save(&inv.Order)

		// 3. Expire the Invoice
		inv.Status = "expired"
		tx.Save(&inv)

		cancelledCount++
		log.Printf("🚫 AUTO-CANCEL: Order %d cancelled due to expired invoice", inv.Order.ID)
	}

	tx.Commit()

	if cancelledCount > 0 {
		log.Printf("✅ Cleared %d expired orders due to missed payment.", cancelledCount)
	}
}

// StartReservationCleanupWorker starts a background goroutine to clean up expired reservations
func StartReservationCleanupWorker() {
	ticker := time.NewTicker(1 * time.Minute)

	go func() {
		log.Println("🔄 Stock Reservation Cleanup Worker Started")
		for range ticker.C {
			CleanupExpiredReservations()
			CleanupExpiredOrders()
		}
	}()
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// GetAvailableStock returns the actual available stock (total - reserved)
func GetAvailableStock(productID uint) (int, error) {
	var product models.Product
	if err := config.DB.Select("stock", "reserved_qty").First(&product, productID).Error; err != nil {
		return 0, err
	}
	return product.Stock - product.ReservedQty, nil
}

// GetReservationStatus returns the current reservation for a product/order
func GetReservationStatus(c *gin.Context) {
	orderID := c.Query("order_id")
	productID := c.Query("product_id")

	query := config.DB.Model(&models.StockReservation{}).Where("status = ?", models.ReservationReserved)

	if orderID != "" {
		query = query.Where("order_id = ?", orderID)
	}
	if productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	var reservations []models.StockReservation
	if err := query.Find(&reservations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reservations"})
		return
	}

	// Add TTL info
	type ReservationWithTTL struct {
		models.StockReservation
		TTLSeconds int `json:"ttl_seconds"`
	}

	result := make([]ReservationWithTTL, len(reservations))
	for i, r := range reservations {
		result[i] = ReservationWithTTL{
			StockReservation: r,
			TTLSeconds:       int(r.TimeRemaining().Seconds()),
		}
	}

	c.JSON(http.StatusOK, gin.H{"reservations": result})
}

// CheckStockAvailability checks if stock is available for checkout
func CheckStockAvailability(c *gin.Context) {
	log.Println("🔍 CheckStockAvailability endpoint HIT")

	var input struct {
		Items []struct {
			ProductID uint `json:"product_id"`
			Quantity  int  `json:"quantity"`
		} `json:"items"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	type AvailabilityResult struct {
		ProductID      uint   `json:"product_id"`
		RequestedQty   int    `json:"requested_qty"`
		AvailableStock int    `json:"available_stock"`
		IsAvailable    bool   `json:"is_available"`
		Message        string `json:"message,omitempty"`
	}

	results := make([]AvailabilityResult, 0)
	allAvailable := true

	for _, item := range input.Items {
		available, err := GetAvailableStock(item.ProductID)
		if err != nil {
			results = append(results, AvailabilityResult{
				ProductID:    item.ProductID,
				RequestedQty: item.Quantity,
				IsAvailable:  false,
				Message:      "Product not found",
			})
			allAvailable = false
			continue
		}

		isAvailable := available >= item.Quantity
		result := AvailabilityResult{
			ProductID:      item.ProductID,
			RequestedQty:   item.Quantity,
			AvailableStock: available,
			IsAvailable:    isAvailable,
		}

		if !isAvailable {
			allAvailable = false
			if available == 0 {
				result.Message = "Out of stock"
			} else {
				result.Message = "Insufficient stock"
			}
		}

		results = append(results, result)
	}

	c.JSON(http.StatusOK, gin.H{
		"all_available": allAvailable,
		"items":         results,
	})
}
