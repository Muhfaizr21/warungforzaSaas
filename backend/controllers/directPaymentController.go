package controllers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PrismalinkDirectConfig holds configuration for direct API calls
type PrismalinkDirectConfig struct {
	MerchantID  string
	KeyID       string
	SecretKey   string
	BaseURL     string
	CallbackURL string
	ReturnURL   string
}

// GetDirectConfig loads PrismaLink config from DB Settings (with ENV fallback)
func GetDirectConfig() PrismalinkDirectConfig {
	// ✅ Always read from DB settings first, fallback to ENV
	// This ensures changes in "Parameter Sistem" page take effect immediately
	baseURL := helpers.GetSetting("prismalink_url", os.Getenv("PRISMALINK_URL"))
	if baseURL == "" {
		baseURL = "https://api-staging.plink.co.id/gateway/v2"
	}

	appURL := helpers.GetAppURL()

	callbackURL := os.Getenv("PLINK_BACKEND_CALLBACK")
	if callbackURL == "" {
		callbackURL = appURL + "/api/webhooks/prismalink"
	}

	frontendReturnURL := os.Getenv("PLINK_FRONTEND_CALLBACK")
	if frontendReturnURL == "" {
		frontendReturnURL = helpers.GetFrontendURL() + "/payment/callback"
	}

	return PrismalinkDirectConfig{
		MerchantID:  helpers.GetSetting("prismalink_merchant_id", os.Getenv("PRISMALINK_MERCHANT_ID")),
		KeyID:       helpers.GetSetting("prismalink_key_id", os.Getenv("PRISMALINK_KEY_ID")),
		SecretKey:   helpers.GetSetting("prismalink_secret_key", os.Getenv("PRISMALINK_SECRET_KEY")),
		BaseURL:     baseURL,
		CallbackURL: callbackURL,
		ReturnURL:   frontendReturnURL,
	}
}

// GetInvoiceDetails - Get invoice and order details for custom payment page
func GetInvoiceDetails(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	invoiceID := c.Param("id")

	var invoice models.Invoice
	if err := config.DB.Preload("Order.Items.Product").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify ownership (Check Invoice UserID OR Order UserID)
	authorized := false
	if invoice.UserID != 0 && invoice.UserID == user.ID {
		authorized = true
	} else if invoice.OrderID != nil && invoice.Order.UserID == user.ID {
		authorized = true
	}

	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	// Find latest transaction to resume polling/display on frontend
	var latestTx models.PaymentTransaction
	config.DB.Where("invoice_id = ?", invoice.ID).Order("created_at desc").First(&latestTx)

	// Fetch necessary store settings for the payment page
	var transferEnabled models.Setting
	var bankAccount models.Setting
	config.DB.Where("key = ?", "enable_bank_transfer").First(&transferEnabled)
	config.DB.Where("key = ?", "bank_account").First(&bankAccount)

	c.JSON(http.StatusOK, gin.H{
		"invoice":              invoice,
		"order":                invoice.Order,
		"latest_transaction":   latestTx,
		"enable_bank_transfer": transferEnabled.Value == "true",
		"bank_account":         bankAccount.Value,
	})
}

// GeneratePaymentCode - Generate VA number, QR code or CC form via PrismaLink Full API
func GeneratePaymentCode(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	invoiceIDStr := c.Param("id")
	invoiceID, _ := strconv.Atoi(invoiceIDStr)

	var input struct {
		Method          string `json:"method"`           // va, qris, cc
		Bank            string `json:"bank"`             // bca, bni, etc
		InstallmentTerm int    `json:"installment_term"` // 0, 3, 6, 12
		CardToken       string `json:"card_token"`       // for saved card
		SaveCard        bool   `json:"save_card"`        // user preference to save card
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Load Invoice + Order with items
	var invoice models.Invoice
	if err := config.DB.Preload("Order.Items.Product").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify ownership
	authorized := false
	if invoice.UserID != 0 && invoice.UserID == user.ID {
		authorized = true
	} else if invoice.OrderID != nil && invoice.Order.UserID == user.ID {
		authorized = true
	}
	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	if invoice.Status == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice already paid"})
		return
	}

	// Map frontend method to Prismalink payment_method
	order := invoice.Order
	switch input.Method {
	case "va":
		order.PaymentMethod = "VA"
	case "qris":
		order.PaymentMethod = "QRIS"
	case "cc":
		order.PaymentMethod = "CC"
	default:
		order.PaymentMethod = "VA"
	}

	// PERSIST payment method to DB so inquiry/webhook can reference it later
	config.DB.Model(&models.Order{}).Where("id = ?", order.ID).Update("payment_method", order.PaymentMethod)

	// Use GeneratePaymentDirect for Full API integration
	paymentData, err := helpers.GeneratePaymentDirect(order, invoice, user, c.ClientIP())
	if err != nil {
		log.Printf("❌ Payment generation failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build frontend-friendly response
	response := gin.H{
		"method":       input.Method,
		"bank":         input.Bank,
		"amount":       paymentData.Amount,
		"reference":    paymentData.MerchantRefNo,
		"plink_ref":    paymentData.PlinkRefNo,
		"expired_at":   paymentData.Validity,
		"payment_data": paymentData,
	}

	switch paymentData.Type {
	case "va":
		// Parse VA list and try to find the selected bank
		if len(paymentData.VANumberList) > 0 {
			response["va_list"] = paymentData.VANumberList

			// Try to find the specific bank the user selected
			for _, va := range paymentData.VANumberList {
				bankName, _ := va["bank"].(string)
				vaNumber, _ := va["va"].(string)
				if strings.Contains(strings.ToLower(bankName), strings.ToLower(input.Bank)) {
					response["va_number"] = vaNumber
					response["va_bank"] = bankName
					break
				}
			}

			// If no match found, use first one
			if _, ok := response["va_number"]; !ok && len(paymentData.VANumberList) > 0 {
				firstVA := paymentData.VANumberList[0]
				response["va_number"], _ = firstVA["va"].(string)
				response["va_bank"], _ = firstVA["bank"].(string)
			}
		}

	case "qris":
		response["qr_code"] = paymentData.QRISImageURL
		response["qr_string"] = paymentData.QRISData

	case "cc_form":
		// 2-step CC flow: return session_token + merchant_ref_no for submit-card
		response["session_token"] = paymentData.SessionToken
		response["merchant_ref_no"] = paymentData.MerchantRefNo
		response["cc_direct"] = true

	case "redirect":
		response["redirect_url"] = paymentData.RedirectURL
		if input.Method == "cc" {
			response["cc_form_url"] = paymentData.RedirectURL
		}
	}

	c.JSON(http.StatusOK, response)
}

// SubmitCreditCard - Step 2 of CC Direct API: Submit card details to Prismalink
func SubmitCreditCard(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	invoiceIDStr := c.Param("id")
	invoiceID, _ := strconv.Atoi(invoiceIDStr)

	var input struct {
		CardNumber    string `json:"card_number" binding:"required"`
		ExpMonth      string `json:"exp_month" binding:"required"`
		ExpYear       string `json:"exp_year" binding:"required"`
		CVV           string `json:"cvv" binding:"required"`
		MerchantRefNo string `json:"merchant_ref_no"`
		SessionToken  string `json:"session_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data kartu kredit tidak lengkap"})
		return
	}

	// Load Invoice
	var invoice models.Invoice
	if err := config.DB.Preload("Order.Items.Product").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify ownership
	authorized := false
	if invoice.UserID != 0 && invoice.UserID == user.ID {
		authorized = true
	} else if invoice.OrderID != nil && invoice.Order.UserID == user.ID {
		authorized = true
	}
	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	if invoice.Status == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice already paid"})
		return
	}

	// Get merchant_ref_no from input or generate one
	merchantRefNo := input.MerchantRefNo
	if merchantRefNo == "" {
		merchantRefNo = fmt.Sprintf("%s-%s", invoice.InvoiceNumber, time.Now().Format("150405"))
		if len(merchantRefNo) > 25 {
			merchantRefNo = invoice.InvoiceNumber[len(invoice.InvoiceNumber)-6:] + "-" + time.Now().Format("150405")
		}
	}

	configData := helpers.GetPrismalinkConfig()

	cardData := map[string]string{
		"card_number": input.CardNumber,
		"exp_month":   input.ExpMonth,
		"exp_year":    input.ExpYear,
		"cvv":         input.CVV,
	}

	paymentData, err := helpers.SubmitCreditCard(configData, merchantRefNo, input.SessionToken, invoice, user, cardData, c.ClientIP())
	if err != nil {
		log.Printf("❌ CC Submit failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Return the 3DS redirect URL or session info
	response := gin.H{
		"method":        "cc",
		"amount":        paymentData.Amount,
		"reference":     paymentData.MerchantRefNo,
		"plink_ref":     paymentData.PlinkRefNo,
		"session_token": paymentData.SessionToken,
	}

	if paymentData.RedirectURL != "" {
		response["redirect_url"] = paymentData.RedirectURL
		response["cc_3ds_url"] = paymentData.RedirectURL
	}

	c.JSON(http.StatusOK, response)
}

// CheckPaymentStatus - Check if payment has been completed (with Active Inquiry)
func CheckPaymentStatus(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	invoiceID := c.Param("id")

	var invoice models.Invoice
	if err := config.DB.Preload("Order").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// 1. Verify ownership (Check Invoice UserID OR Order UserID)
	authorized := false
	if invoice.UserID != 0 && invoice.UserID == user.ID {
		authorized = true
	} else if invoice.OrderID != nil && invoice.Order.UserID == user.ID {
		authorized = true
	}

	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	// 2. ACTIVE INQUIRY (Reliability layer)
	// If still unpaid/pending, check upstream to see if user actually paid
	checkableStatuses := invoice.Status == "unpaid" || invoice.Status == "pending" || invoice.Status == "pending_arrival"
	if checkableStatuses {
		var pendingTxs []models.PaymentTransaction
		// Find ALL pending transactions for this invoice
		config.DB.Where("invoice_id = ? AND status = 'pending'", invoice.ID).Order("created_at desc").Find(&pendingTxs)

		log.Printf("🔍 CheckPaymentStatus: Invoice %s (Status: %s) has %d pending transactions", invoice.InvoiceNumber, invoice.Status, len(pendingTxs))

		for _, payTx := range pendingTxs {
			log.Printf("🔍 Checking Upstream Status for Invoice %s (Ref: %s, GatewayTxID: %s, Method: %s)", invoice.InvoiceNumber, payTx.MerchantRefNo, payTx.GatewayTxID, payTx.PaymentMethod)

			// SKIP transactions without gateway_tx_id (plink_ref_no) — inquiry will always fail
			if payTx.GatewayTxID == "" {
				log.Printf("⏭️ Skipping %s: No gateway_tx_id (plink_ref_no), inquiry would fail", payTx.MerchantRefNo)
				continue
			}

			// Determine payment_method for inquiry: prefer PaymentTransaction's method, fallback to Order
			pm := payTx.PaymentMethod
			if pm == "" {
				// Fallback to Order's payment method
				if invoice.Order.PaymentMethod == "QRIS" {
					pm = "QR"
				} else if invoice.Order.PaymentMethod == "VA" {
					pm = "VA"
				} else if invoice.Order.PaymentMethod == "CC" {
					pm = "CC"
				} else {
					pm = "VA" // Default to VA since it's the most common
				}
			}

			// Normalize: Prismalink inquiry API expects "QR" not "QRIS"
			if strings.EqualFold(pm, "qris") || strings.EqualFold(pm, "qr") {
				pm = "QR"
			}

			log.Printf("🔍 Inquiry params: RefNo=%s, PlinkRef=%s, Amount=%.2f, Method=%s", payTx.MerchantRefNo, payTx.GatewayTxID, payTx.Amount, pm)

			inquiryRes, err := helpers.CheckPrismalinkStatus(payTx.MerchantRefNo, payTx.GatewayTxID, payTx.Amount, pm)
			if err != nil {
				log.Printf("⚠️ Inquiry Failed for %s: %v", payTx.MerchantRefNo, err)
				continue
			}

			// Check response code first
			if rc, ok := inquiryRes["response_code"].(string); ok && rc != "PL000" && rc != "00" {
				log.Printf("⚠️ Gateway returned error for %s: code=%s (full response: %v)", payTx.MerchantRefNo, rc, inquiryRes)
				continue
			}

			// Check status fields (handle various formats from Prismalink)
			// Prismalink inquiry returns "transaction_status" (NOT "payment_status")
			upstreamStatus, _ := inquiryRes["transaction_status"].(string)
			if upstreamStatus == "" {
				upstreamStatus, _ = inquiryRes["payment_status"].(string)
			}
			if upstreamStatus == "" {
				upstreamStatus, _ = inquiryRes["status"].(string)
			}
			// Support nested data object
			if data, ok := inquiryRes["data"].(map[string]interface{}); ok {
				if s, ok := data["transaction_status"].(string); ok && s != "" {
					upstreamStatus = s
				} else if s, ok := data["payment_status"].(string); ok && s != "" {
					upstreamStatus = s
				}
			}

			log.Printf("🔍 Inquiry Result for %s: status=%s", payTx.MerchantRefNo, upstreamStatus)

			if upstreamStatus == "SETLD" || upstreamStatus == "SUCCESS" || upstreamStatus == "00" || upstreamStatus == "PAID" {
				log.Printf("✅ Success payment found on Ref: %s! Updating...", payTx.MerchantRefNo)

				// Perform same update logic as webhook
				tx := config.DB.Begin()
				now := time.Now()

				invoice.Status = "paid"
				invoice.PaidAt = &now
				tx.Save(&invoice)

				// Mark THIS transaction as success
				tx.Model(&payTx).Update("status", "success")

				helpers.RecordPaymentJournal(tx, &invoice, payTx.GatewayTxID)

				if invoice.OrderID != nil {
					var order models.Order
					if err := tx.Preload("Items.Product").First(&order, *invoice.OrderID).Error; err == nil {
						if invoice.Type == "deposit" {
							order.DepositPaid += invoice.Amount
							order.RemainingBalance -= invoice.Amount
							order.PaymentStatus = "deposit_paid"
							order.Status = "pre_order"
						} else {
							order.PaymentStatus = "paid"
							order.RemainingBalance -= invoice.Amount
							order.Status = "processing"

							// SYNC: Finalize Stock Deduction
							// Move from Reserved -> Sold (Decrease Stock & ReservedQty)
							for _, item := range order.Items {
								if err := tx.Model(&models.Product{}).
									Where("id = ?", item.ProductID).
									Updates(map[string]interface{}{
										"stock":        gorm.Expr("stock - ?", item.Quantity),                     // Permanently reduce stock
										"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity), // Release reservation
									}).Error; err != nil {
									log.Printf("❌ Failed to deduct stock for product %d: %v", item.ProductID, err)
								}
							}
						}
						tx.Save(&order)
						tx.Create(&models.OrderLog{
							OrderID: order.ID,
							UserID:  order.UserID,
							Action:  "status_change",
							Note:    fmt.Sprintf("Payment confirmed via Manual Check (%s). Status: %s. Stock Finalized.", payTx.MerchantRefNo, order.Status),
						})
					}
				} else if invoice.Type == "topup" {
					var u models.User
					if err := tx.First(&u, invoice.UserID).Error; err == nil {
						balanceBefore := u.Balance
						u.Balance += invoice.Amount
						tx.Save(&u)
						tx.Create(&models.WalletTransaction{
							UserID:        u.ID,
							Type:          "credit",
							Amount:        invoice.Amount,
							Description:   fmt.Sprintf("Top Up via Manual Check - %s", payTx.MerchantRefNo),
							ReferenceType: "invoice",
							ReferenceID:   invoice.InvoiceNumber,
							BalanceBefore: balanceBefore,
							BalanceAfter:  u.Balance,
						})
					}
				}
				tx.Commit()
				log.Printf("✅ Invoice %s successfully marked as PAID", invoice.InvoiceNumber)

				// Stop checking other transactions for this invoice
				break
			}
		}
	}

	// ALWAYS reload invoice from DB to get the latest status (after potential update above)
	config.DB.Where("id = ?", invoiceID).First(&invoice)

	log.Printf("📤 CheckPaymentStatus Response: invoice_id=%d, status=%s", invoice.ID, invoice.Status)

	c.JSON(http.StatusOK, gin.H{
		"invoice_id": invoice.ID,
		"status":     invoice.Status,
		"paid_at":    invoice.PaidAt,
	})
}
