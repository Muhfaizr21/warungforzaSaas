package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Constanta untuk magic strings
const (
	ProductTypeReady     = "ready"
	ProductTypePO        = "po"
	PaymentMethodQRIS    = "QRIS"
	OrderStatusPending   = "pending"
	OrderStatusPaid      = "paid"
	OrderStatusUnpaid    = "unpaid"
	OrderStatusPreOrder  = "pre_order"
	OrderStatusCompleted = "completed"
	InvoiceTypeFull      = "full"
	InvoiceTypeDeposit   = "deposit"
	RoleUserSlug         = "user" // Asumsi, sesuaikan dengan models jika ada
	ActionOrderCreated   = "order_created"
	GuestUsername        = "guest_pos"
	GuestEmail           = "guest@pos.local"
)

type POSService struct {
	DB *gorm.DB
}

func NewPOSService() *POSService {
	return &POSService{
		DB: config.DB, // Dependency Injection bisa diterapkan di sini
	}
}

// SearchParams defines criteria for product search
type SearchParams struct {
	Query string
	Limit int
}

// SearchProducts performs an optimized search for POS
func (s *POSService) SearchProducts(params SearchParams) ([]models.Product, error) {
	var products []models.Product
	dbQuery := s.DB.Model(&models.Product{}).
		Preload("Category").
		Preload("Brand")
		// POS now shows both Ready and PO stock.

	if params.Query != "" {
		dbQuery = s.buildSearchQuery(dbQuery, params.Query)
	}

	if params.Limit <= 0 {
		params.Limit = 100
	}

	if err := dbQuery.Order("id DESC").Limit(params.Limit).Find(&products).Error; err != nil {
		return nil, err
	}

	// Calculate Virtual Stock
	for i := range products {
		products[i].AvailableStock = products[i].Stock - products[i].ReservedQty
	}

	return products, nil
}

func (s *POSService) buildSearchQuery(db *gorm.DB, query string) *gorm.DB {
	cleanQuery := "%" + strings.ReplaceAll(query, " ", "") + "%"
	likeQuery := "%" + query + "%"
	return db.Where(
		s.DB.Where("sku ILIKE ?", likeQuery).
			Or("qr_code ILIKE ?", likeQuery).
			Or("REPLACE(name, ' ', '') ILIKE ?", cleanQuery).
			Or("name ILIKE ?", likeQuery),
	)
}

// CreateOrderInput structure for POS order creation
type CreateOrderInput struct {
	UserID        uint               `json:"user_id"`
	CustomerName  string             `json:"customer_name"`
	CustomerEmail string             `json:"customer_email"`
	Items         []models.OrderItem `json:"items"`
	PaymentMethod string             `json:"payment_method"`
	POPaymentType string             `json:"po_payment_type"`
	Notes         string             `json:"notes"`
	ProcessorID   uint
	IPAddress     string
	UserAgent     string
}

// CreateOrderResult contains the result of an order creation
type CreateOrderResult struct {
	Order      models.Order
	PaymentURL string
}

// CreateOrder handles the entire order creation process within a transaction
func (s *POSService) CreateOrder(input CreateOrderInput) (*CreateOrderResult, error) {
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("pilih setidaknya satu item")
	}

	return s.withTransaction(func(tx *gorm.DB) (*CreateOrderResult, error) {
		// 1. Process Items & Update Stock
		orderItems, totalAmount, isPO, err := s.processOrderItems(tx, input.Items, input.ProcessorID)
		if err != nil {
			return nil, err
		}

		// 2. Handle User
		userID := input.UserID
		if userID == 0 {
			userID, err = s.getOrCreateGuestUser(tx)
			if err != nil {
				return nil, err
			}
		}

		// 3. Determine Status
		pm := strings.ToUpper(input.PaymentMethod)
		status, paymentStatus, invoiceStatus := s.determineOrderStatus(pm, isPO, input.POPaymentType)

		// 4. Create Order Record
		order, err := s.createOrderRecord(tx, userID, input, totalAmount, pm, status, paymentStatus, orderItems)
		if err != nil {
			return nil, err
		}

		// Calculate invoice amount (Simplified for POS: assumes full unless explicitly logic handled later, but POS PO usually takes full payment for now unless DP system is linked. For simplicity, we bill totalAmount as Deposit if PO Type is deposit, or Full if full).
		invoiceType := InvoiceTypeFull
		if isPO && input.POPaymentType == "deposit" {
			invoiceType = InvoiceTypeDeposit
		}

		// 5. Create Invoice Record
		invoice, err := s.createInvoiceRecord(tx, order.ID, userID, totalAmount, pm, invoiceStatus, invoiceType)
		if err != nil {
			return nil, err
		}

		// 6. Post-Creation Logic (Journal, Logs)
		if invoiceStatus == OrderStatusPaid {
			helpers.RecordPaymentJournal(tx, invoice, order.OrderNumber)
		}

		if err := s.logOrderAction(tx, order.ID, input.ProcessorID, pm); err != nil {
			return nil, err
		}

		// 7. Payment Link (Non-transactional concern returned for controller)
		// NOTE: Generation happens AFTER commit usually, but here we return instruction to do so or do it safe.
		// Since we are inside `withTransaction`, we can't do external API calls that depend on committed data easily unless we wait.
		// However, for consistency with previous code, we generate it here but errors don't rollback main tx usually if it's external.
		// BUT, `generatePaymentLinkSafe` reads from DB. It needs to read the COMMITTED user or the one in TX.
		// We will return the metadata needed to generate it controller-side or handle it carefully.

		paymentURL := ""
		if pm == PaymentMethodQRIS {
			// We use the TX to read user data to ensure we see guest user if created
			paymentURL, _ = s.generatePaymentLinkTx(tx, *order, *invoice, userID)
		}

		// Audit Log (Best effort, non-blocking usually, but here synchronous)
		helpers.LogAudit(input.ProcessorID, "Order", "POS_Create", fmt.Sprintf("%d", order.ID), "Direct sales from POS", nil, *order, input.IPAddress, input.UserAgent)

		return &CreateOrderResult{
			Order:      *order,
			PaymentURL: paymentURL,
		}, nil
	})
}

// Transaction Wrapper
func (s *POSService) withTransaction(fn func(tx *gorm.DB) (*CreateOrderResult, error)) (*CreateOrderResult, error) {
	tx := s.DB.Begin()
	if tx.Error != nil {
		return nil, tx.Error
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	result, err := fn(tx)
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("commit failed: %v", err)
	}

	return result, nil
}

// Internal Logic Methods

func (s *POSService) processOrderItems(tx *gorm.DB, items []models.OrderItem, staffID uint) ([]models.OrderItem, float64, bool, error) {
	var totalAmount float64
	var orderItems []models.OrderItem
	var isPO bool

	for _, itemInput := range items {
		var product models.Product
		if err := tx.First(&product, itemInput.ProductID).Error; err != nil {
			return nil, 0, false, fmt.Errorf("produk ID %d tidak ditemukan", itemInput.ProductID)
		}

		available := product.Stock - product.ReservedQty
		if available < itemInput.Quantity && product.ProductType == ProductTypeReady {
			return nil, 0, false, fmt.Errorf("stok %s tidak mencukupi (%d tersedia)", product.Name, available)
		}

		// Stock Movement
		if product.ProductType == ProductTypeReady {
			helpers.RecordStockMovement(tx, product.ID, -itemInput.Quantity, "physical", "sale", "POS", "DIRECT", "POS Direct Sales", &staffID)
			if err := tx.Model(&product).Update("stock", gorm.Expr("stock - ?", itemInput.Quantity)).Error; err != nil {
				return nil, 0, false, err
			}
		} else {
			helpers.RecordStockMovement(tx, product.ID, itemInput.Quantity, "reserved", "sale", "POS", "DIRECT", "POS Pre-Order Reservation", &staffID)
			if err := tx.Model(&product).Update("reserved_qty", gorm.Expr("reserved_qty + ?", itemInput.Quantity)).Error; err != nil {
				return nil, 0, false, err
			}
			isPO = true
		}

		itemTotal := product.Price * float64(itemInput.Quantity)
		totalAmount += itemTotal

		orderItems = append(orderItems, models.OrderItem{
			ProductID:    product.ID,
			Quantity:     itemInput.Quantity,
			Price:        product.Price,
			Total:        itemTotal,
			COGSSnapshot: product.SupplierCost,
		})
	}

	return orderItems, totalAmount, isPO, nil
}

func (s *POSService) determineOrderStatus(paymentMethod string, isPO bool, poPaymentType string) (string, string, string) {
	status := OrderStatusCompleted
	paymentStatus := OrderStatusPaid
	invoiceStatus := OrderStatusPaid

	if paymentMethod == PaymentMethodQRIS {
		status = OrderStatusPending
		paymentStatus = OrderStatusUnpaid
		invoiceStatus = OrderStatusUnpaid
	}

	if isPO {
		status = OrderStatusPreOrder
		if paymentStatus == OrderStatusPaid {
			if poPaymentType == "full" {
				paymentStatus = "paid_full"
			} else {
				paymentStatus = "deposit_paid"
			}
		}
	}

	return status, paymentStatus, invoiceStatus
}

func (s *POSService) createOrderRecord(tx *gorm.DB, userID uint, input CreateOrderInput, total float64, pm, status, payStatus string, items []models.OrderItem) (*models.Order, error) {
	order := models.Order{
		OrderNumber:      fmt.Sprintf("POS-%s", helpers.GenerateRandomString(8)),
		UserID:           userID,
		BillingFirstName: input.CustomerName,
		BillingEmail:     input.CustomerEmail,
		TotalAmount:      total,
		PaymentMethod:    pm,
		Status:           status,
		PaymentStatus:    payStatus,
		Source:           "pos",
		Items:            items,
		Notes:            input.Notes,
	}

	if order.BillingFirstName == "" {
		order.BillingFirstName = "Walk-in Guest"
	}

	if err := tx.Create(&order).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat order: %v", err)
	}
	return &order, nil
}

func (s *POSService) createInvoiceRecord(tx *gorm.DB, orderID, userID uint, amount float64, pm, status string, invType string) (*models.Invoice, error) {
	invoice := models.Invoice{
		InvoiceNumber: "INV-POS-" + helpers.GenerateRandomString(6),
		OrderID:       &orderID,
		UserID:        userID,
		Amount:        amount,
		Status:        status,
		PaymentMethod: pm,
		Type:          invType,
	}

	if err := tx.Create(&invoice).Error; err != nil {
		return nil, fmt.Errorf("gagal membuat invoice: %v", err)
	}
	return &invoice, nil
}

func (s *POSService) logOrderAction(tx *gorm.DB, orderID, userID uint, pm string) error {
	return tx.Create(&models.OrderLog{
		OrderID: orderID,
		UserID:  userID,
		Action:  ActionOrderCreated,
		Note:    fmt.Sprintf("POS Order created via %s by Staff", pm),
	}).Error
}

func (s *POSService) getOrCreateGuestUser(tx *gorm.DB) (uint, error) {
	var guestUser models.User
	if err := tx.Where("username = ?", GuestUsername).First(&guestUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			password, _ := bcrypt.GenerateFromPassword([]byte("guest123"), bcrypt.DefaultCost)
			// Need Role ID
			var roleID uint
			var role models.Role
			if err := tx.Where("slug = ?", models.RoleUser).First(&role).Error; err == nil {
				roleID = role.ID
			}

			guestUser = models.User{
				Username: GuestUsername,
				Email:    GuestEmail,
				Password: string(password),
				FullName: "Walk-in Customer (Guest)",
				RoleID:   roleID,
				Status:   "active",
			}
			if err := tx.Create(&guestUser).Error; err != nil {
				return 0, err
			}
		} else {
			return 0, err
		}
	}
	return guestUser.ID, nil
}

func (s *POSService) generatePaymentLinkTx(tx *gorm.DB, order models.Order, invoice models.Invoice, userID uint) (string, error) {
	var payUser models.User
	if err := tx.First(&payUser, userID).Error; err != nil {
		return "", err
	}
	if payUser.Phone == "" {
		payUser.Phone = "081234567890"
	}
	// Warning: helpers might use global DB, but here we pass objects.
	// Ideally helpers should accept DB interface, but for now we rely on the object data.
	return helpers.GeneratePaymentLink(order, invoice, payUser, "127.0.0.1")
}

// GenerateQRCodes generates QR codes for products missing them
func (s *POSService) GenerateQRCodes() (int, error) {
	var products []models.Product
	if err := s.DB.Where("qr_code IS NULL OR qr_code = ''").Find(&products).Error; err != nil {
		return 0, err
	}

	updated := 0
	for i := range products {
		qrBytes := make([]byte, 4)
		rand.Read(qrBytes)
		products[i].QRCode = fmt.Sprintf("FZ-%s-%s", strings.ToUpper(products[i].SKU), hex.EncodeToString(qrBytes))
		if err := s.DB.Model(&products[i]).Update("qr_code", products[i].QRCode).Error; err == nil {
			updated++
		}
	}
	return updated, nil
}
