package models

import (
	"time"
)

// Voucher - Core voucher model (WooCommerce-style)
type Voucher struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Code        string `gorm:"size:50;unique;not null;index" json:"code"` // Unique voucher code
	Description string `gorm:"type:text" json:"description"`              // Internal note

	// Discount Type & Value
	Type         string  `gorm:"size:30;not null;default:'percentage'" json:"type"`  // percentage, fixed, shipping, buy_get_y
	Value        float64 `gorm:"type:decimal(20,2);not null;default:0" json:"value"` // Discount value (%)  or amount (IDR)
	MaxDiscount  float64 `gorm:"type:decimal(20,2);default:0" json:"max_discount"`   // Max discount cap for percentage type
	FreeShipping bool    `gorm:"default:false" json:"free_shipping"`                 // Free shipping flag

	// Conditions
	MinSpend float64 `gorm:"type:decimal(20,2);default:0" json:"min_spend"` // Minimum order amount
	MaxSpend float64 `gorm:"type:decimal(20,2);default:0" json:"max_spend"` // Maximum order amount (0 = no limit)

	// Usage Limits
	UsageLimitGlobal  int  `gorm:"default:0" json:"usage_limit_global"`   // 0 = unlimited
	UsageLimitPerUser int  `gorm:"default:1" json:"usage_limit_per_user"` // 0 = unlimited
	UsedCount         int  `gorm:"default:0" json:"used_count"`           // Total used count
	IndividualUse     bool `gorm:"default:false" json:"individual_use"`   // Cannot be combined with other vouchers

	// Validity
	StartDate *time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date"`

	// Status
	Status    string `gorm:"size:20;default:'active';index" json:"status"` // active, expired, disabled
	CreatedBy uint   `json:"created_by"`
	Creator   User   `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`

	// Buy X Get Y fields (for future use)
	BuyQuantity  int   `gorm:"default:0" json:"buy_quantity"`
	GetQuantity  int   `gorm:"default:0" json:"get_quantity"`
	GetProductID *uint `json:"get_product_id"` // Product given free

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations (preloaded when needed)
	Usages            []VoucherUsage    `gorm:"foreignKey:VoucherID" json:"usages,omitempty"`
	ProductRestricts  []VoucherProduct  `gorm:"foreignKey:VoucherID" json:"product_restricts,omitempty"`
	CategoryRestricts []VoucherCategory `gorm:"foreignKey:VoucherID" json:"category_restricts,omitempty"`
}

// VoucherUsage - Track every time a voucher is used
type VoucherUsage struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	VoucherID      uint      `gorm:"index;not null" json:"voucher_id"`
	Voucher        Voucher   `gorm:"foreignKey:VoucherID" json:"voucher,omitempty"`
	UserID         uint      `gorm:"index;not null" json:"user_id"`
	User           User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	OrderID        *uint     `gorm:"index" json:"order_id"`
	Order          Order     `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	DiscountAmount float64   `gorm:"type:decimal(20,2);not null" json:"discount_amount"` // Actual discount given
	UsedAt         time.Time `json:"used_at"`
}

// VoucherProduct - Product restrictions for a voucher
type VoucherProduct struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	VoucherID uint    `gorm:"index;not null" json:"voucher_id"`
	ProductID uint    `gorm:"index;not null" json:"product_id"`
	Product   Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Type      string  `gorm:"size:10;default:'include'" json:"type"` // include, exclude
}

// VoucherCategory - Category restrictions for a voucher
type VoucherCategory struct {
	ID         uint     `gorm:"primaryKey" json:"id"`
	VoucherID  uint     `gorm:"index;not null" json:"voucher_id"`
	CategoryID uint     `gorm:"index;not null" json:"category_id"`
	Category   Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Type       string   `gorm:"size:10;default:'include'" json:"type"` // include, exclude
}

// VoucherValidationResult - Result from ValidateVoucher
type VoucherValidationResult struct {
	Valid          bool     `json:"valid"`
	DiscountAmount float64  `json:"discount_amount"`
	FreeShipping   bool     `json:"free_shipping"`
	Message        string   `json:"message"`
	Voucher        *Voucher `json:"voucher,omitempty"`
}
