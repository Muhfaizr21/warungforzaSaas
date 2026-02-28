package models

import (
	"time"
)

// ============================================
// SUPPLIER MODULE
// ============================================

type Supplier struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Contact   string    `gorm:"size:100" json:"contact"`
	Email     string    `gorm:"size:255" json:"email"`
	Phone     string    `gorm:"size:20" json:"phone"`
	Address   string    `gorm:"type:text" json:"address"`
	Active    bool      `gorm:"default:true" json:"active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ProductSupplier links products to suppliers with specific costs
type ProductSupplier struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProductID  uint      `json:"product_id"`
	SupplierID uint      `json:"supplier_id"`
	Supplier   Supplier  `json:"supplier,omitempty"`
	Cost       float64   `gorm:"type:decimal(15,2)" json:"cost"`
	IsPrimary  bool      `gorm:"default:false" json:"is_primary"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
