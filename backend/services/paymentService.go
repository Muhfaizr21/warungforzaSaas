package services

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"gorm.io/gorm"
)

type PaymentService struct {
	DB *gorm.DB
}

func NewPaymentService() *PaymentService {
	return &PaymentService{
		DB: config.DB,
	}
}

// PaymentCodeInput for SubmitTransaction
type PaymentCodeInput struct {
	InvoiceID       uint
	UserID          uint
	Method          string
	Bank            string
	InstallmentTerm int
	CardToken       string
	SaveCard        bool
	IPAddress       string
}

// SubmitTransaction handles direct API calls to Prismalink
func (s *PaymentService) SubmitTransaction(input PaymentCodeInput) (map[string]interface{}, error) {
	var invoice models.Invoice
	if err := s.DB.Preload("Order.Items.Product").Where("id = ?", input.InvoiceID).First(&invoice).Error; err != nil {
		return nil, fmt.Errorf("invoice not found")
	}

	var user models.User
	if err := s.DB.First(&user, input.UserID).Error; err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// 1. Authorization & Validation
	if invoice.UserID != 0 && invoice.UserID != user.ID {
		return nil, fmt.Errorf("unauthorized")
	} else if invoice.OrderID != nil && invoice.Order.UserID != user.ID {
		return nil, fmt.Errorf("unauthorized")
	}

	if invoice.Status != "unpaid" && invoice.Status != "pending_arrival" {
		return nil, fmt.Errorf("invoice already paid or not payable")
	}

	// 2. Configuration
	cfg := helpers.GetPrismalinkConfig()
	now := time.Now()
	timestamp := now.Format("2006-01-02 15:04:05.000 -0700")
	refNo := s.generateRefNo(invoice.InvoiceNumber, now)
	_ = refNo // Keep for potential future use or delete if sure

	formattedPhone := helpers.FormatPrismalinkPhone(user.Phone)

	// 3. Build Body
	products := s.buildProductDetails(invoice)
	productDetailsJSON, _ := json.Marshal(products)

	paymentMethod, integrationType, bankCode := s.mapPaymentMethod(input.Method, input.Bank, input.CardToken != "")

	// Use the same unique ref logic as helpers/payment.go
	uniqueRefNo := fmt.Sprintf("%s-%s", invoice.InvoiceNumber, now.Format("150405"))
	if len(uniqueRefNo) > 24 {
		uniqueRefNo = uniqueRefNo[:24]
	}

	requestBody := map[string]interface{}{
		"merchant_key_id":        cfg.KeyID,
		"merchant_id":            cfg.MerchantID,
		"merchant_ref_no":        uniqueRefNo,
		"backend_callback_url":   cfg.CallbackURL,
		"frontend_callback_url":  cfg.ReturnURL,
		"transaction_date_time":  timestamp,
		"transmission_date_time": timestamp,
		"transaction_currency":   "IDR",
		"transaction_amount":     int64(invoice.Amount),
		"payment_method":         paymentMethod,
		"integration_type":       integrationType,
		"bank_id":                bankCode,
		"user_id":                fmt.Sprintf("%d", user.ID),
		"user_name":              s.getValidName(&user),
		"user_email":             s.getValidEmail(&user),
		"user_phone_number":      formattedPhone,
		"user_device_id":         "WEB",
		"user_ip_address":        s.getValidIP(input.IPAddress),
		"invoice_number":         invoice.InvoiceNumber,
		"external_id":            fmt.Sprintf("%d", invoice.ID),
		"product_details":        string(productDetailsJSON),
	}

	// 4. Create Pending Transaction
	var orderID uint
	if invoice.OrderID != nil {
		orderID = *invoice.OrderID
	}

	paymentTx := models.PaymentTransaction{
		OrderID:       orderID,
		InvoiceID:     invoice.ID,
		MerchantRefNo: uniqueRefNo,
		Gateway:       "prismalink_direct",
		Type:          invoice.Type,
		Amount:        invoice.Amount,
		Status:        "pending",
		PaymentMethod: fmt.Sprintf("%s_%s", input.Method, input.Bank),
		SaveCard:      input.SaveCard,
	}
	s.DB.Create(&paymentTx)

	// DEBUG LOG
	log.Printf("🔥 SUBMITTING DIRECT TRX: Method=%s, Ref=%s, Amt=%.0f", input.Method, uniqueRefNo, invoice.Amount)

	// 5. Submit to Gateway
	result, err := helpers.SubmitPrismalinkDirect(requestBody)
	if err != nil {
		return nil, err
	}

	// 6. Update Reference
	plinkRefNo, _ := result["plink_ref_no"].(string)
	s.DB.Model(&paymentTx).Update("external_id", plinkRefNo)

	return result, nil
}

// CheckAndSyncStatus polls Prismalink for specific order and updates status if changed (SYNC)
func (s *PaymentService) CheckAndSyncStatus(order *models.Order) error {
	if (order.PaymentMethod == "QRIS" || strings.Contains(order.PaymentMethod, "va")) && (order.PaymentStatus == "unpaid" || order.PaymentStatus == "pending") {
		var lastInvoice models.Invoice
		if err := s.DB.Where("order_id = ?", order.ID).Order("created_at desc").First(&lastInvoice).Error; err != nil {
			return nil
		}

		var payTx models.PaymentTransaction
		if err := s.DB.Where("invoice_id = ?", lastInvoice.ID).First(&payTx).Error; err != nil || payTx.MerchantRefNo == "" {
			return nil
		}

		channelType := "QR"
		if strings.Contains(order.PaymentMethod, "va") {
			channelType = "VA"
		}

		res, err := helpers.CheckPrismalinkStatus(payTx.MerchantRefNo, payTx.GatewayTxID, lastInvoice.Amount, channelType)
		if err == nil {
			upstreamStatus := s.extractStatus(res)
			if s.isPaid(upstreamStatus) {
				return s.finalizePayment(&lastInvoice, &payTx, order)
			}
		}
	}
	return nil
}

// Internal Helpers

func (s *PaymentService) generateRefNo(invoiceNum string, t time.Time) string {
	refNo := strings.ReplaceAll(invoiceNum, "-", "")
	refNo = fmt.Sprintf("%s%d", refNo, t.Unix()%10000)
	if len(refNo) > 24 {
		return refNo[:24]
	}
	return refNo
}

func (s *PaymentService) buildProductDetails(invoice models.Invoice) []map[string]interface{} {
	var products []map[string]interface{}

	// Create a single consolidated item for the entire invoice amount
	// This prevents PL001 errors caused by mismatch between sum(items) and transaction_amount
	// (e.g. due to shipping costs, discounts, or wallet deductions).
	itemTitle := "Pembayaran " + invoice.InvoiceNumber
	if invoice.Type == "topup" {
		itemTitle = "Wallet Top Up " + invoice.InvoiceNumber
	}

	products = append(products, map[string]interface{}{
		"item_code":  1,
		"item_title": itemTitle,
		"quantity":   1,
		"total":      int64(invoice.Amount),
		"currency":   "IDR",
	})

	return products
}

func (s *PaymentService) getValidName(u *models.User) string {
	if u.FullName != "" {
		return u.FullName
	}
	if u.Username != "" {
		return u.Username
	}
	return "Customer Forza"
}

func (s *PaymentService) getValidEmail(u *models.User) string {
	if u.Email != "" {
		return u.Email
	}
	return "customer@warungforza.com"
}

func (s *PaymentService) getValidIP(ip string) string {
	if ip == "::1" || ip == "" {
		return "127.0.0.1"
	}
	return ip
}

func (s *PaymentService) mapPaymentMethod(method, bank string, hasToken bool) (pm, it, bc string) {
	switch method {
	case "va":
		pm = "VA"
		it = "01" // Hosted payment page for VA to let user select correctly configured banks
		bc = ""
	case "qris":
		pm = "QR"
		it = "01" // Hosted payment page for guaranteed success rate
		bc = ""
	case "cc":
		pm = "CC"
		bc = ""
		if hasToken {
			it = "02"
		} else {
			it = "01"
		}
	}
	return
}

func (s *PaymentService) extractStatus(res map[string]interface{}) string {
	// Prismalink inquiry returns "transaction_status" (NOT "payment_status")
	status, _ := res["transaction_status"].(string)
	if status == "" {
		status, _ = res["payment_status"].(string)
	}
	if status == "" {
		status, _ = res["status"].(string)
	}
	if data, ok := res["data"].(map[string]interface{}); ok {
		if ds, ok := data["transaction_status"].(string); ok && ds != "" {
			status = ds
		} else if ds, ok := data["payment_status"].(string); ok && ds != "" {
			status = ds
		}
	}
	return status
}

func (s *PaymentService) isPaid(status string) bool {
	return status == "SETLD" || status == "SUCCESS" || status == "00" || status == "PAID"
}

func (s *PaymentService) finalizePayment(invoice *models.Invoice, payTx *models.PaymentTransaction, order *models.Order) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		invoice.Status = "paid"
		invoice.PaidAt = &now
		tx.Save(invoice)

		payTx.Status = "success"
		tx.Save(payTx)

		// Handle different invoice types
		if invoice.Type == "deposit" {
			// Deposit payment for Pre-Order
			order.DepositPaid += invoice.Amount
			order.RemainingBalance -= invoice.Amount
			order.PaymentStatus = "deposit_paid"
			order.Status = "pre_order"
		} else if invoice.Type == "topup" {
			// Wallet top-up — update user balance
			var user models.User
			if err := tx.First(&user, invoice.UserID).Error; err == nil {
				balanceBefore := user.Balance
				tx.Model(&user).Update("balance", gorm.Expr("balance + ?", invoice.Amount))
				user.Balance += invoice.Amount
				tx.Create(&models.WalletTransaction{
					UserID:        user.ID,
					Type:          "credit",
					Amount:        invoice.Amount,
					Description:   fmt.Sprintf("Top Up via Auto-Sync - %s", payTx.MerchantRefNo),
					ReferenceType: "invoice",
					ReferenceID:   invoice.InvoiceNumber,
					BalanceBefore: balanceBefore,
					BalanceAfter:  user.Balance,
				})
			}
		} else {
			// Full/balance payment — finalize order
			order.PaymentStatus = "paid"
			order.Status = "processing"
			order.RemainingBalance -= invoice.Amount

			// Stock Deduction: Reserved → Sold
			var orderWithItems models.Order
			if err := tx.Preload("Items.Product").First(&orderWithItems, order.ID).Error; err == nil {
				for _, item := range orderWithItems.Items {
					tx.Model(&models.Product{}).
						Where("id = ?", item.ProductID).
						Updates(map[string]interface{}{
							"stock":        gorm.Expr("stock - ?", item.Quantity),
							"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity),
						})
				}
			}
		}

		if order.ID != 0 {
			tx.Save(order)
		}

		helpers.RecordPaymentJournal(tx, invoice, payTx.MerchantRefNo)
		return nil
	})
}
