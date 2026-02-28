package controllers

import (
	"fmt"
	"log"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"gorm.io/gorm"
)

// StartPaymentReminderWorker is a background job
func StartPaymentReminderWorker() {
	go func() {
		log.Println("⏰ Payment Reminder Worker Started")
		ticker := time.NewTicker(1 * time.Hour) // Run every hour
		defer ticker.Stop()

		for range ticker.C {
			processPaymentReminders()
			processExpiredOrders()
			processPOBalanceReminders()
		}
	}()
}

func processPaymentReminders() {
	var invoices []models.Invoice

	// Find unpaid invoices created > 23 hours ago AND < 24 hours ago (Send reminder 1 hour before 24h expiration)
	// Or simplistic: Unpaid invoices created between 20-23 hours ago that haven't been reminded?
	// Let's assume expiration is 24 hours. Reminder at 20 hours.

	reminderTime := time.Now().Add(-20 * time.Hour)
	windowEnd := time.Now().Add(-24 * time.Hour) // Don't remind if already expired

	// We need a flag "Reminded" in invoice or check logs.
	// For now, let's just check if created_at is within the window and not paid.
	// To avoid spam, we should probably add `IsReminded` bool to Invoice model, but migration might take time.
	// Alternative: Check notification logs? expensive.
	// Let's implement a simple check: CreatedAt < 20h ago AND CreatedAt > 24h ago.

	config.DB.Preload("Order.User").Where(
		"status = ? AND created_at <= ? AND created_at > ? AND (reminder_sent_at IS NULL OR reminder_sent_at < ?)",
		"unpaid", reminderTime, windowEnd, windowEnd,
	).Find(&invoices)

	for _, inv := range invoices {
		// Send Reminder
		// Check if already reminded? (Skip for now to keep it simple, assume worker runs hourly strictly)
		// But if we restart, we might double send.
		// Better: Check if `reminder_sent_at` is null.

		// Let's proceed with sending notification.
		log.Printf("🔔 Sending Payment Reminder for Invoice %s", inv.InvoiceNumber)

		if inv.Order.UserID != 0 {
			helpers.NotifyUser(inv.Order.UserID, "PAYMENT_REMINDER",
				fmt.Sprintf("Payment for %s is due in less than 4 hours.", inv.InvoiceNumber),
				map[string]interface{}{
					"invoice_id": inv.ID,
					"amount":     inv.Amount,
				})

			// Email Reminder
			emailBody := fmt.Sprintf(`
				<div style="font-family: sans-serif; padding: 20px;">
					<h2>Payment Reminder</h2>
					<p>Hello,</p>
					<p>This is a reminder that your invoice <strong>%s</strong> for <strong>Rp %s</strong> is due soon.</p>
					<p>Please complete your payment to avoid order cancellation.</p>
					<a href="%s/payment/%d" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pay Now</a>
				</div>
			`, inv.InvoiceNumber, helpers.FormatPrice(inv.Amount), helpers.GetFrontendURL(), inv.ID)

			helpers.SendEmail(inv.Order.User.Email, "Payment Reminder - "+inv.InvoiceNumber, emailBody)

			// ✅ Mark as reminded so we don't spam on next worker tick
			config.DB.Table("invoices").Where("id = ?", inv.ID).Update("reminder_sent_at", time.Now())
		}
	}
}

func processExpiredOrders() {
	var invoices []models.Invoice

	// Find invoices older than 24 hours (or 3 days?) user requested "Auto-cancel unpaid orders"
	// Let's use 24 hours for standard invoices.
	expireTime := time.Now().Add(-24 * time.Hour)

	// Only expire non-PO regular invoices (type 'full', 'topup')
	// Explicitly EXCLUDE 'deposit' and 'balance' as they have different deadlines governed by PO process
	config.DB.Preload("Order.Items.Product").Where("status = ? AND created_at < ? AND type NOT IN (?)", "unpaid", expireTime, []string{"deposit", "balance"}).Find(&invoices)

	for _, inv := range invoices {
		log.Printf("❌ Auto-Cancelling Expired Invoice %s", inv.InvoiceNumber)

		tx := config.DB.Begin()

		// Update Invoice
		inv.Status = "expired"
		tx.Save(&inv)

		// Cancel Order if linked
		if inv.OrderID != nil {
			var order models.Order
			if err := tx.Preload("Items.Product").First(&order, *inv.OrderID).Error; err == nil {
				if order.Status != "cancelled" && order.Status != "completed" {
					order.Status = "cancelled"
					order.InternalNotes += "\n[SYSTEM] Auto-cancelled due to payment expiration"

					for _, item := range order.Items {
						// ✅ Atomic update — safe against race conditions
						tx.Model(&models.Product{}).Where("id = ?", item.ProductID).
							Update("reserved_qty", gorm.Expr("GREATEST(reserved_qty - ?, 0)", item.Quantity))
					}

					tx.Save(&order)

					// Log
					tx.Create(&models.OrderLog{
						OrderID: order.ID,
						UserID:  order.UserID,
						Action:  "cancelled_system",
						Note:    "Auto-cancelled: Payment expired",
					})

					helpers.NotifyUser(order.UserID, "ORDER_CANCELLED",
						fmt.Sprintf("Order %s has been cancelled due to non-payment.", order.OrderNumber), nil)
				}
			}
		}

		tx.Commit()
	}
}

// processPOBalanceReminders handles reminders for PO balance invoices approaching due date
func processPOBalanceReminders() {
	var invoices []models.Invoice

	// Find unpaid balance invoices with a due_date set (these are PO balance invoices activated by MarkPOArrived)
	// Send reminders for invoices due in 3 days (H-3) or 1 day (H-1)
	now := time.Now()

	// H-3 window: due_date between 2.5 and 3.5 days from now
	h3Start := now.Add(60 * time.Hour) // 2.5 days
	h3End := now.Add(84 * time.Hour)   // 3.5 days

	// H-1 window: due_date between 0.5 and 1.5 days from now
	h1Start := now.Add(12 * time.Hour) // 0.5 days
	h1End := now.Add(36 * time.Hour)   // 1.5 days

	// Fetch H-3 reminders
	config.DB.Preload("Order.User").
		Where("status = ? AND type = ? AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?",
			"unpaid", "balance", h3Start, h3End).
		Find(&invoices)

	for _, inv := range invoices {
		if inv.Order.UserID == 0 {
			continue
		}
		daysLeft := int(inv.DueDate.Sub(now).Hours() / 24)
		log.Printf("📢 PO Balance Reminder (H-%d) for Invoice %s", daysLeft, inv.InvoiceNumber)

		helpers.NotifyUser(inv.Order.UserID, "PO_BALANCE_REMINDER",
			fmt.Sprintf("Pelunasan PO %s jatuh tempo dalam %d hari. Segera lakukan pembayaran.", inv.InvoiceNumber, daysLeft),
			map[string]interface{}{
				"invoice_id": inv.ID,
				"order_id":   inv.OrderID,
				"amount":     inv.Amount,
				"days_left":  daysLeft,
			})

		appURL := helpers.GetFrontendURL()
		emailBody := fmt.Sprintf(`
			<div style="font-family: sans-serif; padding: 20px;">
				<h2>⏰ Pengingat Pelunasan Pre-Order</h2>
				<p>Halo %s,</p>
				<p>Ini pengingat bahwa tagihan pelunasan PO Anda (<strong>%s</strong>) sebesar <strong>Rp %s</strong> akan jatuh tempo dalam <strong>%d hari</strong>.</p>
				<p>Silakan segera lakukan pembayaran sebelum <strong>%s</strong> untuk menghindari pembatalan pesanan.</p>
				<a href="%s/order/%d" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 10px;">Bayar Sekarang</a>
			</div>
		`, inv.Order.User.FullName, inv.InvoiceNumber, helpers.FormatPrice(inv.Amount), daysLeft, inv.DueDate.Format("02 Jan 2006"), appURL, *inv.OrderID)

		helpers.SendEmail(inv.Order.User.Email, fmt.Sprintf("Pengingat Pelunasan PO - %s (H-%d)", inv.InvoiceNumber, daysLeft), emailBody)
	}

	// Fetch H-1 reminders (separate query for clarity)
	var h1Invoices []models.Invoice
	config.DB.Preload("Order.User").
		Where("status = ? AND type = ? AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ?",
			"unpaid", "balance", h1Start, h1End).
		Find(&h1Invoices)

	for _, inv := range h1Invoices {
		if inv.Order.UserID == 0 {
			continue
		}
		log.Printf("🚨 PO Balance URGENT Reminder (H-1) for Invoice %s", inv.InvoiceNumber)

		helpers.NotifyUser(inv.Order.UserID, "PO_BALANCE_URGENT",
			fmt.Sprintf("PENTING: Pelunasan PO %s jatuh tempo BESOK. Bayar sekarang untuk menghindari pembatalan.", inv.InvoiceNumber),
			map[string]interface{}{
				"invoice_id": inv.ID,
				"order_id":   inv.OrderID,
				"amount":     inv.Amount,
				"urgent":     true,
			})

		appURL := helpers.GetFrontendURL()
		emailBody := fmt.Sprintf(`
			<div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
				<h2 style="color: #ef4444;">🚨 Peringatan Terakhir: Pelunasan PO</h2>
				<p>Halo %s,</p>
				<p>Tagihan pelunasan PO Anda (<strong>%s</strong>) sebesar <strong>Rp %s</strong> akan <strong>JATUH TEMPO BESOK (%s)</strong>.</p>
				<p style="color: #ef4444; font-weight: bold;">Pesanan Anda akan otomatis dibatalkan jika tidak dilunasi tepat waktu.</p>
				<a href="%s/order/%d" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 10px;">Bayar Sekarang</a>
			</div>
		`, inv.Order.User.FullName, inv.InvoiceNumber, helpers.FormatPrice(inv.Amount), inv.DueDate.Format("02 Jan 2006"), appURL, *inv.OrderID)

		helpers.SendEmail(inv.Order.User.Email, "🚨 URGENT: Pelunasan PO Jatuh Tempo Besok - "+inv.InvoiceNumber, emailBody)
	}

	// Auto-cancel overdue PO balance invoices
	var overdueInvoices []models.Invoice
	config.DB.Preload("Order.Items.Product").
		Where("status = ? AND type = ? AND due_date IS NOT NULL AND due_date < ?",
			"unpaid", "balance", now).
		Find(&overdueInvoices)

	for _, inv := range overdueInvoices {
		log.Printf("❌ Auto-Cancelling Overdue PO Balance Invoice %s", inv.InvoiceNumber)

		tx := config.DB.Begin()

		inv.Status = "expired"
		tx.Save(&inv)

		if inv.OrderID != nil {
			var order models.Order
			if err := tx.Preload("Items.Product").First(&order, *inv.OrderID).Error; err == nil {
				if order.Status != "cancelled" && order.Status != "completed" {
					order.Status = "cancelled"
					order.InternalNotes += "\n[SYSTEM] Auto-cancelled: PO balance payment expired"
					tx.Save(&order)

					tx.Create(&models.OrderLog{
						OrderID: order.ID,
						UserID:  order.UserID,
						Action:  "cancelled_system",
						Note:    "Auto-cancelled: PO balance payment overdue",
					})

					helpers.NotifyUser(order.UserID, "PO_CANCELLED",
						fmt.Sprintf("Pesanan PO %s dibatalkan karena pelunasan tidak dilakukan sebelum batas waktu.", order.OrderNumber), nil)
				}
			}
		}

		tx.Commit()
	}
}
