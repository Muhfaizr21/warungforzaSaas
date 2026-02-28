package helpers

import (
	"forzashop/backend/models"
	"time"

	"gorm.io/gorm"
)

// RecordStockMovement logs a change in stock levels for auditing and alerts
func RecordStockMovement(tx *gorm.DB, productID uint, qty int, stockType string, movementType string, refType string, refID string, note string, userID *uint) error {
	// 1. Get current balance
	var product models.Product
	if err := tx.First(&product, productID).Error; err != nil {
		return err
	}

	balanceBefore := product.Stock
	if stockType == "reserved" {
		balanceBefore = product.ReservedQty
	}

	balanceAfter := balanceBefore + qty

	// 2. Create Movement Log
	movement := models.StockMovement{
		ProductID:     productID,
		Quantity:      qty,
		StockType:     stockType,
		MovementType:  movementType,
		ReferenceType: refType,
		ReferenceID:   refID,
		Note:          note,
		PerformedBy:   userID,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
		CreatedAt:     time.Now(),
	}

	if err := tx.Create(&movement).Error; err != nil {
		return err
	}

	// 3. Check for Stock Alerts (Physical Only)
	if stockType == "physical" && movementType != "procurement" {
		if balanceAfter <= product.MinStockLevel && product.MinStockLevel > 0 {
			// Trigger Alert Notification
			NotifyAdmin("STOCK_CRITICAL", "Critical Stock Level Detected", map[string]interface{}{
				"product_id":      product.ID,
				"product_name":    product.Name,
				"current_stock":   balanceAfter,
				"min_stock_level": product.MinStockLevel,
			})
		}
	}

	return nil
}
