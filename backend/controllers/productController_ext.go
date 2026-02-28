package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

func MarkPOArrived(c *gin.Context) {
	id := c.Param("id")
	var product models.Product

	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.ProductType != "po" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "This action is only for Pre-Order products"})
		return
	}

	// Handle new logic for PO Cargo Actual Logistics Cost
	var reqBody struct {
		ActualSupplierCost float64 `json:"actual_supplier_cost"`
	}

	c.ShouldBindJSON(&reqBody)

	// Update supplier cost & set to ready stock simultaneously
	updates := map[string]interface{}{
		"product_type": "ready",
	}
	if reqBody.ActualSupplierCost > 0 {
		updates["supplier_cost"] = reqBody.ActualSupplierCost
	}
	config.DB.Model(&product).Updates(updates)

	// Since Cargo Cost affects Net Profit deeply, we forcefully update COGS Snapshot of all related PO Order Items
	if reqBody.ActualSupplierCost > 0 {
		config.DB.Exec("UPDATE order_items SET cogs_snapshot = ? WHERE product_id = ? AND order_id IN (SELECT id FROM orders WHERE status IN ('pre_order', 'pending', 'processing', 'payment_due'))", reqBody.ActualSupplierCost, product.ID)
	}

	// 2. Find all PENDING ARRIVAL Balance Invoices for this product
	// This logic is tricky because invoices are linked to Orders, not directly to Products.
	// We need to find Orders that contain this Product AND have a 'pending_arrival' balance invoice.

	// Read balance deadline from po_config
	balanceDeadlineDays := 7 // default
	if product.POConfig != nil {
		var poConfig struct {
			BalanceDeadlineDays int `json:"balance_deadline_days"`
		}
		if err := json.Unmarshal(product.POConfig, &poConfig); err == nil && poConfig.BalanceDeadlineDays > 0 {
			balanceDeadlineDays = poConfig.BalanceDeadlineDays
		}
	}

	var orders []models.Order
	// Join with OrderItems to find orders with this product
	config.DB.Joins("JOIN order_items ON order_items.order_id = orders.id").
		Where("order_items.product_id = ?", product.ID).
		Preload("User").
		Find(&orders)

	triggeredCount := 0

	for _, order := range orders {
		var balanceInvoice models.Invoice
		// Find the balance invoice that is pending arrival
		if err := config.DB.Where("order_id = ? AND type = ? AND status = ?", order.ID, "balance", "pending_arrival").First(&balanceInvoice).Error; err == nil {
			// Found one! Activate it.

			// 3. Update Invoice
			balanceInvoice.Status = "unpaid"
			balanceInvoice.DueDate = time.Now().AddDate(0, 0, balanceDeadlineDays)
			config.DB.Save(&balanceInvoice)

			// 4. Update Order Status
			order.Status = "payment_due" // Special status for arrival
			order.PaymentStatus = "balance_due"
			config.DB.Save(&order)

			// 5. Send Email Notification
			appURL := helpers.GetFrontendURL()
			subject := "Good News! Your Pre-Order has Arrived: " + product.Name
			body := fmt.Sprintf(`
				<h1>Your Item has Arrived!</h1>
				<p>Hi %s,</p>
				<p>The item you pre-ordered (<b>%s</b>) has arrived at our warehouse.</p>
				<p>Please complete your balance payment of <b>%s</b> by %s to avoid order cancellation.</p>
				<p><a href="%s/order/%d">Click here to Pay Now</a></p>
			`, order.User.FullName, product.Name, fmt.Sprintf("Rp %.0f", balanceInvoice.Amount), balanceInvoice.DueDate.Format("02 Jan 2006"), appURL, order.ID)

			helpers.SendEmail(order.User.Email, subject, body)

			// 6. Create Notification
			helpers.NotifyUser(order.UserID, "PO_ARRIVED", fmt.Sprintf("Arrived: %s. Please pay balance.", product.Name), map[string]interface{}{
				"product_id": product.ID,
				"order_id":   order.ID,
				"invoice_id": balanceInvoice.ID,
			})

			triggeredCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Produk '%s' sekarang READY STOCK. %d pesanan pelanggan telah dipicu tagihan sisa.", product.Name, triggeredCount),
		"product": product.Name,
	})
}
