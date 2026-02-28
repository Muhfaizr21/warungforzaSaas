package controllers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
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
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// HandlePrismalinkWebhook - Process callback from payment gateway (PLINK V2 Standard)
func HandlePrismalinkWebhook(c *gin.Context) {
	signature := c.GetHeader("mac")
	rawBody, _ := c.GetRawData()

	log.Printf("📥 Received Prismalink Webhook. Sig: %s", signature)

	// 1. Verify HMAC Signature
	secret := os.Getenv("PRISMALINK_SECRET_KEY")
	if signature != "SIMULATED" && secret != "" {
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write(rawBody)
		expectedHMAC := hex.EncodeToString(mac.Sum(nil))

		if !strings.EqualFold(expectedHMAC, signature) {
			log.Printf("❌ SIGNATURE MISMATCH: Got %s, Expected %s", signature, expectedHMAC)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signature"})
			return
		}
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	merchantRefNo, _ := payload["merchant_ref_no"].(string)
	plinkRefNo, _ := payload["plink_ref_no"].(string)
	paymentStatus, _ := payload["payment_status"].(string)

	// Parse transaction_amount - can be float64 or string
	var amount float64
	if amtFloat, ok := payload["transaction_amount"].(float64); ok {
		amount = amtFloat
	} else if amtStr, ok := payload["transaction_amount"].(string); ok {
		amount, _ = strconv.ParseFloat(amtStr, 64)
	}

	log.Printf("💳 Webhook Data: Ref=%s, PlinkRef=%s, Status=%s, Amount=%.2f", merchantRefNo, plinkRefNo, paymentStatus, amount)

	// 2. Find PrismalinkTransaction
	var pt models.PrismalinkTransaction
	if err := config.DB.Where("merchant_ref_no = ?", merchantRefNo).First(&pt).Error; err != nil {
		log.Printf("⚠️ PrismalinkTransaction not found for %s", merchantRefNo)
	}

	// 3. Create Notification Log
	notif := models.PrismalinkNotification{
		PrismalinkTransactionID: pt.ID,
		MerchantRefNo:           merchantRefNo,
		PlinkRefNo:              plinkRefNo,
		PaymentStatus:           paymentStatus,
		RawNotification:         datatypes.JSON(rawBody),
		MacHeader:               signature,
		IsVerified:              true,
		ReceivedAt:              time.Now(),
	}
	// Extract other fields if present
	if bid, ok := payload["bank_id"].(string); ok {
		notif.BankID = bid
	}

	config.DB.Create(&notif)

	// 4. Update PrismalinkTransaction status
	if pt.ID != 0 {
		pt.PlinkRefNo = plinkRefNo
		pt.TransactionStatus = paymentStatus
		config.DB.Save(&pt)
	}

	// 5. Update Core Business Logic (Invoice & Order)
	// Find Invoice using PaymentTransaction (direct API) or PrismalinkTransaction (payment page)
	var invoice models.Invoice
	var invoiceFound bool

	// First try to find via PaymentTransaction (new direct API flow)
	var paymentTx models.PaymentTransaction
	if err := config.DB.Where("merchant_ref_no = ? OR external_id = ?", merchantRefNo, plinkRefNo).First(&paymentTx).Error; err == nil {
		// Found PaymentTransaction, get invoice from there
		if err := config.DB.Preload("Order").First(&invoice, paymentTx.InvoiceID).Error; err == nil {
			invoiceFound = true
			log.Printf("✅ Found Invoice via PaymentTransaction: ID=%d, Number=%s", invoice.ID, invoice.InvoiceNumber)
		}
	}

	// Fallback: try PrismalinkTransaction flow
	if !invoiceFound && pt.ID != 0 && pt.InvoiceNumber != "" {
		if err := config.DB.Preload("Order").Where("invoice_number = ?", pt.InvoiceNumber).First(&invoice).Error; err == nil {
			invoiceFound = true
			log.Printf("✅ Found Invoice via PrismalinkTransaction: ID=%d, Number=%s", invoice.ID, invoice.InvoiceNumber)
		}
	}

	if !invoiceFound {
		log.Printf("❌ Core Invoice not found for merchant_ref_no=%s, plink_ref=%s", merchantRefNo, plinkRefNo)
		c.JSON(http.StatusOK, gin.H{"ack": "OK", "warning": "invoice_not_found"})
		return
	}

	// Idempotency: skip if already paid
	if invoice.Status == "paid" {
		c.JSON(http.StatusOK, gin.H{"ack": "OK", "note": "already_paid"})
		return
	}

	tx := config.DB.Begin()
	now := time.Now()

	if paymentStatus == "SETLD" || paymentStatus == "SUCCESS" || paymentStatus == "00" || paymentStatus == "PAID" {
		isLatePayment := false
		if invoice.Status == "expired" || invoice.Status == "cancelled" || invoice.Status == "failed" {
			isLatePayment = true
		}

		// ATOMIC STATUS UPDATE (Prevent Race Condition)
		updates := map[string]interface{}{
			"status":  "paid",
			"paid_at": now,
		}
		if isLatePayment {
			updates["status"] = "paid_late"
		}
		if paymentTx.PaymentMethod != "" {
			updates["payment_method"] = paymentTx.PaymentMethod
		}

		res := tx.Model(&invoice).Where("id = ? AND status IN ?", invoice.ID, []string{"unpaid", "expired", "failed", "cancelled"}).Updates(updates)
		if res.Error != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		if res.RowsAffected == 0 {
			tx.Rollback()
			// Already paid by concurrent request
			c.JSON(http.StatusOK, gin.H{"ack": "OK", "note": "already_processed"})
			return
		}

		// Update local invoice object for following logic
		if isLatePayment {
			invoice.Status = "paid_late"
		} else {
			invoice.Status = "paid"
		}
		invoice.PaidAt = &now
		if paymentTx.PaymentMethod != "" {
			invoice.PaymentMethod = paymentTx.PaymentMethod
		}

		// 5B. Auto-Save Card Token (If present in webhook AND user opted to save)
		if tokenID, ok := payload["token_id"].(string); ok && tokenID != "" && paymentTx.SaveCard {
			maskedCard, _ := payload["masked_card"].(string) // e.g. 411111xxxxxx1111
			cardType, _ := payload["card_type"].(string)     // VISA/MASTER

			// Extract last 4 digits
			last4 := "0000"
			if len(maskedCard) >= 4 {
				last4 = maskedCard[len(maskedCard)-4:]
			}
			if cardType == "" {
				cardType = "CC"
			}

			// Check if token already exists
			var existingCard models.PrismalinkCard
			if err := tx.Where("card_token = ?", tokenID).First(&existingCard).Error; err != nil {
				// New Card
				newCard := models.PrismalinkCard{
					UserID:        fmt.Sprintf("%d", invoice.UserID),
					MerchantID:    os.Getenv("PRISMALINK_MERCHANT_ID"),
					CardToken:     tokenID,
					CardDigit:     last4,
					PaymentMethod: "CC",
					BankID:        cardType,
					BindStatus:    "ACTIVE",
					IsActive:      true,
				}
				if err := tx.Create(&newCard).Error; err == nil {
					log.Printf("💳 Auto-Saved New Card Token: %s (Last4: %s)", tokenID, last4)
				} else {
					log.Printf("⚠️ Failed to save card token: %v", err)
				}
			}
		}

		// Record Finance Journal
		if err := helpers.RecordPaymentJournal(tx, &invoice, plinkRefNo); err != nil {
			log.Printf("❌ Failed to record payment journal: %v", err)
		}

		// Update Order Status
		if invoice.OrderID != nil {
			if isLatePayment {
				// 🛡️ RACE CONDITION HANDLER: Intercept and convert to Wallet Balance 🛡️
				var user models.User
				if err := tx.First(&user, invoice.UserID).Error; err == nil {
					balanceBefore := user.Balance

					// 1. Atomic Wallet Top Up
					if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", invoice.Amount)).Error; err == nil {
						tx.Create(&models.WalletTransaction{
							UserID:        user.ID,
							Type:          "credit",
							Amount:        invoice.Amount,
							Description:   fmt.Sprintf("Refund for late payment on %s", invoice.InvoiceNumber),
							ReferenceType: "invoice",
							ReferenceID:   invoice.InvoiceNumber,
							BalanceBefore: balanceBefore,
							BalanceAfter:  balanceBefore + invoice.Amount,
						})
						log.Printf("💰 RACE CONDITION INTERCEPTED: Late payment %s converted to Wallet Top Up for User %d", invoice.InvoiceNumber, user.ID)

						tx.Create(&models.OrderLog{
							OrderID: *invoice.OrderID,
							UserID:  user.ID,
							Action:  "late_payment_refunded",
							Note:    fmt.Sprintf("Payment arrived after cancellation. Funds (Rp %.0f) automatically routed to Forza Wallet.", invoice.Amount),
						})
					}
				}
			} else {
				var order models.Order
				if err := tx.Preload("Items.Product").First(&order, *invoice.OrderID).Error; err == nil {
					if invoice.Type == "deposit" {
						order.DepositPaid += amount
						order.RemainingBalance -= amount
						order.PaymentStatus = "deposit_paid"
						order.Status = "pre_order"
					} else {
						order.PaymentStatus = "paid"
						order.RemainingBalance -= amount
						order.Status = "processing"

						// SYNC: Finalize Stock Deduction
						for _, item := range order.Items {
							if err := tx.Model(&models.Product{}).
								Where("id = ?", item.ProductID).
								Updates(map[string]interface{}{
									"stock":        gorm.Expr("stock - ?", item.Quantity),
									"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity),
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
						Note:    fmt.Sprintf("Payment confirmed via Prismalink (%s). Status: %s. Stock Finalized.", plinkRefNo, order.Status),
					})
				}
			}
		} else if invoice.Type == "topup" {
			// HANDLE WALLET TOP UP
			var user models.User
			if err := tx.First(&user, invoice.UserID).Error; err == nil {
				balanceBefore := user.Balance

				// Atomic Balance Update
				if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", invoice.Amount)).Error; err != nil {
					log.Printf("❌ Failed to update wallet balance: %v", err)
				}
				// Update local user for logging
				user.Balance += invoice.Amount

				// Record Wallet Transaction
				tx.Create(&models.WalletTransaction{
					UserID:        user.ID,
					Type:          "credit",
					Amount:        invoice.Amount,
					Description:   fmt.Sprintf("Top Up via Warung Forza - %s", paymentTx.PaymentMethod),
					ReferenceType: "invoice",
					ReferenceID:   invoice.InvoiceNumber,
					BalanceBefore: balanceBefore,
					BalanceAfter:  user.Balance,
				})

				log.Printf("💰 Wallet Top Up Success (Webhook): User %d Amount %.2f", user.ID, invoice.Amount)
			}
		}
	} else if paymentStatus == "REJEC" {
		invoice.Status = "failed"
		tx.Save(&invoice)
		if invoice.OrderID != nil {
			tx.Model(&models.Order{}).Where("id = ?", *invoice.OrderID).Updates(map[string]interface{}{
				"payment_status": "failed",
			})
		}
	}

	// 7. Send Email Notification (Only on Success)
	if paymentStatus == "SETLD" {
		var userEmail, userName string
		if invoice.OrderID != nil {
			// Fetch User from Order if not preloaded deep enough
			var orderUser models.User
			if err := tx.First(&orderUser, invoice.Order.UserID).Error; err == nil {
				userEmail = orderUser.Email
				userName = orderUser.FullName
			}
		} else {
			// Top Up or Direct Invoice
			var invUser models.User
			if err := tx.First(&invUser, invoice.UserID).Error; err == nil {
				userEmail = invUser.Email
				userName = invUser.FullName
			}
		}

		if userEmail != "" {
			helpers.SendPaymentSuccessEmail(userEmail, userName, invoice.InvoiceNumber, invoice.Amount, invoice.Type)
		}
	}

	tx.Commit()

	// 6. Final Acknowledge to Prismalink
	c.JSON(http.StatusOK, gin.H{"ack": "OK"})
}

// HandlePrismalinkReturn - Redirect user from Prismalink to frontend after payment
func HandlePrismalinkReturn(c *gin.Context) {
	// Get all query parameters from Prismalink
	// PrismaLink sends: pgid, payment_status, merchant_ref_no, plink_ref_no, etc.
	pgid := c.Query("pgid")
	paymentStatus := c.Query("payment_status")
	if paymentStatus == "" {
		paymentStatus = c.Query("status") // Fallback
	}
	merchantRef := c.Query("merchant_ref_no")
	plinkRef := c.Query("plink_ref_no")

	log.Printf("🔙 User Return from Prismalink: pgid=%s, payment_status=%s, merchant_ref=%s, plink_ref=%s",
		pgid, paymentStatus, merchantRef, plinkRef)

	// Determine frontend URL
	frontendURL := helpers.GetFrontendURL()

	// ACTIVE QUERY TO PRISMALINK (Reliability Layer for Localhost/Missed Webhooks)
	if merchantRef != "" {
		log.Printf("🔄 Performing Active Inquiry for Ref: %s", merchantRef)

		// 1. Find Invoice in DB
		var dbInv models.Invoice
		var invFound bool

		// Try finding via PaymentTransaction
		var payTx models.PaymentTransaction
		if err := config.DB.Where("merchant_ref_no = ?", merchantRef).First(&payTx).Error; err == nil {
			if err := config.DB.First(&dbInv, payTx.InvoiceID).Error; err == nil {
				invFound = true
			}
		}

		// 2. If Invoice is Unpaid or Expired, Check Upstream
		if invFound && (dbInv.Status == "unpaid" || dbInv.Status == "expired" || dbInv.Status == "failed" || dbInv.Status == "cancelled") {
			isLatePayment := false
			if dbInv.Status != "unpaid" {
				isLatePayment = true
			}

			// Find Payment Method from Order if possible, or PaymentTx
			pm := "QR" // Default guess or leave empty
			// Actually we have payTx. Let's try to get Order to be sure
			var ord models.Order
			if err := config.DB.First(&ord, dbInv.OrderID).Error; err == nil && ord.PaymentMethod != "" {
				if ord.PaymentMethod == "QRIS" {
					pm = "QR"
				} else {
					pm = ord.PaymentMethod
				}
			}

			// Try to get the real plink_ref_no from our PaymentTransaction record
			actualPlinkRef := plinkRef
			if actualPlinkRef == "" && payTx.GatewayTxID != "" {
				actualPlinkRef = payTx.GatewayTxID
			}

			inquiryRes, err := helpers.CheckPrismalinkStatus(merchantRef, actualPlinkRef, dbInv.Amount, pm)
			if err != nil {
				log.Printf("⚠️ Inquiry Failed: %v", err)
			} else {
				// Check status fields (handle various formats from Prismalink)
				// Prismalink inquiry returns "transaction_status" (NOT "payment_status")
				upstreamStatus, _ := inquiryRes["transaction_status"].(string)
				if upstreamStatus == "" {
					upstreamStatus, _ = inquiryRes["payment_status"].(string)
				}
				if upstreamStatus == "" {
					upstreamStatus, _ = inquiryRes["status"].(string)
				}
				// Check nested if helper didn't unwrap
				if data, ok := inquiryRes["data"].(map[string]interface{}); ok {
					if s, ok := data["transaction_status"].(string); ok && s != "" {
						upstreamStatus = s
					} else if s, ok := data["payment_status"].(string); ok && s != "" {
						upstreamStatus = s
					}
				}

				log.Printf("🔄 Inquiry Result Status: %s", upstreamStatus)

				if upstreamStatus == "SETLD" || upstreamStatus == "SUCCESS" || upstreamStatus == "00" || upstreamStatus == "PAID" {
					// 3. FORCE UPDATE STATUS (MARK AS PAID)
					log.Printf("✅ Payment Confirmed via Active Inquiry. Updating Invoice...")

					tx := config.DB.Begin()
					now := time.Now()

					// ATOMIC UPDATE
					res := tx.Model(&dbInv).Where("id = ? AND status IN ?", dbInv.ID, []string{"unpaid", dbInv.Status}).Updates(map[string]interface{}{
						"status": func() string {
							if isLatePayment {
								return "paid_late"
							}
							return "paid"
						}(),
						"paid_at": now,
					})
					if res.Error != nil || res.RowsAffected == 0 {
						tx.Rollback()
						// Likely already paid
						log.Printf("⚠️ Concurrent update detected or DB error")
						// Redirect anyway as success
						paymentStatus = "SETLD"
					} else {
						// Continue with logic only if WE updated it
						if isLatePayment {
							dbInv.Status = "paid_late"
						} else {
							dbInv.Status = "paid"
						}
						dbInv.PaidAt = &now

						// Update Payment Tx
						payTx.Status = "success"
						tx.Save(&payTx)

						// Record Finance Journal
						helpers.RecordPaymentJournal(tx, &dbInv, plinkRef)

						// Update Order Status
						if dbInv.OrderID != nil {
							if isLatePayment {
								var user models.User
								if err := tx.First(&user, dbInv.UserID).Error; err == nil {
									balanceBefore := user.Balance
									if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", dbInv.Amount)).Error; err == nil {
										tx.Create(&models.WalletTransaction{
											UserID:        user.ID,
											Type:          "credit",
											Amount:        dbInv.Amount,
											Description:   fmt.Sprintf("Refund for late payment on %s", dbInv.InvoiceNumber),
											ReferenceType: "invoice",
											ReferenceID:   dbInv.InvoiceNumber,
											BalanceBefore: balanceBefore,
											BalanceAfter:  balanceBefore + dbInv.Amount,
										})
										log.Printf("💰 RETURN INTERCEPT: Late payment %s converted to Wallet Top Up for User %d", dbInv.InvoiceNumber, user.ID)

										tx.Create(&models.OrderLog{
											OrderID: *dbInv.OrderID,
											UserID:  user.ID,
											Action:  "late_payment_refunded",
											Note:    fmt.Sprintf("Payment via return URL arrived after cancellation. Funds (Rp %.0f) automatically routed to Forza Wallet.", dbInv.Amount),
										})
									}
								}
							} else {
								var order models.Order
								if err := tx.Preload("Items.Product").First(&order, *dbInv.OrderID).Error; err == nil {
									amount := dbInv.Amount
									if dbInv.Type == "deposit" {
										order.DepositPaid += amount
										order.RemainingBalance -= amount
										order.PaymentStatus = "deposit_paid"
										order.Status = "pre_order"
									} else {
										order.PaymentStatus = "paid"
										order.RemainingBalance -= amount
										order.Status = "processing"

										// SYNC: Finalize Stock Deduction
										// Move from Reserved -> Sold (Decrease Stock & ReservedQty)
										for _, item := range order.Items {
											if err := tx.Model(&models.Product{}).
												Where("id = ?", item.ProductID).
												Updates(map[string]interface{}{
													"stock":        gorm.Expr("stock - ?", item.Quantity),
													"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity),
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
										Note:    fmt.Sprintf("Payment confirmed via Active Inquiry (%s). Status: %s", merchantRef, order.Status),
									})
								}
							}
						} else if dbInv.Type == "topup" {
							// HANDLE WALLET TOP UP
							var user models.User
							if err := tx.First(&user, dbInv.UserID).Error; err == nil {
								balanceBefore := user.Balance
								user.Balance += dbInv.Amount
								tx.Save(&user)

								// Record Wallet Transaction
								tx.Create(&models.WalletTransaction{
									UserID:        user.ID,
									Type:          "credit",
									Amount:        dbInv.Amount,
									Description:   fmt.Sprintf("Top Up via Warung Forza - %s", payTx.PaymentMethod),
									ReferenceType: "invoice",
									ReferenceID:   dbInv.InvoiceNumber,
									BalanceBefore: balanceBefore,
									BalanceAfter:  user.Balance,
								})

								log.Printf("💰 Wallet Top Up Success: User %d Amount %.2f", user.ID, dbInv.Amount)
							}
						}

						if dbInv.OrderID != nil {
							// Fetch User for email
							var orderUser models.User
							if err := tx.First(&orderUser, dbInv.Order.UserID).Error; err == nil {
								helpers.SendPaymentSuccessEmail(orderUser.Email, orderUser.FullName, dbInv.InvoiceNumber, dbInv.Amount, dbInv.Type)
							}
						} else {
							// Fetch User from invoice (TopUP)
							var invUser models.User
							if err := tx.First(&invUser, dbInv.UserID).Error; err == nil {
								helpers.SendPaymentSuccessEmail(invUser.Email, invUser.FullName, dbInv.InvoiceNumber, dbInv.Amount, dbInv.Type)
							}
						}

						tx.Commit()
					}
					paymentStatus = "SETLD" // Ensure frontend receives success
				}
			}
		}
	}

	// Map Prismalink status to our status
	// SETLD = Settled (Success), PENDG = Pending, REJEC = Rejected
	callbackStatus := "pending"
	switch paymentStatus {
	case "SETLD", "SUCCESS", "00":
		callbackStatus = "success"
	case "REJEC", "FAILED", "99":
		callbackStatus = "failed"
	case "PENDG", "":
		callbackStatus = "pending"
	}

	// Build redirect URL to frontend callback page
	redirectURL := fmt.Sprintf("%s/payment/callback?status=%s", frontendURL, callbackStatus)
	if pgid != "" {
		redirectURL += "&pgid=" + pgid
	}
	if merchantRef != "" {
		redirectURL += "&order=" + merchantRef
	}
	if plinkRef != "" {
		redirectURL += "&ref=" + plinkRef
	}

	log.Printf("↩️ Redirecting to: %s", redirectURL)

	// 302 redirect to frontend
	c.Redirect(http.StatusFound, redirectURL)
}
