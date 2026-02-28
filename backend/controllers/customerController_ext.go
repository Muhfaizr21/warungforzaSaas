package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetOrderInvoiceForDownload - Customer endpoint to get invoice data for PDF
func GetOrderInvoiceForDownload(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	orderID := c.Param("id")
	invoiceID := c.Param("invoice_id")

	// Fetch order with user, items and products in one go to be robust
	var order models.Order
	if err := config.DB.Preload("Items.Product", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("User").Where("id = ? AND user_id = ?", orderID, user.ID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Verify invoice belongs to order
	var invoice models.Invoice
	if err := config.DB.Where("id = ? AND order_id = ?", invoiceID, order.ID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

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

	// Better to use stored shipping cost
	shipping := order.ShippingCost

	// Calculate payment summary for this order
	var allInvoices []models.Invoice
	config.DB.Where("order_id = ?", order.ID).Find(&allInvoices)

	amountPaidTotal := 0.0
	for _, inv := range allInvoices {
		if inv.Status == "paid" {
			amountPaidTotal += inv.Amount
		}
	}

	remainingAfterThis := order.TotalAmount + order.ShippingCost - amountPaidTotal
	if remainingAfterThis < 0 {
		remainingAfterThis = 0
	}

	// Check if overdue
	isOverdue := false
	if invoice.Status != "paid" && !invoice.DueDate.IsZero() && invoice.DueDate.Before(time.Now()) {
		isOverdue = true
	}

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
		"is_overdue":     isOverdue,

		"order_number": order.OrderNumber,
		"order_date":   order.CreatedAt.Format("02 January 2006"),

		// Payment Summary
		"summary": gin.H{
			"total_order":       order.TotalAmount + order.ShippingCost,
			"amount_paid":       amountPaidTotal,
			"remaining_balance": remainingAfterThis,
		},

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
