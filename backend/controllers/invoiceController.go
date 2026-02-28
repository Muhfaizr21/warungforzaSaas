package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// MarkInvoicePaid - Manually mark an invoice as paid (e.g. Bank Transfer check)
func MarkInvoicePaid(c *gin.Context) {
	id := c.Param("id")
	var invoice models.Invoice

	if err := config.DB.First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	if invoice.Status == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice is already paid"})
		return
	}

	tx := config.DB.Begin()

	// 1. Update Invoice Status
	now := time.Now()
	invoice.Status = "paid"
	invoice.PaidAt = &now
	invoice.PaymentMethod = "manual_admin"

	if err := tx.Save(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice"})
		return
	}

	// 2. Journal Entry (Dr Bank / Cr Revenue/Liability)
	// Use RecordPaymentJournal helper to ensure balances are updated correctly
	if err := helpers.RecordPaymentJournal(tx, &invoice, "MANUAL-ADMIN"); err != nil {
		// Log error but don't fail the whole transaction?
		// Better to fail so data is consistent
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record finance journal: " + err.Error()})
		return
	}

	tx.Commit()

	// 3. Update Parent Order Status logic (Only if Order exists)
	if invoice.OrderID != nil && *invoice.OrderID != 0 {
		orderSvc := services.NewOrderService()
		orderSvc.UpdatePaymentTotals(*invoice.OrderID)

		// Create Order Log for user timeline
		if userVal, exists := c.Get("currentUser"); exists {
			user := userVal.(models.User)
			config.DB.Create(&models.OrderLog{
				OrderID: *invoice.OrderID,
				UserID:  user.ID,
				Action:  "payment_verified",
				Note:    fmt.Sprintf("Payment for invoice %s verified by high-command. Status updated.", invoice.InvoiceNumber),
			})
		}
	}

	// Audit Log
	if userVal, exists := c.Get("currentUser"); exists {
		user := userVal.(models.User)
		helpers.LogAudit(user.ID, "Invoice", "Pay", invoice.InvoiceNumber, "Marked invoice as paid ("+invoice.Type+")", nil, invoice, c.ClientIP(), c.Request.UserAgent())
	}

	// 4. Notify User (If Order Exists)
	if invoice.OrderID != nil && *invoice.OrderID != 0 {
		var order models.Order
		if err := config.DB.Preload("User").First(&order, *invoice.OrderID).Error; err == nil {
			helpers.NotifyUser(order.UserID, "PAYMENT_VERIFIED", fmt.Sprintf("Payment for %s verified. Thank you!", invoice.InvoiceNumber), map[string]interface{}{
				"order_id":       order.ID,
				"invoice_number": invoice.InvoiceNumber,
				"amount":         invoice.Amount,
			})

			// Send Email
			helpers.SendEmail(order.User.Email, "Payment Verified: "+invoice.InvoiceNumber, fmt.Sprintf("Thank you! your payment of %.2f has been verified.", invoice.Amount))
		}
	}

	c.JSON(http.StatusOK, invoice)
}

// DownloadInvoicePDF - Generate and download invoice as PDF (US-ORD-010)
// Note: For full PDF generation, consider using "github.com/jung-kurt/gofpdf" or wkhtmltopdf
// This implementation returns JSON that frontend can use to generate PDF client-side
func DownloadInvoicePDF(c *gin.Context) {
	id := c.Param("id")
	var invoice models.Invoice

	if err := config.DB.Preload("Order.User").Preload("Order.Items.Product").First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// SECURITY: IDOR Check
	userVal, exists := c.Get("currentUser")
	if exists {
		user := userVal.(models.User)
		// If user role is 'user', restrict to own. Staff can view all.
		if user.Role.Slug == models.RoleUser && invoice.UserID != user.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to this invoice"})
			return
		}
	}

	var user models.User
	var order models.Order
	// Build invoice data structure for PDF generation
	type InvoiceItemData struct {
		No          int     `json:"no"`
		ProductName string  `json:"product_name"`
		SKU         string  `json:"sku"`
		Quantity    int     `json:"quantity"`
		Price       float64 `json:"price"`
		Total       float64 `json:"total"`
	}

	items := make([]InvoiceItemData, 0)
	subtotal := 0.0

	if invoice.OrderID != nil {
		order = invoice.Order
		user = order.User

		for i, item := range order.Items {
			itemTotal := item.Price * float64(item.Quantity)
			items = append(items, InvoiceItemData{
				No:          i + 1,
				ProductName: item.Product.Name,
				SKU:         item.Product.SKU,
				Quantity:    item.Quantity,
				Price:       item.Price,
				Total:       itemTotal,
			})
			subtotal += itemTotal
		}
	} else {
		// Top Up or Manual Invoice without Order
		config.DB.First(&user, invoice.UserID)
		items = append(items, InvoiceItemData{
			No:          1,
			ProductName: "Wallet Top Up",
			SKU:         "TOPUP",
			Quantity:    1,
			Price:       invoice.Amount,
			Total:       invoice.Amount,
		})
	}

	// Use actual shipping cost
	shipping := order.ShippingCost

	// Handle Shipping Address securely to ensure it's an object in JSON, not base64
	var shippingAddrObj interface{}
	if order.ShippingAddress != nil {
		_ = json.Unmarshal(order.ShippingAddress, &shippingAddrObj)
	}

	invoiceData := gin.H{
		"invoice_number": invoice.InvoiceNumber,
		"invoice_type":   invoice.Type,
		"invoice_date":   invoice.CreatedAt.Format("02 January 2006"),
		"due_date":       invoice.DueDate.Format("02 January 2006"),
		"status":         invoice.Status,
		"paid_at":        nil,

		"order_number": order.OrderNumber,
		"order_date":   order.CreatedAt.Format("02 January 2006"),

		"customer": gin.H{
			"name":             user.FullName,
			"email":            user.Email,
			"phone":            user.Phone,
			"shipping_address": shippingAddrObj,
		},

		"items":    items,
		"subtotal": subtotal,
		"shipping": shipping,
		"total":    invoice.Amount,

		"company":      helpers.GetCompanyInfo(),
		"payment_info": helpers.GetBankInfo(),
	}

	if invoice.PaidAt != nil {
		invoiceData["paid_at"] = invoice.PaidAt.Format("02 January 2006 15:04")
	}

	c.JSON(http.StatusOK, invoiceData)
}
