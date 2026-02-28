package models

import (
	"time"

	"gorm.io/datatypes"
)

type Order struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	OrderNumber string `gorm:"size:50;unique;not null" json:"order_number"` // INV-20231010-001
	UserID      uint   `json:"user_id"`
	User        User   `json:"user"`
	Source      string `gorm:"size:50;default:'website';index" json:"source"` // website, pos

	// Billing Details (WooCommerce Standard)
	BillingFirstName string `gorm:"size:100" json:"billing_first_name"`
	BillingLastName  string `gorm:"size:100" json:"billing_last_name"`
	BillingCompany   string `gorm:"size:200" json:"billing_company"`
	BillingCountry   string `gorm:"size:100" json:"billing_country"`
	BillingAddress1  string `gorm:"size:255" json:"billing_address_1"`
	BillingAddress2  string `gorm:"size:255" json:"billing_address_2"`
	BillingCity      string `gorm:"size:100" json:"billing_city"`
	BillingState     string `gorm:"size:100" json:"billing_state"`
	BillingPostcode  string `gorm:"size:20" json:"billing_postcode"`
	BillingPhone     string `gorm:"size:50" json:"billing_phone"`
	BillingEmail     string `gorm:"size:255" json:"billing_email"`

	// Shipping Details (if shipping to different address)
	ShipToDifferent   bool   `gorm:"default:false" json:"ship_to_different"`
	ShippingFirstName string `gorm:"size:100" json:"shipping_first_name"`
	ShippingLastName  string `gorm:"size:100" json:"shipping_last_name"`
	ShippingCompany   string `gorm:"size:200" json:"shipping_company"`
	ShippingCountry   string `gorm:"size:100" json:"shipping_country"`
	ShippingAddress1  string `gorm:"size:255" json:"shipping_address_1"`
	ShippingAddress2  string `gorm:"size:255" json:"shipping_address_2"`
	ShippingCity      string `gorm:"size:100" json:"shipping_city"`
	ShippingState     string `gorm:"size:100" json:"shipping_state"`
	ShippingPostcode  string `gorm:"size:20" json:"shipping_postcode"`

	// Legacy Shipping (for backward compatibility)
	ShippingAddress datatypes.JSON `json:"shipping_address"` // Snapshot of address

	// Financials
	SubtotalAmount   float64 `gorm:"type:decimal(20,2);default:0" json:"subtotal_amount"`
	TotalAmount      float64 `gorm:"type:decimal(20,2);not null" json:"total_amount"`
	CurrencyCode     string  `gorm:"size:3;default:'IDR'" json:"currency_code"`
	ExchangeRate     float64 `gorm:"type:decimal(20,6);default:1" json:"exchange_rate"` // Rate at time of order
	TaxAmount        float64 `gorm:"type:decimal(20,2);default:0" json:"tax_amount"`
	ShippingCost     float64 `gorm:"type:decimal(20,2);default:0" json:"shipping_cost"`
	ShippingMethod   string  `gorm:"size:100" json:"shipping_method"` // Weight Based Shipping, Local Pickup
	DiscountAmount   float64 `gorm:"type:decimal(20,2);default:0" json:"discount_amount"`
	CouponCode       string  `gorm:"size:50" json:"coupon_code"`
	DepositPaid      float64 `gorm:"type:decimal(20,2);default:0" json:"deposit_paid"`
	RemainingBalance float64 `gorm:"type:decimal(20,2);default:0" json:"remaining_balance"`

	// Payment
	PaymentMethod      string `gorm:"size:100" json:"payment_method"`       // credit_card, bank_transfer, gopay, etc.
	PaymentMethodTitle string `gorm:"size:200" json:"payment_method_title"` // "Credit/Debit Card", "Bank Transfer - BNI VA"

	// Statuses
	Status            string `gorm:"size:50;default:'pending'" json:"status"`                 // pending, processing, shipped, completed, cancelled
	PaymentStatus     string `gorm:"size:50;default:'unpaid'" json:"payment_status"`          // unpaid, deposit_paid, paid, refunded
	FulfillmentStatus string `gorm:"size:50;default:'unfulfilled'" json:"fulfillment_status"` // unfulfilled, fulfilled, partial

	// Tracking
	TrackingNumber  string `gorm:"size:100" json:"tracking_number"`
	Carrier         string `gorm:"size:100" json:"carrier"`
	BiteshipOrderID string `gorm:"size:100" json:"biteship_order_id"` // Biteship Order ID for API operations

	Notes         string `gorm:"type:text" json:"notes"`          // Customer notes
	InternalNotes string `gorm:"type:text" json:"internal_notes"` // Admin notes

	Items    []OrderItem `json:"items"`
	Logs     []OrderLog  `json:"logs"`
	Invoices []Invoice   `json:"invoices"` // One order can have multiple invoices (Deposit, Balance)

	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

type OrderItem struct {
	ID        uint    `gorm:"primaryKey" json:"id"`
	OrderID   uint    `json:"order_id"`
	ProductID uint    `json:"product_id"`
	Product   Product `json:"product"`

	Quantity int     `json:"quantity"`
	Price    float64 `gorm:"type:decimal(20,2)" json:"price"` // Price at time of purchase
	Total    float64 `gorm:"type:decimal(20,2)" json:"total"`

	SnapshotData datatypes.JSON `json:"snapshot_data"`                           // Name, SKU, Image at time of purchase to prevent historic changes
	COGSSnapshot float64        `gorm:"type:decimal(20,2)" json:"cogs_snapshot"` // Cost of Goods Sold snapshot
}

type OrderLog struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	OrderID           uint      `json:"order_id"`
	UserID            uint      `json:"user_id"` // Who made the change (so we can track Admin actions)
	Action            string    `json:"action"`  // "status_change", "payment_verified"
	Note              string    `json:"note"`
	IsCustomerVisible bool      `gorm:"default:false" json:"is_customer_visible"`
	CreatedAt         time.Time `json:"created_at"`
}
