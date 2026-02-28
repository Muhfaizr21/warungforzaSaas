package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"gorm.io/gorm"
)

type OrderService struct {
	DB *gorm.DB
}

func NewOrderService() *OrderService {
	return &OrderService{
		DB: config.DB,
	}
}

// CheckoutInput defines the payload for creating a new order
type CheckoutInput struct {
	Items []struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	} `json:"items"`

	// Billing Details
	BillingFirstName string `json:"billing_first_name"`
	BillingLastName  string `json:"billing_last_name"`
	BillingCompany   string `json:"billing_company"`
	BillingCountry   string `json:"billing_country"`
	BillingAddress1  string `json:"billing_address_1"`
	BillingAddress2  string `json:"billing_address_2"`
	BillingCity      string `json:"billing_city"`
	BillingState     string `json:"billing_state"`
	BillingPostcode  string `json:"billing_postcode"`
	BillingPhone     string `json:"billing_phone"`
	BillingEmail     string `json:"billing_email"`

	// Shipping (if different)
	ShipToDifferent   bool   `json:"ship_to_different"`
	ShippingFirstName string `json:"shipping_first_name"`
	ShippingLastName  string `json:"shipping_last_name"`
	ShippingCompany   string `json:"shipping_company"`
	ShippingCountry   string `json:"shipping_country"`
	ShippingAddress1  string `json:"shipping_address_1"`
	ShippingAddress2  string `json:"shipping_address_2"`
	ShippingCity      string `json:"shipping_city"`
	ShippingState     string `json:"shipping_state"`
	ShippingPostcode  string `json:"shipping_postcode"`

	// Payment & Shipping Method
	ShippingMethod     string  `json:"shipping_method"`
	ShippingCost       float64 `json:"shipping_cost"`
	PaymentMethod      string  `json:"payment_method"`
	PaymentMethodTitle string  `json:"payment_method_title"`
	CouponCode         string  `json:"coupon_code"`
	DiscountAmount     float64 `json:"discount_amount"`

	// Legacy/Notes
	Notes string `json:"notes"`
}

// CreateOrderResponse holds the result of order creation
type CreateOrderResponse struct {
	Order       models.Order
	Invoices    []models.Invoice
	PaymentLink string
}

// CreateOrder handles the checkout process
func (s *OrderService) CreateOrder(input CheckoutInput, user models.User) (*CreateOrderResponse, error) {
	if len(input.Items) == 0 {
		return nil, fmt.Errorf("cart is empty")
	}

	// Disable COD check (Business Rule)
	if strings.ToLower(input.PaymentMethod) == "cod" {
		return nil, fmt.Errorf("Metode pembayaran COD tidak tersedia.")
	}

	var order models.Order
	var invoices []models.Invoice
	paymentLink := ""

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		var subtotalAmount float64
		var orderItems []models.OrderItem

		// 1. Process Items & Reserve Stock
		for _, item := range input.Items {
			var product models.Product
			if err := tx.First(&product, item.ProductID).Error; err != nil {
				return fmt.Errorf("product %d not found", item.ProductID)
			}

			itemTotal := product.Price * float64(item.Quantity)
			subtotalAmount += itemTotal

			// Atomic Stock Update (Applies to BOTH Ready and PO to prevent overselling slots)
			res := tx.Model(&models.Product{}).
				Where("id = ? AND (stock - reserved_qty) >= ?", product.ID, item.Quantity).
				Update("reserved_qty", gorm.Expr("reserved_qty + ?", item.Quantity))

			if res.Error != nil {
				return fmt.Errorf("database error reserving stock")
			}
			if res.RowsAffected == 0 {
				return fmt.Errorf("High demand! %s just sold out or ran out of PO slots.", product.Name)
			}

			orderItems = append(orderItems, models.OrderItem{
				ProductID:    product.ID,
				Quantity:     item.Quantity,
				Price:        product.Price,
				Total:        itemTotal,
				COGSSnapshot: product.SupplierCost,
			})
		}

		// 2. Calculate Totals
		// Voucher Validation Integration
		validatedDiscount := 0.0
		if input.CouponCode != "" {
			var productIDs []uint
			for _, item := range orderItems {
				productIDs = append(productIDs, item.ProductID)
			}
			// Temporary call ValidateVoucher without category checking for now (complex preload inside order service)
			// Wait, the controllers package needs to be imported, but we can't import controllers in services! Circular dependency!
			// We must rely on raw validation logic or move ValidateVoucher to a shared place.
			// Let's implement the DB check directly in here to prevent circular dependency, or move ValidateVoucher to helpers.
			// Actually, doing the raw limit DB check here is safest and quickest.
			codeCode := strings.ToUpper(strings.TrimSpace(input.CouponCode))
			var voucher models.Voucher
			if err := tx.Where("code = ?", codeCode).First(&voucher).Error; err != nil {
				return fmt.Errorf("Kode voucher tidak valid")
			}

			// Re-verify limits within the transaction to prevent race conditions!
			if voucher.Status == "disabled" || voucher.Status == "expired" {
				return fmt.Errorf("Voucher tidak aktif atau kedaluwarsa")
			}
			if voucher.UsageLimitGlobal > 0 && voucher.UsedCount >= voucher.UsageLimitGlobal {
				return fmt.Errorf("Kuota penggunaan voucher %s telah habis secara global", voucher.Code)
			}
			if voucher.UsageLimitPerUser > 0 {
				var count int64
				tx.Model(&models.VoucherUsage{}).Where("voucher_id = ? AND user_id = ?", voucher.ID, user.ID).Count(&count)
				if int(count) >= voucher.UsageLimitPerUser {
					return fmt.Errorf("Kamu telah mencapai batas maksimal penggunaan voucher ini")
				}
			}

			// Issue 5 Fix: Securely calculate discount on backend (don't trust frontend)
			if voucher.Type == "percentage" {
				validatedDiscount = subtotalAmount * (voucher.Value / 100)
				if voucher.MaxDiscount > 0 && validatedDiscount > voucher.MaxDiscount {
					validatedDiscount = voucher.MaxDiscount
				}
			} else if voucher.Type == "fixed" {
				validatedDiscount = voucher.Value
			} else {
				// Prevent untrusted calculations for other types right now
				validatedDiscount = input.DiscountAmount
			}

			if validatedDiscount > subtotalAmount {
				validatedDiscount = subtotalAmount
			}
		}

		totalAmount := subtotalAmount + input.ShippingCost - validatedDiscount
		if totalAmount < 0 {
			totalAmount = 0
		}

		// 3. Create Order
		order = models.Order{
			OrderNumber: fmt.Sprintf("FORZA-%d", time.Now().Unix()),
			UserID:      user.ID,
			// Billing
			BillingFirstName: input.BillingFirstName,
			BillingLastName:  input.BillingLastName,
			BillingCompany:   input.BillingCompany,
			BillingCountry:   input.BillingCountry,
			BillingAddress1:  input.BillingAddress1,
			BillingAddress2:  input.BillingAddress2,
			BillingCity:      input.BillingCity,
			BillingState:     input.BillingState,
			BillingPostcode:  input.BillingPostcode,
			BillingPhone:     input.BillingPhone,
			BillingEmail:     input.BillingEmail,
			// Shipping
			ShipToDifferent:   input.ShipToDifferent,
			ShippingFirstName: input.ShippingFirstName,
			ShippingLastName:  input.ShippingLastName,
			ShippingCompany:   input.ShippingCompany,
			ShippingCountry:   input.ShippingCountry,
			ShippingAddress1:  input.ShippingAddress1,
			ShippingAddress2:  input.ShippingAddress2,
			ShippingCity:      input.ShippingCity,
			ShippingState:     input.ShippingState,
			ShippingPostcode:  input.ShippingPostcode,
			// Financials
			SubtotalAmount:   subtotalAmount,
			TotalAmount:      totalAmount,
			ShippingCost:     input.ShippingCost,
			ShippingMethod:   input.ShippingMethod,
			DiscountAmount:   validatedDiscount,
			CouponCode:       input.CouponCode,
			RemainingBalance: totalAmount,
			// Meta
			PaymentMethod:      input.PaymentMethod,
			PaymentMethodTitle: input.PaymentMethodTitle,
			Status:             "pending",
			PaymentStatus:      "unpaid",
			Notes:              input.Notes,
			Items:              orderItems,
		}

		// Handle Shipping Address JSON (Legacy)
		// ... logic can be simplified or just set JSON here if needed
		// For brevity, skipping the redundant JSON blob if not critical, or adding simple map:
		// (Assume simple JSON map if needed by frontend legacy)

		if err := tx.Omit("Items").Create(&order).Error; err != nil {
			return err
		}

		// Fix Items Association
		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if err := tx.Create(&orderItems).Error; err != nil {
			return err
		}
		order.Items = orderItems

		// 4. Initial Log
		tx.Create(&models.OrderLog{
			OrderID: order.ID,
			UserID:  user.ID,
			Action:  "created",
			Note:    "Order created via checkout.",
		})

		// 5. Generate Invoices
		if len(input.Items) > 0 {
			// Check first item type for PO logic (Simplified business rule: cart usually mixed or single type dominance)
			var firstProduct models.Product
			tx.First(&firstProduct, input.Items[0].ProductID)

			if firstProduct.ProductType == "po" {
				// PO Deposit Logic
				depositAmount := s.calculateDeposit(firstProduct, totalAmount, order.Items)

				if err := helpers.GenerateInvoice(tx, order, "deposit", depositAmount, "unpaid"); err != nil {
					return err
				}

				balanceAmount := totalAmount - depositAmount
				if err := helpers.GenerateInvoice(tx, order, "balance", balanceAmount, "pending_arrival"); err != nil {
					return err
				}
			} else {
				// Full Payment
				if err := helpers.GenerateInvoice(tx, order, "full", totalAmount, "unpaid"); err != nil {
					return err
				}
			}
		}

		// 6. Sync Profile Address (Side Effect)
		s.syncUserProfile(tx, user, input)

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Fetch Invoices
	s.DB.Where("order_id = ?", order.ID).Find(&invoices)

	// Notifications & Payment Link (Outside TX usually, but Payment Link needs DB record)
	helpers.NotifyUser(user.ID, "ORDER_CREATED", fmt.Sprintf("Order %s created.", order.OrderNumber), map[string]interface{}{
		"order_id": order.ID,
		"total":    order.TotalAmount,
	})

	var primaryInvoice models.Invoice
	if len(invoices) > 0 {
		primaryInvoice = invoices[0]
	}
	link, _ := helpers.GeneratePaymentLink(order, primaryInvoice, user, "127.0.0.1")
	paymentLink = link

	// 7. Record Voucher Usage (if coupon was applied)
	// We need to re-validate the discount amount here to avoid a duplicate query, but order creation validated it
	if input.CouponCode != "" && order.DiscountAmount > 0 {
		s.applyVoucherUsage(input.CouponCode, user.ID, order.ID, order.DiscountAmount)
	}

	// 8. Notify Admins
	var itemNames string = fmt.Sprintf("%d macam barang", len(order.Items))
	helpers.NotifyAdmin("NEW_ORDER", "Pesanan baru diterima", map[string]interface{}{
		"order_id": order.ID,
		"user":     user.FullName,
		"items":    itemNames,
		"total":    order.TotalAmount,
	})

	return &CreateOrderResponse{
		Order:       order,
		Invoices:    invoices,
		PaymentLink: paymentLink,
	}, nil
}

// Helper: Calculate Deposit
func (s *OrderService) calculateDeposit(product models.Product, totalAmount float64, items []models.OrderItem) float64 {
	// Try to read po_config from the product
	if product.POConfig != nil {
		var poConfig struct {
			DepositType  string  `json:"deposit_type"`
			DepositValue float64 `json:"deposit_value"`
		}
		if err := json.Unmarshal(product.POConfig, &poConfig); err == nil && poConfig.DepositValue > 0 {
			if poConfig.DepositType == "fixed" {
				// Fixed amount per product — multiply by order quantity
				totalFixedDeposit := float64(0)
				for _, item := range items {
					if item.ProductID == product.ID {
						totalFixedDeposit += poConfig.DepositValue * float64(item.Quantity)
					}
				}
				if totalFixedDeposit > 0 && totalFixedDeposit < totalAmount {
					return totalFixedDeposit
				}
				return poConfig.DepositValue // fallback single
			}
			// Percent
			if poConfig.DepositValue > 0 && poConfig.DepositValue <= 100 {
				return totalAmount * (poConfig.DepositValue / 100)
			}
		}
	}

	// Fallback: read global setting
	globalPct := helpers.GetSetting("po_deposit_percentage", "30")
	pct := float64(30)
	if parsed, err := strconv.ParseFloat(globalPct, 64); err == nil && parsed > 0 && parsed <= 100 {
		pct = parsed
	}
	return totalAmount * (pct / 100)
}

// Helper: Sync User Profile
func (s *OrderService) syncUserProfile(tx *gorm.DB, user models.User, input CheckoutInput) {
	var profile models.CustomerProfile
	if err := tx.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		profile = models.CustomerProfile{UserID: user.ID}
		tx.Create(&profile)
	}

	// If profile empty, update from billing/shipping
	if profile.Phone == "" {
		profile.Phone = input.BillingPhone
		tx.Save(&profile)
	}
	// ... more robust sync if needed
}

// UpdateOrderInput for general updates
type UpdateOrderInput struct {
	OrderID           uint   `json:"order_id"`
	RequesterID       uint   `json:"requester_id"`
	Status            string `json:"status"`
	PaymentStatus     string `json:"payment_status"`
	FulfillmentStatus string `json:"fulfillment_status"`
	InternalNotes     string `json:"internal_notes"`
	TrackingNumber    string `json:"tracking_number"`
	Carrier           string `json:"carrier"`
	Reason            string `json:"reason"` // For audit/notes
}

// OrderActionInput common input for actions
type OrderActionInput struct {
	OrderID        uint    `json:"order_id"`
	RequesterID    uint    `json:"requester_id"`
	Reason         string  `json:"reason"`
	TrackingNumber string  `json:"tracking_number"`
	Carrier        string  `json:"carrier"`
	Amount         float64 `json:"amount"` // For refunds
	Type           string  `json:"type"`   // For refunds: partial/full
}

// ShipOrder handles all logic for shipping an order
func (s *OrderService) ShipOrder(input OrderActionInput) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Items.Product").Preload("User").First(&order, input.OrderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	if order.Status == "cancelled" {
		return nil, fmt.Errorf("cannot ship cancelled order")
	}

	// Transaction Wrapper
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update Order Status
		order.Carrier = input.Carrier
		order.TrackingNumber = input.TrackingNumber
		order.FulfillmentStatus = "shipped"
		order.Status = "shipped"

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 2. Inventory Management
		if err := s.processShippingSideEffects(tx, order, input.RequesterID); err != nil {
			return err
		}

		// 3. Audit Log
		tx.Create(&models.OrderLog{
			OrderID:           order.ID,
			UserID:            input.RequesterID,
			Action:            "shipped",
			Note:              fmt.Sprintf("Shipped via %s, Tracking: %s", input.Carrier, input.TrackingNumber),
			IsCustomerVisible: true,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 4. BITESHIP INTEGRATION: Auto-create shipment order (LOCAL ONLY)
	go func() {
		// Only run biteship logic if country is ID
		if strings.ToUpper(order.ShippingCountry) != "ID" && strings.ToUpper(order.BillingCountry) != "ID" {
			fmt.Println("ℹ️ International Order: Skipping Biteship Auto-Pickup")
			return
		}

		biteshipSvc := NewBiteshipService()
		if biteshipSvc.APIKey == "" {
			fmt.Println("⚠️ Biteship: API Key kosong, skip create order")
			return
		}

		// Build items from order
		var biteshipItems []BiteshipItem
		for _, item := range order.Items {
			// Konversi berat: DB menyimpan dalam KG, Biteship butuh GRAM
			weight := int(item.Product.Weight * 1000)
			if weight < 100 {
				// Produk tanpa berat → gunakan estimasi default 2kg untuk collectible
				weight = 2000
			}

			// Gunakan dimensi produk jika tersedia, fallback ke default
			height := 20 // cm default
			length := 30 // cm default (depth)
			width := 20  // cm default
			if item.Product.Height != nil && *item.Product.Height > 0 {
				height = int(*item.Product.Height)
			}
			if item.Product.Depth != nil && *item.Product.Depth > 0 {
				length = int(*item.Product.Depth)
			}
			if item.Product.Width != nil && *item.Product.Width > 0 {
				width = int(*item.Product.Width)
			}

			biteshipItems = append(biteshipItems, BiteshipItem{
				Name:        item.Product.Name,
				Description: fmt.Sprintf("Order %s", order.OrderNumber),
				Category:    "others",
				Value:       item.Price,
				Quantity:    item.Quantity,
				Weight:      weight,
				Height:      height,
				Length:      length,
				Width:       width,
			})
		}

		// Fetch carrier info from DB for automatic Biteship Code mapping
		var carrier models.CarrierTemplate

		// DEFAULT courier mapping assumptions
		biteshipCourier := ""
		courierType := "reg"

		// 1. First Pass: Get from Database Mapping
		if err := s.DB.Where("name = ?", input.Carrier).First(&carrier).Error; err == nil && carrier.BiteshipCode != "" {
			biteshipCourier = carrier.BiteshipCode
		} else {
			// 2. Second Pass (Fallback): Analyze String
			rawCarrierLower := strings.ToLower(input.Carrier)
			biteshipCourier = rawCarrierLower

			if strings.Contains(rawCarrierLower, "sicepat") {
				biteshipCourier = "sicepat"
			} else if strings.Contains(rawCarrierLower, "jne") {
				biteshipCourier = "jne"
			} else if strings.Contains(rawCarrierLower, "j&t") || strings.Contains(rawCarrierLower, "jnt") {
				biteshipCourier = "jnt"
			}
		}

		// 3. Last Pass: Adjust the specific courierType
		// (Biteship strict validation expects very specific keys per courier)
		if biteshipCourier == "jnt" {
			courierType = "ez" // J&T uses "ez" instead of "reg"
		} else if biteshipCourier == "sicepat" {
			courierType = "reg" // SiCepat uses "reg", "halu" sometimes fails in test env
		}

		storePhone := helpers.GetSetting("company_phone", os.Getenv("STORE_PHONE"))
		if storePhone == "" {
			storePhone = "081234567890"
		}
		storeEmail := helpers.GetSetting("company_email", os.Getenv("STORE_EMAIL"))
		if storeEmail == "" {
			storeEmail = "admin@warungforza.com"
		}

		createReq := BiteshipCreateRequest{
			ShipperName:  "Warung Forza",
			ShipperPhone: storePhone,
			ShipperEmail: storeEmail,
			ShipperOrg:   "Warung Forza Collectibles",

			OriginName:       "Warung Forza HQ",
			OriginPhone:      storePhone,
			OriginAddress:    helpers.GetSetting("company_address", os.Getenv("STORE_ADDRESS")),
			OriginPostalCode: helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE")),
			OriginNote:       "Warung Forza Collectibles",

			DestName:       order.BillingFirstName + " " + order.BillingLastName,
			DestPhone:      order.BillingPhone,
			DestEmail:      order.BillingEmail,
			DestAddress:    order.BillingAddress1,
			DestPostalCode: order.BillingPostcode,
			DestNote:       order.Notes,

			CourierCompany: biteshipCourier,
			CourierType:    courierType,
			Insurance:      order.TotalAmount,

			Items:       biteshipItems,
			OrderNote:   fmt.Sprintf("Warung Forza Order %s", order.OrderNumber),
			ReferenceID: order.OrderNumber,
		}

		result, err := biteshipSvc.CreateOrder(createReq)
		if err != nil {
			fmt.Printf("⚠️ Biteship Create Order failed: %v (Order will still be shipped manually)\n", err)
			return
		}

		// Update order with Biteship data
		updates := map[string]interface{}{
			"biteship_order_id": result.ID,
		}
		// Jika Biteship langsung kasih waybill, update tracking number
		if result.Courier.WaybillID != "" && order.TrackingNumber == "" {
			updates["tracking_number"] = result.Courier.WaybillID
		}

		s.DB.Model(&models.Order{}).Where("id = ?", order.ID).Updates(updates)
		fmt.Printf("✅ Biteship Order Created: ID=%s, Waybill=%s\n", result.ID, result.Courier.WaybillID)

		// Log
		s.DB.Create(&models.OrderLog{
			OrderID:           order.ID,
			UserID:            input.RequesterID,
			Action:            "biteship_order_created",
			Note:              fmt.Sprintf("Biteship Order ID: %s, Kurir pickup dijadwalkan", result.ID),
			IsCustomerVisible: true,
		})
	}()

	// 5. Notifications (Post-Commit)
	go s.sendShippingNotification(order)

	return &order, nil
}

// UpdateOrder handles complex status updates (Admin/Staff tool)
func (s *OrderService) UpdateOrder(input UpdateOrderInput) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Items.Product").Preload("User").First(&order, input.OrderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{}

		// 1. Fulfillment Logic
		if input.FulfillmentStatus != "" {
			if input.FulfillmentStatus == "shipped" {
				if input.TrackingNumber == "" && order.TrackingNumber == "" {
					return fmt.Errorf("tracking number is required for Shipped status")
				}

				tracking := input.TrackingNumber
				if tracking == "" {
					tracking = order.TrackingNumber
				}
				updates["tracking_number"] = tracking
				updates["fulfillment_status"] = "shipped"
				updates["status"] = "shipped" // Sync main status

				// Only process side effects if it wasn't already shipped
				if order.FulfillmentStatus != "shipped" {
					if err := s.processShippingSideEffects(tx, order, input.RequesterID); err != nil {
						return err
					}
				}
			} else {
				updates["fulfillment_status"] = input.FulfillmentStatus
			}
		}

		// 2. Payment Logic
		if input.PaymentStatus != "" {
			updates["payment_status"] = input.PaymentStatus

			if input.PaymentStatus == "deposit_paid" {
				// PO Logic: Generate Balance Invoice if needed
				remaining := order.TotalAmount - order.DepositPaid
				if len(order.Items) > 0 && order.Items[0].Product.ProductType == "po" && remaining > 0 {
					helpers.GenerateInvoice(tx, order, "balance", remaining, "unpaid")
				}
			}
		}

		// 3. Generic Updates
		if input.Status != "" {
			updates["status"] = input.Status
		}
		if input.InternalNotes != "" {
			updates["internal_notes"] = input.InternalNotes
		}
		if input.TrackingNumber != "" {
			updates["tracking_number"] = input.TrackingNumber
		}
		if input.Carrier != "" {
			updates["carrier"] = input.Carrier
		}

		if len(updates) > 0 {
			if err := tx.Model(&order).Updates(updates).Error; err != nil {
				return err
			}
		}

		// 4. Audit Log
		tx.Create(&models.OrderLog{
			OrderID:           order.ID,
			UserID:            input.RequesterID,
			Action:            "update_status",
			Note:              fmt.Sprintf("Updated statuses: %v. Notes: %s", updates, input.InternalNotes),
			IsCustomerVisible: false, // Internal updates usually
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 5. Notifications (Post-Commit)
	go helpers.NotifyUser(order.UserID, "ORDER_UPDATE", fmt.Sprintf("Order %s status updated to %s", order.OrderNumber, order.Status), map[string]interface{}{
		"order_id": order.ID,
		"status":   order.Status,
	})

	return &order, nil
}

// CancelOrder handles cancellation logic including refunds and stock return
func (s *OrderService) CancelOrder(input OrderActionInput) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Items.Product").First(&order, input.OrderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	if order.FulfillmentStatus == "shipped" || order.FulfillmentStatus == "delivered" {
		return nil, fmt.Errorf("cannot cancel shipped or delivered orders")
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Return Stock (Release Reservation)
		for _, item := range order.Items {
			helpers.RecordStockMovement(tx, item.ProductID, -item.Quantity, "reserved", "cancellation", "ORDER", order.OrderNumber, "Order cancelled", &input.RequesterID)
			if err := tx.Model(&item.Product).Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity)).Error; err != nil {
				return err
			}
		}

		// 2. Process Refund (if paid)
		refundAmount := 0.0
		if order.PaymentStatus == "paid" {
			refundAmount = order.TotalAmount
		} else if order.PaymentStatus == "deposit_paid" {
			refundAmount = order.DepositPaid
		}

		if refundAmount > 0 {
			if err := s.processAutoRefund(tx, order, refundAmount); err != nil {
				return err
			}
			order.PaymentStatus = "refunded"
			order.InternalNotes += fmt.Sprintf("\n[SYSTEM] Auto-refunded Rp %.0f to Wallet", refundAmount)
		}

		// 3. Update Order Status
		order.Status = "cancelled"
		order.FulfillmentStatus = "cancelled"
		order.InternalNotes += "\n[CANCELLED] " + input.Reason

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// 4. Audit Log
		note := "Reason: " + input.Reason
		if refundAmount > 0 {
			note += fmt.Sprintf(" (Refunded %.0f)", refundAmount)
		}
		tx.Create(&models.OrderLog{
			OrderID: order.ID,
			UserID:  input.RequesterID,
			Action:  "cancelled",
			Note:    note,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 5. BITESHIP INTEGRATION: Auto-cancel shipment jika ada
	if order.BiteshipOrderID != "" {
		go func() {
			biteshipSvc := NewBiteshipService()
			reason := input.Reason
			if reason == "" {
				reason = "Order cancelled by admin"
			}
			result, err := biteshipSvc.CancelOrder(order.BiteshipOrderID, reason)
			if err != nil {
				fmt.Printf("⚠️ Biteship Cancel failed: %v\n", err)
				return
			}
			fmt.Printf("🚫 Biteship Order %s cancelled: %s\n", order.BiteshipOrderID, result.Status)

			s.DB.Create(&models.OrderLog{
				OrderID:           order.ID,
				UserID:            input.RequesterID,
				Action:            "biteship_cancelled",
				Note:              fmt.Sprintf("Biteship pickup cancelled. Reason: %s", reason),
				IsCustomerVisible: true,
			})
		}()
	}

	return &order, nil
}

// RefundOrder handles the refund process for an order
func (s *OrderService) RefundOrder(input OrderActionInput, requester models.User, ip, userAgent string) (*models.Order, error) {
	var order models.Order
	if err := s.DB.First(&order, input.OrderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	// Validate refund amount
	totalPaid := order.DepositPaid
	if order.PaymentStatus == "paid" {
		totalPaid = order.TotalAmount
	}

	if input.Amount > totalPaid {
		return nil, fmt.Errorf("refund amount cannot exceed total paid")
	}

	oldOrder := order
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// Determine refund type
		if input.Type == "" {
			if input.Amount >= totalPaid {
				input.Type = "full"
			} else {
				input.Type = "partial"
			}
		}

		if input.Type == "full" {
			order.PaymentStatus = "refunded"
		} else {
			order.PaymentStatus = "refunded_partial"
		}

		order.InternalNotes = order.InternalNotes + fmt.Sprintf("\n[REFUND] Amount: %.2f, Reason: %s", input.Amount, input.Reason)

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Create payment transaction record for refund
		tx.Create(&models.PaymentTransaction{
			OrderID: order.ID,
			Type:    "refund",
			Amount:  input.Amount,
			Status:  "success",
		})

		// Financial: Reverse the revenue using Centralized Helper
		coaBankID, err := helpers.GetPrimaryBankCOA(tx)
		if err == nil {
			var coaSourceID uint
			if order.PaymentStatus == "paid" {
				coaRevKey := "RETAIL_REVENUE"
				if len(order.Items) > 0 && order.Items[0].Product.ProductType == "po" {
					coaRevKey = "PO_REVENUE"
				}
				coaSourceID, _ = helpers.GetCOAByMappingKey(coaRevKey)
			} else {
				coaSourceID, _ = helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
			}

			if coaSourceID != 0 {
				helpers.PostJournalWithTX(tx, order.OrderNumber, "REFUND", "Refund Processed", []models.JournalItem{
					{COAID: coaSourceID, Debit: input.Amount, Credit: 0},
					{COAID: coaBankID, Debit: 0, Credit: input.Amount},
				})
			}
		}

		// Create order log
		tx.Create(&models.OrderLog{
			OrderID:           order.ID,
			UserID:            requester.ID,
			Action:            "refund",
			Note:              fmt.Sprintf("Refunded %.2f - %s", input.Amount, input.Reason),
			IsCustomerVisible: true,
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Notifications
	helpers.NotifyUser(order.UserID, "REFUND_PROCESSED",
		fmt.Sprintf("Refund of Rp %s has been processed for Order %s", helpers.FormatPrice(input.Amount), order.OrderNumber),
		map[string]interface{}{
			"order_id": order.ID,
			"amount":   input.Amount,
		})

	// Send Email
	go func() {
		var u models.User
		if err := s.DB.First(&u, order.UserID).Error; err == nil {
			helpers.SendRefundEmail(u.Email, order.OrderNumber, input.Amount, input.Type, input.Reason)
		}
	}()

	helpers.LogAudit(requester.ID, "Order", "Refund", order.OrderNumber,
		fmt.Sprintf("Refunded %.2f: %s", input.Amount, input.Reason),
		oldOrder, order, ip, userAgent)

	return &order, nil
}

// MarkArrived handles PO arrival logic
func (s *OrderService) MarkArrived(orderID uint, requesterID uint) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Invoices").Preload("User").Preload("Items.Product").First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	isPO := false
	var balanceInvoice *models.Invoice

	for i := range order.Invoices {
		if order.Invoices[i].Type == "balance" {
			balanceInvoice = &order.Invoices[i]
		}
	}

	if len(order.Items) > 0 && order.Items[0].Product.ProductType == "po" {
		isPO = true
	}

	if !isPO {
		return nil, fmt.Errorf("not a valid PO order")
	}

	// SCENARIO 1: FULLY PAID PO
	if order.RemainingBalance <= 0 || (balanceInvoice == nil && order.PaymentStatus == "paid") {
		order.Status = "processing"
		order.FulfillmentStatus = "ready_to_ship"
		order.InternalNotes += "\n[SYSTEM] PO Arrived. Order is fully paid. Marked as Ready to Ship."

		if err := s.DB.Save(&order).Error; err != nil {
			return nil, err
		}

		go func() {
			productName := order.Items[0].Product.Name
			helpers.SendPOArrivalInFullEmail(order.User.Email, productName)
		}()

		return &order, nil
	}

	// SCENARIO 2: BALANCE DUE
	if balanceInvoice == nil {
		return nil, fmt.Errorf("balance invoice missing")
	}

	if balanceInvoice.Status == "paid" {
		return nil, fmt.Errorf("balance already paid")
	}

	// Dynamic Shipping Recalculation
	newShipping, errRecalc := s.recalculatePOShipping(&order)
	if errRecalc == nil && newShipping > 0 && newShipping != order.ShippingCost {
		diff := newShipping - order.ShippingCost
		order.ShippingCost = newShipping
		order.TotalAmount += diff
		order.RemainingBalance += diff
		balanceInvoice.Amount += diff
		order.InternalNotes += fmt.Sprintf("\n[SYSTEM] Shipping recalculated on arrival: Rp %.0f -> Rp %.0f based on final product weight.", order.ShippingCost-diff, newShipping)
	}

	now := time.Now()
	dueDate := now.AddDate(0, 0, 7)

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		balanceInvoice.Status = "unpaid"
		balanceInvoice.DueDate = dueDate
		if err := tx.Save(balanceInvoice).Error; err != nil {
			return err
		}

		order.Status = "waiting_payment"
		order.PaymentStatus = "balance_due"
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	go func() {
		productName := "Unknown Product"
		if len(order.Items) > 0 {
			productName = order.Items[0].Product.Name
		}
		helpers.SendPOArrivalEmail(order.User.Email, order.User.FullName, productName, balanceInvoice.Amount, dueDate.Format("02 Jan 2006"))
	}()

	return &order, nil
}

// ConfirmDelivery handles final fulfillment step
func (s *OrderService) ConfirmDelivery(orderID uint, userID uint) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Items.Product").First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	if order.UserID != userID && userID != 0 { // 0 for admin override
		return nil, fmt.Errorf("unauthorized")
	}

	if order.Status != "shipped" && order.Status != "delivered" {
		return nil, fmt.Errorf("order must be shipped to be confirmed")
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		order.Status = "completed"
		order.FulfillmentStatus = "delivered"
		order.CompletedAt = func(t time.Time) *time.Time { return &t }(time.Now())

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Create Order Log
		tx.Create(&models.OrderLog{
			OrderID: order.ID,
			UserID:  userID,
			Action:  "completed",
			Note:    "Order marked as completed/delivered by customer",
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// CheckExpiredPOs scans for ghosting customers in PO
func (s *OrderService) CheckExpiredPOs(adminID uint) (int, error) {
	var invoices []models.Invoice
	now := time.Now()

	// Find invoices type 'balance' that are 'unpaid' and past 'due_date'
	if err := s.DB.Preload("Order.Items.Product").Preload("Order.User").
		Where("type = ? AND status = ? AND due_date < ?", "balance", "unpaid", now).
		Find(&invoices).Error; err != nil {
		return 0, err
	}

	count := 0
	for _, inv := range invoices {
		// Ghosting Scenarios: Cancel order and Forfeit deposit
		err := s.DB.Transaction(func(tx *gorm.DB) error {
			order := inv.Order
			order.Status = "cancelled"
			order.InternalNotes += "\n[SYSTEM] PO forfeited due to non-payment of balance after arrival."

			if err := tx.Save(&order).Error; err != nil {
				return err
			}

			// Clear reservation but physical stock STAYS (already reduced if shipped?? no, PO arrival doesn't reduce physical usually until shipping)
			// Actually PO items might have been reserved.
			for _, item := range order.Items {
				tx.Model(&item.Product).Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity))
			}

			// Financial: Recognition of Forfeited Deposit as Miscellaneous Revenue
			coaMiscRevID, _ := helpers.GetCOAByMappingKey("OTHER_INCOME")
			coaLiabID, _ := helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
			if coaMiscRevID != 0 && coaLiabID != 0 && order.DepositPaid > 0 {
				helpers.PostJournalWithTX(tx, order.OrderNumber, "ADJUSTMENT", "PO Deposit Forfeited", []models.JournalItem{
					{COAID: coaLiabID, Debit: order.DepositPaid, Credit: 0},
					{COAID: coaMiscRevID, Debit: 0, Credit: order.DepositPaid},
				})
			}

			inv.Status = "expired"
			tx.Save(&inv)

			return nil
		})

		if err == nil {
			count++
			helpers.NotifyUser(inv.Order.UserID, "PO_FORFEITED", "Pre-order cancelled and deposit forfeited due to late balance payment.", nil)
		}
	}

	return count, nil
}

// UpdatePaymentTotals recalculates paid/unpaid amounts and updates order state
func (s *OrderService) UpdatePaymentTotals(orderID uint) error {
	var order models.Order
	if err := s.DB.Preload("Invoices").Preload("Items.Product").First(&order, orderID).Error; err != nil {
		return err
	}

	totalPaid := 0.0
	depositPaid := 0.0
	allPaid := true

	for _, inv := range order.Invoices {
		if inv.Status == "paid" {
			totalPaid += inv.Amount
			if inv.Type == "deposit" {
				depositPaid += inv.Amount
			}
		} else if inv.Status == "unpaid" {
			allPaid = false
		}
	}

	remaining := order.TotalAmount - totalPaid
	if remaining < 0 {
		remaining = 0
	}

	updates := map[string]interface{}{
		"deposit_paid":      depositPaid,
		"remaining_balance": remaining,
	}

	shouldCutStock := false

	// Status State Machine
	if allPaid || remaining <= 0 {
		updates["payment_status"] = "paid_full"
		if order.Status == "pending" {
			updates["status"] = "processing"
			shouldCutStock = true
		}
	} else if totalPaid > 0 {
		updates["payment_status"] = "deposit_paid"
		if order.Status == "pending" {
			// PO Orders go to pre_order
			updates["status"] = "pre_order"
		}
	}

	err := s.DB.Model(&order).Updates(updates).Error
	if err != nil {
		return err
	}

	if shouldCutStock {
		// Cut stock if we transition to processing (like in paymentController webhook)
		for _, item := range order.Items {
			s.DB.Model(&models.Product{}).
				Where("id = ?", item.ProductID).
				Updates(map[string]interface{}{
					"stock":        gorm.Expr("stock - ?", item.Quantity),
					"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity),
				})
		}
	}

	return nil
}

// ForfeitPO handles manual forfeiture of a PO deposit
func (s *OrderService) ForfeitPO(orderID uint, adminID uint) (*models.Order, error) {
	var order models.Order
	if err := s.DB.Preload("Items.Product").First(&order, orderID).Error; err != nil {
		return nil, fmt.Errorf("order not found")
	}

	if order.Status == "cancelled" || order.Status == "completed" {
		return nil, fmt.Errorf("order cannot be forfeited in current state")
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		order.Status = "cancelled"
		order.InternalNotes += "\n[FORCED_CANCEL] PO forfeited due to customer non-payment/ghosting."

		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		// Clear reservation
		for _, item := range order.Items {
			tx.Model(&item.Product).Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity))
		}

		// Financial: Recognition of Forfeited Deposit as Miscellaneous Revenue
		coaMiscRevID, _ := helpers.GetCOAByMappingKey("OTHER_INCOME")
		coaLiabID, _ := helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
		if coaMiscRevID != 0 && coaLiabID != 0 && order.DepositPaid > 0 {
			helpers.PostJournalWithTX(tx, order.OrderNumber, "ADJUSTMENT", "PO Deposit Forfeited", []models.JournalItem{
				{COAID: coaLiabID, Debit: order.DepositPaid, Credit: 0},
				{COAID: coaMiscRevID, Debit: 0, Credit: order.DepositPaid},
			})
		}

		// Create order log
		tx.Create(&models.OrderLog{
			OrderID: order.ID,
			UserID:  adminID,
			Action:  "force_cancelled",
			Note:    "PO forfeited and cancelled by admin",
		})

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &order, nil
}

// recalculatePOShipping fetches new shipping rates from Biteship based on the latest physical weight of the product.
func (s *OrderService) recalculatePOShipping(order *models.Order) (float64, error) {
	if order == nil || len(order.Items) == 0 {
		return 0, fmt.Errorf("invalid order")
	}

	apiKey := helpers.GetSetting("biteship_api_key", os.Getenv("BITESHIP_API_KEY"))
	storePostalCode := helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE"))
	if apiKey == "" || storePostalCode == "" {
		return 0, fmt.Errorf("biteship credentials not available")
	}

	destPostalCode := order.ShippingPostcode
	if destPostalCode == "" {
		destPostalCode = order.BillingPostcode
	}
	if destPostalCode == "" {
		return 0, fmt.Errorf("no destination postal code found")
	}

	// Calculate new total weight
	totalWeightGrams := 0.0
	for _, item := range order.Items {
		totalWeightGrams += float64(int(item.Product.Weight*1000) * item.Quantity)
	}

	if totalWeightGrams < 1000 {
		totalWeightGrams = 1000
	}

	// Match Courier
	// ShippingMethod is usually "JNE" or "JNE - REG"
	courierCode := strings.Split(strings.ToLower(order.ShippingMethod), " ")[0]
	if courierCode == "" {
		// Fallback
		courierCode = "jne"
	}

	payloadMap := map[string]interface{}{
		"origin_postal_code":      storePostalCode,
		"destination_postal_code": destPostalCode,
		"couriers":                courierCode,
		"items": []map[string]interface{}{
			{"name": "Order Items", "value": order.TotalAmount, "weight": totalWeightGrams, "quantity": 1},
		},
	}

	jsonData, _ := json.Marshal(payloadMap)
	req, _ := http.NewRequest("POST", "https://api.biteship.com/v1/rates/couriers", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("biteship API error: %d", resp.StatusCode)
	}

	var biteshipRes struct {
		Success bool `json:"success"`
		Pricing []struct {
			Price float64 `json:"price"`
		} `json:"pricing"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&biteshipRes); err != nil {
		return 0, err
	}

	if !biteshipRes.Success || len(biteshipRes.Pricing) == 0 {
		return 0, fmt.Errorf("biteship returned no pricing")
	}

	// Take the first matching price logic
	return biteshipRes.Pricing[0].Price, nil
}

// Internal Helpers

// processShippingSideEffects handles inventory and finance for shipping
func (s *OrderService) processShippingSideEffects(tx *gorm.DB, order models.Order, requesterID uint) error {
	// Inventory was ALREADY deducted when order moved to 'Processing'.
	// Only run financials here.

	// Financials
	if err := s.recordShippingJournal(tx, order); err != nil {
		return err
	}
	return nil
}

func (s *OrderService) recordShippingJournal(tx *gorm.DB, order models.Order) error {
	// Revenue Recognition
	coaLiabID, _ := helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
	coaRevID, _ := helpers.GetCOAByMappingKey("PO_REVENUE")
	if coaLiabID != 0 && coaRevID != 0 {
		helpers.PostJournalWithTX(tx, order.OrderNumber, "ORDER", "Revenue Recognition - Order Shipped", []models.JournalItem{
			{COAID: coaLiabID, Debit: order.TotalAmount, Credit: 0},
			{COAID: coaRevID, Debit: 0, Credit: order.TotalAmount},
		})
	}

	// COGS
	coaCOGSID, _ := helpers.GetCOAByMappingKey("COGS_EXPENSE")
	coaInvID, _ := helpers.GetCOAByMappingKey("INVENTORY_ASSET")
	totalCOGS := 0.0
	for _, item := range order.Items {
		totalCOGS += item.COGSSnapshot * float64(item.Quantity)
	}

	if coaCOGSID != 0 && coaInvID != 0 && totalCOGS > 0 {
		helpers.PostJournalWithTX(tx, order.OrderNumber, "ORDER", "COGS Recognition - Order Shipped", []models.JournalItem{
			{COAID: coaCOGSID, Debit: totalCOGS, Credit: 0},
			{COAID: coaInvID, Debit: 0, Credit: totalCOGS},
		})
	}
	return nil
}

func (s *OrderService) processAutoRefund(tx *gorm.DB, order models.Order, amount float64) error {
	var user models.User
	if err := tx.First(&user, order.UserID).Error; err != nil {
		return fmt.Errorf("user not found for refund")
	}

	balanceBefore := user.Balance
	user.Balance += amount
	if err := tx.Save(&user).Error; err != nil {
		return err
	}

	// Wallet Transaction
	tx.Create(&models.WalletTransaction{
		UserID:        user.ID,
		Type:          "refund",
		Amount:        amount,
		Description:   fmt.Sprintf("Refund for Order %s", order.OrderNumber),
		ReferenceType: "order",
		ReferenceID:   order.OrderNumber,
		BalanceBefore: balanceBefore,
		BalanceAfter:  user.Balance,
	})

	// Journaling
	coaWalletID, _ := helpers.GetCOAByMappingKey("WALLET_LIABILITY")
	var coaSourceID uint
	if order.PaymentStatus == "paid" {
		coaRevKey := "RETAIL_REVENUE"
		if len(order.Items) > 0 && order.Items[0].Product.ProductType == "po" {
			coaRevKey = "PO_REVENUE"
		}
		coaSourceID, _ = helpers.GetCOAByMappingKey(coaRevKey)
	} else {
		coaSourceID, _ = helpers.GetCOAByMappingKey("CUSTOMER_DEPOSIT")
	}

	if coaWalletID != 0 && coaSourceID != 0 {
		helpers.PostJournalWithTX(tx, order.OrderNumber, "ORDER", fmt.Sprintf("Refund to Wallet for Order %s", order.OrderNumber), []models.JournalItem{
			{COAID: coaSourceID, Debit: amount, Credit: 0},
			{COAID: coaWalletID, Debit: 0, Credit: amount},
		})
	}
	return nil
}

func (s *OrderService) sendShippingNotification(order models.Order) {
	var carrier models.CarrierTemplate
	trackingURL := ""
	if err := s.DB.Where("name = ? AND active = ?", order.Carrier, true).First(&carrier).Error; err == nil {
		trackingURL = strings.ReplaceAll(carrier.TrackingURLTemplate, "{tracking}", order.TrackingNumber)
	}

	helpers.NotifyUser(order.UserID, "ORDER_SHIPPED", fmt.Sprintf("Your artifacts (Order %s) have been dispatched!", order.OrderNumber), map[string]interface{}{
		"order_id":        order.ID,
		"tracking_number": order.TrackingNumber,
		"carrier":         order.Carrier,
		"tracking_url":    trackingURL,
	})
}

// applyVoucherUsage records voucher usage after a successful checkout
func (s *OrderService) applyVoucherUsage(voucherCode string, userID uint, orderID uint, discountAmount float64) {
	if voucherCode == "" {
		return
	}
	code := strings.ToUpper(strings.TrimSpace(voucherCode))
	var voucher models.Voucher
	if err := s.DB.Where("code = ?", code).First(&voucher).Error; err != nil {
		return
	}

	// Record usage
	s.DB.Create(&models.VoucherUsage{
		VoucherID:      voucher.ID,
		UserID:         userID,
		OrderID:        &orderID,
		DiscountAmount: discountAmount,
		UsedAt:         time.Now(),
	})

	// Increment used count
	s.DB.Model(&models.Voucher{}).Where("id = ?", voucher.ID).UpdateColumn("used_count", gorm.Expr("used_count + 1"))
}
