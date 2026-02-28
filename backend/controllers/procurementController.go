package controllers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// GetPurchaseOrderStats returns aggregated statistics for POs
func GetPurchaseOrderStats(c *gin.Context) {
	var totalPO int64
	var draftPO int64
	var orderedPO int64
	var receivedPO int64
	var totalItems int64
	var receivedItems int64

	// Total POs
	config.DB.Model(&models.PurchaseOrder{}).Count(&totalPO)

	// Draft
	config.DB.Model(&models.PurchaseOrder{}).Where("status = ?", "draft").Count(&draftPO)

	// Ordered
	config.DB.Model(&models.PurchaseOrder{}).Where("status = ?", "ordered").Count(&orderedPO)

	// Received
	config.DB.Model(&models.PurchaseOrder{}).Where("status = ?", "received").Count(&receivedPO)

	// Item Counts (Total and Received)
	// We join with purchase_order_items to sum quantities
	config.DB.Table("purchase_order_items").Select("COALESCE(SUM(quantity), 0)").Row().Scan(&totalItems)

	// Received Items
	config.DB.Table("purchase_order_items").
		Joins("JOIN purchase_orders ON purchase_orders.id = purchase_order_items.purchase_order_id").
		Where("purchase_orders.status = ?", "received").
		Select("COALESCE(SUM(quantity), 0)").
		Row().Scan(&receivedItems)

	c.JSON(http.StatusOK, gin.H{
		"total":          totalPO,
		"draft":          draftPO,
		"ordered":        orderedPO,
		"received":       receivedPO,
		"total_items":    totalItems,
		"received_items": receivedItems,
	})
}

// GetPurchaseOrders lists all POs with pagination and filtering
func GetPurchaseOrders(c *gin.Context) {
	var pos []models.PurchaseOrder
	query := config.DB.Model(&models.PurchaseOrder{}).Distinct().Preload("Supplier").Preload("Items").Preload("Items.Product")

	// Filter by Status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by Search (PO Number or Supplier Name)
	if search := c.Query("search"); search != "" {
		searchTerm := "%" + search + "%"
		query = query.Joins("LEFT JOIN suppliers ON suppliers.id = purchase_orders.supplier_id").
			Where("purchase_orders.po_number ILIKE ? OR suppliers.name ILIKE ?", searchTerm, searchTerm)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Count(&total)

	if err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&pos).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch POs"})
		return
	}

	// Return empty array instead of null
	if pos == nil {
		pos = []models.PurchaseOrder{}
	}

	// [DATA INTEGRITY FIX] Recalculate totals if zero but has items
	fixedAny := false
	for i := range pos {
		if pos[i].TotalAmount <= 0 && len(pos[i].Items) > 0 {
			var realTotal float64
			for _, item := range pos[i].Items {
				realTotal += item.TotalCost
			}
			if realTotal > 0 {
				pos[i].TotalAmount = realTotal
				// Use Direct SQL to avoid triggering hooks or association saving again
				config.DB.Exec("UPDATE purchase_orders SET total_amount = ? WHERE id = ?", realTotal, pos[i].ID)
				fixedAny = true
			}
		}
	}
	if fixedAny {
		log.Println("🛠️ Automatically fixed PO totals for missing amounts.")
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  pos,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetPurchaseOrder retrieves a single PO
func GetPurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	var po models.PurchaseOrder
	if err := config.DB.Preload("Supplier").Preload("Items").Preload("Items.Product").First(&po, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Purchase Order not found"})
		return
	}
	c.JSON(http.StatusOK, po)
}

// CreatePurchaseOrder creates a new draft PO
func CreatePurchaseOrder(c *gin.Context) {
	var input struct {
		PONumber   string                     `json:"po_number"`
		SupplierID uint                       `json:"supplier_id"`
		Notes      string                     `json:"notes"`
		Items      []models.PurchaseOrderItem `json:"items"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate total
	var totalAmount float64
	for _, item := range input.Items {
		totalAmount += item.TotalCost
	}

	po := models.PurchaseOrder{
		PONumber:    input.PONumber,
		SupplierID:  input.SupplierID,
		Status:      "draft",
		TotalAmount: totalAmount,
		Notes:       input.Notes,
		Items:       input.Items,
	}

	if err := config.DB.Create(&po).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create PO"})
		return
	}

	c.JSON(http.StatusCreated, po)
}

// UpdatePurchaseOrder updates a PO (only if draft)
func UpdatePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	var po models.PurchaseOrder
	if err := config.DB.Preload("Items").First(&po, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "PO not found"})
		return
	}

	// Restriction relaxed per user request to allow corrections
	// if po.Status != "draft" {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot update PO that is not draft"})
	// 	return
	// }

	var input struct {
		PONumber   string                     `json:"po_number"`
		SupplierID uint                       `json:"supplier_id"`
		Notes      string                     `json:"notes"`
		Items      []models.PurchaseOrderItem `json:"items"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := config.DB.Begin()

	// 1. Delete old items
	if err := tx.Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update items"})
		return
	}

	// 2. Update Header
	var totalAmount float64
	for i := range input.Items {
		input.Items[i].PurchaseOrderID = po.ID
		totalAmount += input.Items[i].TotalCost
	}

	po.PONumber = input.PONumber
	po.SupplierID = input.SupplierID
	po.Notes = input.Notes
	po.TotalAmount = totalAmount

	// IMPORTANT: Clear the Items slice in the struct so GORM doesn't try to
	// save/re-insert the old preloaded items during Save(&po)
	po.Items = nil

	if err := tx.Omit("Items").Save(&po).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PO header"})
		return
	}

	// 3. Create new items
	if len(input.Items) > 0 {
		if err := tx.Create(&input.Items).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to recreate items"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, po)
}

// DeletePurchaseOrder deletes a PO (only if draft)
func DeletePurchaseOrder(c *gin.Context) {
	id := c.Param("id")
	var po models.PurchaseOrder
	if err := config.DB.First(&po, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "PO not found"})
		return
	}

	// Restriction relaxed per user request
	// if po.Status != "draft" && po.Status != "cancelled" {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft or cancelled POs can be deleted"})
	// 	return
	// }

	tx := config.DB.Begin()

	// Delete items first
	if err := tx.Where("purchase_order_id = ?", po.ID).Delete(&models.PurchaseOrderItem{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete PO items"})
		return
	}

	if err := tx.Delete(&po).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete PO"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "PO deleted successfully"})
}

// ReceivePurchaseOrder marks PO as received, updates stock, and creates journal entry
func ReceivePurchaseOrder(c *gin.Context) {
	id := c.Param("id")

	tx := config.DB.Begin()

	var po models.PurchaseOrder
	if err := tx.Preload("Items").First(&po, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "PO not found"})
		return
	}

	if po.Status == "received" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "PO already received"})
		return
	}

	// 1. Update Stock for each item
	for _, item := range po.Items {
		var product models.Product
		if err := tx.First(&product, item.ProductID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Product not found in PO item"})
			return
		}

		// Increase Request Stock (Assuming standard stock logic)
		// Or if we have separate warehouse tracking, update there.
		// Use standard "Stock" field for now.
		product.Stock += item.Quantity
		tx.Save(&product)
	}

	// 4. Create Journal Entry (Inventory Asset vs Accounts Payable/Cash)
	// Simplified: Assuming bought on credit (AP)
	coaInvID, _ := helpers.GetCOAByCode("1003") // Persediaan Barang
	coaAPID, _ := helpers.GetCOAByCode("2001")  // Hutang Usaha

	if coaInvID != 0 && coaAPID != 0 {
		je := models.JournalEntry{
			Date:          time.Now(),
			Description:   "Purchase Order #" + po.PONumber,
			ReferenceID:   po.PONumber,
			ReferenceType: "PURCHASE_ORDER",
			Items: []models.JournalItem{
				{
					COAID:  coaInvID,
					Debit:  po.TotalAmount,
					Credit: 0,
				},
				{
					COAID:  coaAPID,
					Debit:  0,
					Credit: po.TotalAmount,
				},
			},
		}

		if err := tx.Create(&je).Error; err != nil {
			log.Println("⚠️ Failed to create auto-journal for PO:", err)
		}
	}

	// 3. Update PO Status
	now := time.Now()
	po.Status = "received"
	po.ReceivedAt = &now
	tx.Save(&po)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "PO received and stock updated", "po": po})
}
