package models

import (
	"time"
)

// ============================================
// RESTOCK NOTIFICATION MODULE
// ============================================

type RestockEvent struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProductID uint      `gorm:"index" json:"product_id"`
	Product   Product   `json:"product,omitempty"`
	Event     string    `gorm:"size:50" json:"event"` // 'out_of_stock', 'back_in_stock'
	CreatedAt time.Time `json:"created_at"`
}

type RestockNotification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ProductID uint      `gorm:"index" json:"product_id"`
	Product   Product   `json:"product,omitempty"`
	UserID    uint      `gorm:"index" json:"user_id"`
	User      User      `json:"user,omitempty"`
	Status    string    `gorm:"size:20;default:'pending'" json:"status"` // 'pending', 'sent'
	CreatedAt time.Time `json:"created_at"`
}

// ============================================
// STOCK MOVEMENT AUDIT MODULE
// ============================================

type StockMovement struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	ProductID     uint      `gorm:"index" json:"product_id"`
	Product       Product   `json:"product,omitempty"`
	Quantity      int       `json:"quantity"`       // + for addition, - for reduction
	StockType     string    `json:"stock_type"`     // 'physical', 'reserved'
	MovementType  string    `json:"movement_type"`  // 'sale', 'adjustment', 'procurement', 'return', 'cancellation'
	ReferenceType string    `json:"reference_type"` // 'ORDER', 'PROCUREMENT', 'MANUAL'
	ReferenceID   string    `json:"reference_id"`   // INV-XXX, ADJ-XXX
	Note          string    `json:"note"`
	PerformedBy   *uint     `json:"performed_by"` // User ID
	User          *User     `gorm:"foreignKey:PerformedBy" json:"user,omitempty"`
	BalanceBefore int       `json:"balance_before"`
	BalanceAfter  int       `json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}
