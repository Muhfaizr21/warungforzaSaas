package controllers

import (
	"fmt"
	"net/http"
	"strconv"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// ─── UPSELL / CROSS-SELL ─────────────────────────────────────────────────────

// GetUpsells returns upsell/cross-sell products for a given product (public)
func GetUpsells(c *gin.Context) {
	productID := c.Param("id")

	var upsells []models.ProductUpsell
	if err := config.DB.
		Where("product_id = ?", productID).
		Preload("Upsell").
		Preload("Upsell.Category").
		Preload("Upsell.Brand").
		Order("sort_order ASC").
		Find(&upsells).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch upsells"})
		return
	}

	// Extract just the products
	var products []models.Product
	for _, u := range upsells {
		p := u.Upsell
		p.AvailableStock = p.Stock - p.ReservedQty
		if p.AvailableStock < 0 {
			p.AvailableStock = 0
		}
		products = append(products, p)
	}
	if products == nil {
		products = []models.Product{}
	}

	c.JSON(http.StatusOK, gin.H{"data": products, "count": len(products)})
}

// SetUpsells sets the upsell products for a given product (admin only)
func SetUpsells(c *gin.Context) {
	productID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var input struct {
		UpsellIDs []uint `json:"upsell_ids"`
		Type      string `json:"type"` // 'upsell' or 'crosssell'
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	upsellType := input.Type
	if upsellType == "" {
		upsellType = "upsell"
	}

	// Delete existing upsells of same type for this product
	config.DB.Where("product_id = ? AND type = ?", productID, upsellType).Delete(&models.ProductUpsell{})

	// Insert new ones
	for i, uid := range input.UpsellIDs {
		if uint(productID) == uid {
			continue // Skip self-reference
		}
		config.DB.Create(&models.ProductUpsell{
			ProductID: uint(productID),
			UpsellID:  uid,
			SortOrder: i,
			Type:      upsellType,
		})
	}

	helpers.Cache.Flush()
	c.JSON(http.StatusOK, gin.H{"message": "Upsell products updated successfully"})
}

// ─── LOW STOCK ALERT ─────────────────────────────────────────────────────────

// GetLowStockProducts returns products that are at or below their min_stock_level (admin only)
func GetLowStockProducts(c *gin.Context) {
	var products []models.Product
	if err := config.DB.
		Preload("Category").
		Preload("Brand").
		Where("min_stock_level > 0 AND (stock - reserved_qty) <= min_stock_level AND status = 'active' AND product_type = 'ready'").
		Order("(stock - reserved_qty) ASC").
		Limit(50).
		Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch low stock products"})
		return
	}

	// Calculate available stock for each
	for i := range products {
		products[i].AvailableStock = products[i].Stock - products[i].ReservedQty
		if products[i].AvailableStock < 0 {
			products[i].AvailableStock = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  products,
		"count": len(products),
	})
}

// SendLowStockAlertEmail sends an email digest of all low-stock products to admins
func SendLowStockAlertEmail(c *gin.Context) {
	var products []models.Product
	config.DB.
		Where("min_stock_level > 0 AND (stock - reserved_qty) <= min_stock_level AND status = 'active'").
		Find(&products)

	if len(products) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No low-stock products found"})
		return
	}

	// Find admin emails
	var admins []models.User
	config.DB.Where("role_id IN (SELECT id FROM roles WHERE slug IN ('super_admin', 'admin'))").Find(&admins)

	subject := fmt.Sprintf("⚠️ Low Stock Alert — %d Product(s) Need Restocking", len(products))

	rows := ""
	for _, p := range products {
		available := p.Stock - p.ReservedQty
		if available < 0 {
			available = 0
		}
		rows += fmt.Sprintf(`
			<tr>
				<td style="padding:8px 12px;border-bottom:1px solid #222;">%s</td>
				<td style="padding:8px 12px;border-bottom:1px solid #222;color:#aaa;">%s</td>
				<td style="padding:8px 12px;border-bottom:1px solid #222;text-align:center;color:%s;font-weight:bold;">%d</td>
				<td style="padding:8px 12px;border-bottom:1px solid #222;text-align:center;color:#888;">%d</td>
			</tr>`,
			p.Name, p.SKU,
			map[bool]string{true: "#ef4444", false: "#f59e0b"}[available <= 0],
			available, p.MinStockLevel,
		)
	}

	body := fmt.Sprintf(`
	<div style="font-family:sans-serif;background:#0a0a0a;padding:32px;color:#fff;max-width:700px;margin:0 auto;">
		<h2 style="color:#e11d48;margin-bottom:4px;">⚠️ Low Stock Alert</h2>
		<p style="color:#9ca3af;margin-bottom:24px;">The following products are at or below their minimum stock threshold. Please restock them soon.</p>
		<table style="width:100%%;border-collapse:collapse;background:#111;">
			<thead>
				<tr style="background:#1a1a1a;">
					<th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">Product</th>
					<th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;">SKU</th>
					<th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;">Available</th>
					<th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#6b7280;">Min Level</th>
				</tr>
			</thead>
			<tbody>%s</tbody>
		</table>
		<p style="margin-top:24px;font-size:12px;color:#6b7280;">This is an automated alert from Warung Forza inventory system.</p>
	</div>`, rows)

	for _, admin := range admins {
		go helpers.SendEmail(admin.Email, subject, body)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Alert email sent to %d admin(s) for %d low-stock product(s)", len(admins), len(products)),
	})
}
