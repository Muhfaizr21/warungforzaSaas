package controllers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetOrderStats returns aggregated statistics for Orders
func GetOrderStats(c *gin.Context) {
	var total int64
	var pending int64
	var processing int64
	var shipped int64
	var cancelled int64

	// Total
	config.DB.Model(&models.Order{}).Count(&total)

	// Pending (new orders needing attention)
	config.DB.Model(&models.Order{}).Where("status = ?", "pending").Count(&pending)

	// Processing (paid/ready to ship)
	config.DB.Model(&models.Order{}).Where("status = ?", "processing").Count(&processing)

	// Shipped (completed/on the way)
	config.DB.Model(&models.Order{}).Where("status = ?", "shipped").Count(&shipped)

	// Cancelled
	config.DB.Model(&models.Order{}).Where("status = ?", "cancelled").Count(&cancelled)

	c.JSON(http.StatusOK, gin.H{
		"total":      total,
		"pending":    pending,
		"processing": processing,
		"shipped":    shipped,
		"cancelled":  cancelled,
	})
}

// GetOrders - List orders with filters
func GetOrders(c *gin.Context) {
	var orders []models.Order
	status := c.Query("status")
	paymentStatus := c.Query("payment_status")
	search := c.Query("search")
	orderType := c.Query("type")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	query := config.DB.Preload("User").Preload("Items").Order("created_at desc")

	// SECURITY: Filter orders for authenticated non-staff users (customers)
	// Staff with permissions (role != 'user') should see all orders
	userVal, exists := c.Get("currentUser")
	if exists {
		user := userVal.(models.User)
		if user.Role.Slug == models.RoleUser {
			query = query.Where("user_id = ?", user.ID)
		}
	}

	if status != "" {
		if status == "balance_due" {
			// Special filter for POs with remaining balance
			query = query.Where("remaining_balance > 0 AND status != 'cancelled'")
		} else if status == "deposit_paid" {
			query = query.Where("payment_status = ?", "deposit_paid")
		} else {
			query = query.Where("status = ?", status)
		}
	}

	if paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	if orderType == "po" {
		subQuery := config.DB.Table("order_items").
			Select("order_items.order_id").
			Joins("JOIN products ON products.id = order_items.product_id").
			Where("products.product_type = 'po'")
		query = query.Where("id IN (?)", subQuery)
		log.Printf("FILTER: PO orders only")
	} else if orderType == "ready" {
		subQuery := config.DB.Table("order_items").
			Select("order_items.order_id").
			Joins("JOIN products ON products.id = order_items.product_id").
			Where("products.product_type = 'po'")
		query = query.Where("id NOT IN (?)", subQuery)
		log.Printf("FILTER: Ready orders only")
	}

	if search != "" {
		cleanSearch := "%" + strings.ReplaceAll(search, " ", "") + "%"
		searchTerm := "%" + search + "%"

		// Subquery for Products
		subQueryProducts := config.DB.Table("order_items").
			Select("order_items.order_id").
			Joins("JOIN products ON products.id = order_items.product_id").
			Where("REPLACE(products.name, ' ', '') ILIKE ? OR products.name ILIKE ?", cleanSearch, searchTerm)

		// Subquery for Users
		subQueryUsers := config.DB.Table("users").
			Select("id").
			Where("REPLACE(full_name, ' ', '') ILIKE ? OR full_name ILIKE ? OR username ILIKE ? OR email ILIKE ?", cleanSearch, searchTerm, searchTerm, searchTerm)

		// Combine filters
		query = query.Where("order_number ILIKE ? OR id IN (?) OR user_id IN (?)", searchTerm, subQueryProducts, subQueryUsers)
	}

	var total int64
	query.Model(&models.Order{}).Count(&total)

	if err := query.Limit(limit).Offset(offset).Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  orders,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetOrder - Get single order detail
func GetOrder(c *gin.Context) {
	id := c.Param("id")
	var order models.Order

	if err := config.DB.Preload("User").Preload("Items.Product").Preload("Logs").Preload("Invoices").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// SECURITY: IDOR Check
	userVal, exists := c.Get("currentUser")
	if exists {
		user := userVal.(models.User)
		// If user is a customer, restrict to their own order. Staff can view all.
		if user.Role.Slug == models.RoleUser && order.UserID != user.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to this order"})
			return
		}
	}

	// Generate tracking URL if tracking number exists
	trackingURL := ""
	if order.TrackingNumber != "" && order.Carrier != "" {
		var carrier models.CarrierTemplate
		if err := config.DB.Where("name = ? AND active = ?", order.Carrier, true).First(&carrier).Error; err == nil {
			// Replace placeholder in template
			trackingURL = carrier.TrackingURLTemplate
			// Simple string replacement for {tracking} placeholder
			if trackingURL != "" {
				trackingURL = strings.ReplaceAll(trackingURL, "{tracking}", order.TrackingNumber)
				trackingURL = strings.ReplaceAll(trackingURL, "{awb}", order.TrackingNumber)
			}
		}
	}

	// ---------------------------------------------------------
	// AUTO-CHECK PRISMALINK STATUS (Active Inquiry for Polling)
	// ---------------------------------------------------------
	if order.PaymentMethod == "QRIS" && (order.PaymentStatus == "unpaid" || order.PaymentStatus == "pending") {
		go func() {
			// Run in background header or do it blocking?
			// Blocking is better for the poll to return immediate success.
		}()

		var lastInvoice models.Invoice
		if err := config.DB.Where("order_id = ?", order.ID).Order("created_at desc").First(&lastInvoice).Error; err == nil {
			var payTx models.PaymentTransaction
			if err := config.DB.Where("invoice_id = ?", lastInvoice.ID).First(&payTx).Error; err == nil && payTx.MerchantRefNo != "" {

				// Call Prismalink Inquiry
				// We send "QR" because we know this block is for QRIS
				res, err := helpers.CheckPrismalinkStatus(payTx.MerchantRefNo, payTx.GatewayTxID, lastInvoice.Amount, "QR")
				if err == nil {
					// Extract Status - Prismalink uses "transaction_status" in inquiry response
					upstreamStatus, _ := res["transaction_status"].(string)
					if upstreamStatus == "" {
						upstreamStatus, _ = res["payment_status"].(string)
					}
					if upstreamStatus == "" {
						upstreamStatus, _ = res["status"].(string)
					}
					// Check nested data (Prismalink often wraps in "data")
					if data, ok := res["data"].(map[string]interface{}); ok {
						if s, ok := data["transaction_status"].(string); ok && s != "" {
							upstreamStatus = s
						} else if s, ok := data["payment_status"].(string); ok && s != "" {
							upstreamStatus = s
						}
					}

					log.Printf("Auto-Inquiry %s: %s", payTx.MerchantRefNo, upstreamStatus)

					// If Paid, Update DB
					if upstreamStatus == "SETLD" || upstreamStatus == "SUCCESS" || upstreamStatus == "00" || upstreamStatus == "PAID" {
						tx := config.DB.Begin()

						// Update Invoice
						now := time.Now()
						lastInvoice.Status = "paid"
						lastInvoice.PaidAt = &now
						tx.Save(&lastInvoice)

						// Update Payment Tx
						payTx.Status = "success"
						tx.Save(&payTx)

						// Update Order
						order.PaymentStatus = "paid"
						order.Status = "processing"
						order.RemainingBalance = 0
						tx.Save(&order)

						// Record Journal (Simplified check)
						helpers.RecordPaymentJournal(tx, &lastInvoice, payTx.MerchantRefNo)

						tx.Commit()

						log.Printf("Order Auto-Updated to PAID via Inquiry")
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"order":        order,
		"tracking_url": trackingURL,
	})
}

// UpdateOrderStatus - Change fulfillment/payment status
func UpdateOrderStatus(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	// SECURITY: Staff Only Check
	userVal, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userVal.(models.User)
	if user.Role.Slug == models.RoleUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only staff can update order status"})
		return
	}

	var input struct {
		Status            string `json:"status"`
		PaymentStatus     string `json:"payment_status"`
		FulfillmentStatus string `json:"fulfillment_status"`
		InternalNotes     string `json:"internal_notes"`
		TrackingNumber    string `json:"tracking_number"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderService := services.NewOrderService()
	order, err := orderService.UpdateOrder(services.UpdateOrderInput{
		OrderID:           uint(id),
		RequesterID:       user.ID,
		Status:            input.Status,
		PaymentStatus:     input.PaymentStatus,
		FulfillmentStatus: input.FulfillmentStatus,
		InternalNotes:     input.InternalNotes,
		TrackingNumber:    input.TrackingNumber,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// ShipOrder - Mark order as shipped with tracking
func ShipOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var input services.OrderActionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.OrderID = uint(id)
	input.RequesterID = c.MustGet("currentUser").(models.User).ID

	orderSvc := services.NewOrderService()
	order, err := orderSvc.ShipOrder(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// CancelOrder - Cancel an order with reason
func CancelOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var input struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderSvc := services.NewOrderService()
	order, err := orderSvc.CancelOrder(services.OrderActionInput{
		OrderID:     uint(id),
		RequesterID: c.MustGet("currentUser").(models.User).ID,
		Reason:      input.Reason,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel order: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    order,
		"message": "Order cancelled successfully",
	})
}

// RefundOrder - Process refund for an order
func RefundOrder(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var input services.OrderActionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.OrderID = uint(id)
	user := c.MustGet("currentUser").(models.User)

	orderSvc := services.NewOrderService()
	order, err := orderSvc.RefundOrder(input, user, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// OpenBalanceDue - Explicitly opens/activates the balance payment invoice for a PO order.
// This is semantically different from MarkOrderArrived: it allows manual activation
// of the balance invoice without triggering the full arrival flow.
func OpenBalanceDue(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order ID"})
		return
	}

	var order models.Order
	if err := config.DB.Preload("Items.Product").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.PaymentStatus != "deposit_paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order must be in deposit_paid status to open balance"})
		return
	}

	// Find the pending_arrival or unpaid balance invoice and activate it
	var balanceInvoice models.Invoice
	if err := config.DB.Where("order_id = ? AND type = ? AND status IN ?", order.ID, "balance", []string{"pending_arrival", "unpaid"}).First(&balanceInvoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Balance invoice not found or already activated/paid"})
		return
	}

	// Activate balance invoice by opening it for payment
	balanceInvoice.Status = "unpaid"
	if err := config.DB.Save(&balanceInvoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate balance invoice"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	config.DB.Create(&models.OrderLog{
		OrderID:           order.ID,
		UserID:            user.ID,
		Action:            "balance_opened",
		Note:              fmt.Sprintf("Balance invoice %s manually opened for payment by %s", balanceInvoice.InvoiceNumber, user.Username),
		IsCustomerVisible: true,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Balance invoice activated successfully",
		"invoice": balanceInvoice,
	})
}

// AddOrderNote - Add internal note to order (Keep in controller as it's a simple update)
func AddOrderNote(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Note string `json:"note" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	order.InternalNotes += "\n[NOTE] " + input.Note
	config.DB.Save(&order)

	// Log
	user := c.MustGet("currentUser").(models.User)
	config.DB.Create(&models.OrderLog{
		OrderID: order.ID,
		UserID:  user.ID,
		Action:  "add_note",
		Note:    input.Note,
	})

	c.JSON(http.StatusOK, order)
}

// GetOrderInvoices - Get invoices for an order
func GetOrderInvoices(c *gin.Context) {
	id := c.Param("id")
	var invoices []models.Invoice
	config.DB.Where("order_id = ?", id).Find(&invoices)
	c.JSON(http.StatusOK, invoices)
}

// GetBiteshipOrderInfo - Admin: Get Biteship order detail via API
func GetBiteshipOrderInfo(c *gin.Context) {
	id := c.Param("id")
	var order models.Order
	if err := config.DB.First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.BiteshipOrderID == "" {
		c.JSON(http.StatusOK, gin.H{
			"message":      "Order ini belum terhubung dengan Biteship",
			"has_biteship": false,
			"order_number": order.OrderNumber,
		})
		return
	}

	biteshipSvc := services.NewBiteshipService()
	result, err := biteshipSvc.RetrieveOrder(order.BiteshipOrderID)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Gagal menghubungi Biteship: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"has_biteship":      true,
		"biteship_order_id": order.BiteshipOrderID,
		"biteship_data":     result,
	})
}

// ConfirmDelivery - User confirms order delivery
func ConfirmDelivery(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	user := c.MustGet("currentUser").(models.User)

	orderSvc := services.NewOrderService()
	order, err := orderSvc.ConfirmDelivery(uint(id), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// MarkOrderArrived - Admin triggers item arrival, enabling balance payment
func MarkOrderArrived(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	orderSvc := services.NewOrderService()
	order, err := orderSvc.MarkArrived(uint(id), c.MustGet("currentUser").(models.User).ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// ForceCancelPO - Admin forfeits deposit and cancels order (Ghosting scenario)
func ForceCancelPO(c *gin.Context) {
	id := c.Param("id")
	// For simplicity, let's just use the service's CheckExpiredPOs logic for a single order if needed,
	// or move this specific logic to service too.
	// For now, I'll move it to service.

	idUint, _ := strconv.Atoi(id)
	user := c.MustGet("currentUser").(models.User)

	orderSvc := services.NewOrderService()
	// I'll create a single ForfeitPO method in service
	order, err := orderSvc.ForfeitPO(uint(idUint), user.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, order)
}

// QuickShipByQR - Quick ship order by scanning QR Code (Warehouse Feature)
// Finds product by QR code, then auto-ships the active processing order for that product.
func QuickShipByQR(c *gin.Context) {
	qrCode := c.Query("qr")
	if qrCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "QR Code is required"})
		return
	}

	// 1. Find product by QR code
	var product models.Product
	if err := config.DB.Where("qr_code = ?", qrCode).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found for QR: " + qrCode})
		return
	}

	// 2. Find the most recent processing order that contains this product
	var orderItem models.OrderItem
	err := config.DB.
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("order_items.product_id = ? AND orders.status = ?", product.ID, "processing").
		Order("order_items.created_at DESC").
		First(&orderItem).Error

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":        "No active processing order found for this product",
			"product_name": product.Name,
			"qr_code":      qrCode,
		})
		return
	}

	// 3. Get carrier and tracking from request body (optional, can be empty for manual later)
	var input struct {
		TrackingNumber string `json:"tracking_number"`
		Carrier        string `json:"carrier"`
	}
	// Ignore bind error — these are optional for quick ship
	c.ShouldBindJSON(&input)

	if input.TrackingNumber == "" {
		input.TrackingNumber = "PENDING-" + fmt.Sprintf("%d", time.Now().Unix())
	}
	if input.Carrier == "" {
		input.Carrier = "Manual"
	}

	// 4. Call ShipOrder service
	user := c.MustGet("currentUser").(models.User)
	orderSvc := services.NewOrderService()
	order, err2 := orderSvc.ShipOrder(services.OrderActionInput{
		OrderID:        orderItem.OrderID,
		RequesterID:    user.ID,
		TrackingNumber: input.TrackingNumber,
		Carrier:        input.Carrier,
	})
	if err2 != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to ship order: " + err2.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Order shipped successfully via QR scan",
		"product":         product.Name,
		"order_id":        order.ID,
		"order_number":    order.OrderNumber,
		"tracking_number": input.TrackingNumber,
	})
}

// CreateAdminOrder - Create a new order manually (POS style)
func CreateAdminOrder(c *gin.Context) {
	admin := c.MustGet("currentUser").(models.User)

	var input struct {
		UserID uint `json:"user_id" binding:"required"` // Can use a generic "Walk-in" user ID if needed
		Items  []struct {
			ProductID uint    `json:"product_id" binding:"required"`
			Quantity  int     `json:"quantity" binding:"required"`
			Price     float64 `json:"price"` // Optional override. If 0, use product price.
		} `json:"items" binding:"required"`

		IsPaidNow      bool    `json:"is_paid_now"`    // Mark as paid immediately
		PaymentMethod  string  `json:"payment_method"` // CASH, TRANSFER, EDC
		ShippingMethod string  `json:"shipping_method"`
		ShippingCost   float64 `json:"shipping_cost"`
		Notes          string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify User Exists
	var customer models.User
	if err := config.DB.First(&customer, input.UserID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Customer not found"})
		return
	}

	tx := config.DB.Begin()

	var orderItems []models.OrderItem
	var subtotal float64

	for _, item := range input.Items {
		var product models.Product
		if err := tx.First(&product, item.ProductID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Product %d not found", item.ProductID)})
			return
		}

		price := product.Price
		if item.Price > 0 {
			price = item.Price
		}

		total := price * float64(item.Quantity)
		subtotal += total

		// Reserve Stock
		newReserved := product.ReservedQty + item.Quantity
		if err := tx.Model(&product).Update("reserved_qty", newReserved).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reserve stock"})
			return
		}

		orderItems = append(orderItems, models.OrderItem{
			ProductID:    product.ID,
			Quantity:     item.Quantity,
			Price:        price,
			Total:        total,
			COGSSnapshot: product.SupplierCost,
		})
	}

	totalAmount := subtotal + input.ShippingCost // No discount logic for now

	order := models.Order{
		OrderNumber: fmt.Sprintf("POS-%d", time.Now().Unix()),
		UserID:      customer.ID,

		// Use Customer Profile for Billing/Shipping (simplify Manual Order)
		BillingFirstName: customer.FullName,
		BillingEmail:     customer.Email,
		BillingPhone:     customer.Phone,

		SubtotalAmount:   subtotal,
		ShippingCost:     input.ShippingCost,
		ShippingMethod:   input.ShippingMethod,
		TotalAmount:      totalAmount,
		RemainingBalance: totalAmount, // Will be updated if paid

		Status:        "pending",
		PaymentStatus: "unpaid",
		PaymentMethod: input.PaymentMethod,
		Notes:         input.Notes,
		Items:         orderItems,
	}

	if err := tx.Omit("Items").Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order header"})
		return
	}

	// Save Items
	for i := range orderItems {
		orderItems[i].OrderID = order.ID
	}
	if err := tx.Create(&orderItems).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save order items"})
		return
	}

	// Create Log
	tx.Create(&models.OrderLog{
		OrderID:           order.ID,
		UserID:            admin.ID,
		Action:            "created_manual",
		Note:              fmt.Sprintf("Order created manually by Admin %s (POS)", admin.Username),
		IsCustomerVisible: true,
	})

	// Generate Invoice (Full Payment by default for POS)
	invoiceType := "full"

	if err := helpers.GenerateInvoice(tx, order, invoiceType, totalAmount, "unpaid"); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate invoice"})
		return
	}

	// Process Payment if "Paid Now" is checked
	if input.IsPaidNow {
		// Find the generated invoice (just created)
		var invoice models.Invoice
		tx.Where("order_id = ?", order.ID).First(&invoice)

		if invoice.ID != 0 {
			now := time.Now()
			invoice.Status = "paid"
			invoice.PaidAt = &now
			invoice.PaymentMethod = input.PaymentMethod
			if invoice.PaymentMethod == "" {
				invoice.PaymentMethod = "CASH"
			}

			tx.Save(&invoice)

			// Update Order Status
			order.Status = "processing"
			if input.ShippingMethod == "PICKUP" || input.ShippingMethod == "POS" {
				order.Status = "completed" // If POS, user takes item immediately
			}
			order.PaymentStatus = "paid"
			order.RemainingBalance = 0
			order.DepositPaid = totalAmount // Full paid

			tx.Save(&order)

			// Record Journal
			gatewayID := fmt.Sprintf("POS-%d-%d", admin.ID, time.Now().Unix())
			helpers.RecordPaymentJournal(tx, &invoice, gatewayID)

			// Log
			tx.Create(&models.OrderLog{
				OrderID:           order.ID,
				UserID:            admin.ID,
				Action:            "payment_received",
				Note:              fmt.Sprintf("Payment of %.2f received via %s (POS)", invoice.Amount, invoice.PaymentMethod),
				IsCustomerVisible: true,
			})
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Transaction commit failed"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Order created manually", "order_id": order.ID})
}

// CheckExpiredPOs - Scan and cancel POs where balance payment is overdue (Ghost Protocol)
func CheckExpiredPOs(c *gin.Context) {
	var expiredInvoices []models.Invoice
	now := time.Now()

	// Find unpaid balance invoices that are past due
	err := config.DB.Preload("Order.Items").
		Where("type = ? AND status = ? AND due_date < ?", "balance", "unpaid", now).
		Find(&expiredInvoices).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan expired invoices"})
		return
	}

	cancelledCount := 0
	tx := config.DB.Begin()

	for _, inv := range expiredInvoices {
		if inv.Order.ID == 0 {
			continue
		}

		// 1. Release Stock
		for _, item := range inv.Order.Items {
			helpers.RecordStockMovement(tx, item.ProductID, -item.Quantity, "reserved", "cancellation", "ORDER", inv.Order.OrderNumber, "Auto-cancel: Overdue balance", nil)
			tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
				Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity))
		}

		// 2. Cancel Order
		inv.Order.Status = "cancelled"
		inv.Order.InternalNotes += "\n[AUTO-CANCEL] Ghost Protocol: Balance payment overdue. Deposit forfeited."
		tx.Save(&inv.Order)

		// 3. Update Invoice
		inv.Status = "cancelled"
		tx.Save(&inv)

		// 4. Financial Journal: Forfeit Deposit
		if inv.Order.DepositPaid > 0 {
			coaLiabID, _ := helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
			coaIncomeID, _ := helpers.GetCOAByMappingKey("OTHER_INCOME")

			if coaLiabID != 0 && coaIncomeID != 0 {
				helpers.PostJournalWithTX(tx, inv.Order.OrderNumber, "ADJUSTMENT", "Deposit Forfeited (Auto Ghost)", []models.JournalItem{
					{COAID: coaLiabID, Debit: inv.Order.DepositPaid, Credit: 0},
					{COAID: coaIncomeID, Debit: 0, Credit: inv.Order.DepositPaid},
				})
			}
		}

		cancelledCount++
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message":         fmt.Sprintf("Ghost Protocol executed. %d orders cancelled.", cancelledCount),
		"cancelled_count": cancelledCount,
	})
}
