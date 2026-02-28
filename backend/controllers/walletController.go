package controllers

import (
	"fmt"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetWalletBalance - Get current user balance and transaction history
func GetWalletBalance(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := user.(models.User).ID

	// Refresh user to get latest balance
	var currentUser models.User
	if err := config.DB.First(&currentUser, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user"})
		return
	}

	// Get recent transactions
	var transactions []models.WalletTransaction
	if err := config.DB.Where("user_id = ?", userID).Order("created_at desc").Limit(20).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	// Get unpaid top-up invoices
	var unpaidInvoices []models.Invoice
	config.DB.Where("user_id = ? AND type = 'topup' AND status = 'unpaid' AND due_date > ?", userID, time.Now()).Find(&unpaidInvoices)

	c.JSON(http.StatusOK, gin.H{
		"balance":         currentUser.Balance,
		"transactions":    transactions,
		"unpaid_invoices": unpaidInvoices,
	})
}

// TopUpWallet - Create a top-up invoice
func TopUpWallet(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := user.(models.User).ID

	var input struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create a "TopUp" Invoice
	// Format: INV-TOPUP-UID-TIMESTAMP
	invoiceNumber := fmt.Sprintf("INV-TOPUP-%d-%s", userID, time.Now().Format("20060102150405"))

	invoice := models.Invoice{
		InvoiceNumber: invoiceNumber,
		UserID:        userID, // Link directly to user
		Amount:        input.Amount,
		Type:          "topup",
		Status:        "unpaid",
		DueDate:       time.Now().Add(24 * time.Hour), // 24h expiry
	}

	if err := config.DB.Create(&invoice).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invoice"})
		return
	}

	// Use PaymentHelper to get Payment/Gateway URL (Assuming simplified logic or Prismalink integration)
	// For now, we simulate by returning the Invoice ID and expecting payment link generation
	// In a real scenario, we would call the Payment Gateway API here.

	c.JSON(http.StatusCreated, gin.H{
		"invoice_id":     invoice.ID,
		"invoice_number": invoice.InvoiceNumber,
		"amount":         invoice.Amount,
		"message":        "Top-up invoice created. Proceed to payment.",
	})
}

// AdminAdjustBalance - Manual adjustment by admin
func AdminAdjustBalance(c *gin.Context) {
	var input struct {
		UserID      uint    `json:"user_id" binding:"required"`
		Type        string  `json:"type" binding:"required,oneof=credit debit"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		Description string  `json:"description" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	tx := config.DB.Begin()

	balanceBefore := user.Balance

	// ATOMIC UPDATE
	if input.Type == "credit" {
		if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", input.Amount)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to credit balance"})
			return
		}
	} else {
		// Debit with condition
		res := tx.Model(&user).Where("id = ? AND balance >= ?", user.ID, input.Amount).Update("balance", gorm.Expr("balance - ?", input.Amount))
		if res.Error != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to debit balance"})
			return
		}
		if res.RowsAffected == 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance for debit"})
			return
		}
	}

	// Helper: Update local user object for response correctness (read back or manually adjust)
	// We rely on the atomic update, so let's just create the tx record with the *calculated* new balance roughly,
	// or ideally fetch it again if we want perfect accuracy for the history log.
	// For performance, we can just calculate what it *should* be, but fetching is safer for logs.
	var updatedUser models.User
	tx.First(&updatedUser, user.ID)
	balanceAfter := updatedUser.Balance

	// Record Transaction
	transaction := models.WalletTransaction{
		UserID:        user.ID,
		Type:          input.Type,
		Amount:        input.Amount,
		Description:   input.Description,
		ReferenceType: "manual_adjustment",
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record transaction"})
		return
	}

	// Record Journal Entry (To track Liability: Customer Deposits)
	// Credit: Topup (Increases Liability) / Debit: Withdrawal (Decreases Liability)
	coaWalletID, _ := helpers.GetCOAByMappingKey("WALLET_LIABILITY")
	coaExpenseID, _ := helpers.GetCOAByMappingKey("OTHER_INCOME") // Typically Admin manual credit/debit goes to an adjustment account like Other Income/Expense
	if coaExpenseID == 0 {
		// Fallback to searching EXPENSE if not set
		var fallback models.COA
		config.DB.Where("type = ?", "EXPENSE").First(&fallback)
		coaExpenseID = fallback.ID
	}

	if coaWalletID != 0 && coaExpenseID != 0 {
		if input.Type == "credit" {
			helpers.PostJournalWithTX(tx, fmt.Sprintf("ADJ-%d", transaction.ID), "ADJUSTMENT", fmt.Sprintf("Manual Wallet Credit: %s", input.Description), []models.JournalItem{
				{COAID: coaExpenseID, Debit: input.Amount, Credit: 0},
				{COAID: coaWalletID, Debit: 0, Credit: input.Amount},
			})
		} else {
			helpers.PostJournalWithTX(tx, fmt.Sprintf("ADJ-%d", transaction.ID), "ADJUSTMENT", fmt.Sprintf("Manual Wallet Debit: %s", input.Description), []models.JournalItem{
				{COAID: coaWalletID, Debit: input.Amount, Credit: 0},
				{COAID: coaExpenseID, Debit: 0, Credit: input.Amount},
			})
		}
	}

	tx.Commit()

	helpers.LogAuditSimple(0, "finance", "UPDATE", user.ID, fmt.Sprintf("Admin adjusted balance for User %d: %s %.2f", user.ID, input.Type, input.Amount))
	c.JSON(http.StatusOK, gin.H{"message": "Balance adjusted successfully", "new_balance": user.Balance})
}

// PayInvoiceWithWallet - Pay an invoice using user's wallet balance
func PayInvoiceWithWallet(c *gin.Context) {
	user, exists := c.Get("currentUser")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := user.(models.User).ID
	invoiceID := c.Param("id")

	tx := config.DB.Begin()

	// 1. Fetch Invoice
	var invoice models.Invoice
	if err := tx.Preload("Order.Items.Product").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// 2. Validate Ownership & Status
	// Check if invoice belongs to user (Directly or via Order)
	isOwner := invoice.UserID == userID
	if !isOwner && invoice.OrderID != nil {
		var order models.Order
		if err := tx.First(&order, *invoice.OrderID).Error; err == nil {
			if order.UserID == userID {
				isOwner = true
			}
		}
	}

	if !isOwner {
		tx.Rollback()
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to this invoice"})
		return
	}

	if invoice.Status == "paid" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice is already paid"})
		return
	}

	// Allow 'pending_arrival' invoices to be paid (PO Balance)
	if invoice.Status != "unpaid" && invoice.Status != "pending_arrival" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice cannot be paid at this status"})
		return
	}

	// 3. User Balance Check & Deduction
	var currentUser models.User
	if err := tx.First(&currentUser, userID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user data"})
		return
	}

	balanceBefore := currentUser.Balance

	// ATOMIC DEDUCTION
	res := tx.Model(&currentUser).Where("id = ? AND balance >= ?", currentUser.ID, invoice.Amount).Update("balance", gorm.Expr("balance - ?", invoice.Amount))
	if res.Error != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deduct balance"})
		return
	}
	if res.RowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient wallet balance"})
		return
	}

	// Refetch for log accuracy
	var updatedUser models.User
	tx.First(&updatedUser, currentUser.ID)
	balanceAfter := updatedUser.Balance
	currentUser.Balance = balanceAfter // Update local for response

	// 4. Record Wallet Transaction
	walletTx := models.WalletTransaction{
		UserID:        userID,
		Type:          "debit",
		Amount:        invoice.Amount,
		Description:   fmt.Sprintf("Payment for Invoice %s", invoice.InvoiceNumber),
		ReferenceType: "invoice",
		ReferenceID:   invoice.InvoiceNumber,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
	}
	if err := tx.Create(&walletTx).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record wallet transaction"})
		return
	}

	// 5. Update Invoice
	now := time.Now()
	invoice.Status = "paid"
	invoice.PaidAt = &now
	invoice.PaymentMethod = "wallet"

	if err := tx.Save(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice status"})
		return
	}

	// 6. Update Order Logic
	if invoice.OrderID != nil {
		var order models.Order
		if err := tx.Preload("Items.Product").First(&order, *invoice.OrderID).Error; err == nil {
			if invoice.Type == "deposit" {
				order.DepositPaid += invoice.Amount
				order.RemainingBalance -= invoice.Amount
				order.PaymentStatus = "deposit_paid"
				order.Status = "pre_order" // Confirmed PO
			} else if invoice.Type == "balance" {
				order.PaymentStatus = "paid"
				order.RemainingBalance -= invoice.Amount
				order.Status = "processing" // Ready to ship (conceptually)
			} else {
				// Full payment
				order.PaymentStatus = "paid"
				order.RemainingBalance = 0
				order.Status = "processing"
			}

			// Finalize Stock Deduction if moving to processing
			if order.Status == "processing" {
				for _, item := range order.Items {
					tx.Model(&models.Product{}).
						Where("id = ?", item.ProductID).
						Updates(map[string]interface{}{
							"stock":        gorm.Expr("stock - ?", item.Quantity),
							"reserved_qty": gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity),
						})
				}
			}

			tx.Save(&order)

			// Order Log
			tx.Create(&models.OrderLog{
				OrderID: order.ID,
				UserID:  userID,
				Action:  "payment_verified",
				Note:    fmt.Sprintf("Paid via Wallet. Balance remaining: %.2f", currentUser.Balance),
			})
		}
	}

	// 7. Finance Journal (Simple)
	// Dr Wallet Liability / Cr Revenue
	// Since Wallet payment functions like a gateway, we just pass the reference ID to RecordPaymentJournal
	// RecordPaymentJournal dynamically handles Revenue or Customer Deposit mapping based on invoice type
	if err := helpers.RecordPaymentJournal(tx, &invoice, "WALLET-"+walletTx.ReferenceID); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record payment journal"})
		return
	}

	tx.Commit()

	// 8. Send Email Notification
	var orderNumber string
	if invoice.Order.OrderNumber != "" {
		orderNumber = invoice.Order.OrderNumber
	}

	emailSubject := "Payment Successful: " + invoice.InvoiceNumber
	emailBody := fmt.Sprintf(`
		<h2>Payment Successful</h2>
		<p>Hi %s,</p>
		<p>Your payment for invoice <b>%s</b> (Order: %s) has been successfully processed using your Wallet Balance.</p>
		<p>Amount Paid: <b>Rp %.2f</b></p>
		<p>Remaining Wallet Balance: <b>Rp %.2f</b></p>
		<br>
		<p>Thank you for shopping with Warung Forza!</p>
	`, currentUser.FullName, invoice.InvoiceNumber, orderNumber, invoice.Amount, currentUser.Balance)

	go helpers.SendEmail(currentUser.Email, emailSubject, emailBody)

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment successful",
		"balance": currentUser.Balance,
		"invoice": invoice,
	})
}
