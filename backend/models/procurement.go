package models

import (
	"time"
)

// PurchaseOrder represents a procurement order to a supplier
type PurchaseOrder struct {
	ID         uint     `gorm:"primaryKey" json:"id"`
	PONumber   string   `gorm:"size:50;unique;not null" json:"po_number"` // PO-20231010-001
	SupplierID uint     `json:"supplier_id"`
	Supplier   Supplier `json:"supplier"`

	Status      string  `gorm:"size:20;default:'draft'" json:"status"` // draft, ordered, received, cancelled
	TotalAmount float64 `gorm:"type:decimal(20,2)" json:"total_amount"`
	Notes       string  `gorm:"type:text" json:"notes"`

	OrderedAt    *time.Time `json:"ordered_at"`
	ExpectedDate *time.Time `json:"expected_date"`
	ReceivedAt   *time.Time `json:"received_at"`

	Items []PurchaseOrderItem `json:"items"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PurchaseOrderItem represents an item within a Purchase Order
type PurchaseOrderItem struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	PurchaseOrderID uint    `json:"purchase_order_id"`
	ProductID       uint    `json:"product_id"`
	Product         Product `json:"product"`

	Quantity  int     `json:"quantity"`
	UnitCost  float64 `gorm:"type:decimal(20,2)" json:"unit_cost"`
	TotalCost float64 `gorm:"type:decimal(20,2)" json:"total_cost"`

	ReceivedQty int `gorm:"default:0" json:"received_qty"` // For partial receiving support later
}

// Hook to update total cost before saving
// (Implementation logic will be handled in controller service mostly to ensure atomicity with stock updates)
