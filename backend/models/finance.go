package models

import (
	"time"

	"gorm.io/datatypes"
)

// COA - Chart of Accounts
type COA struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Code       string    `gorm:"size:20;unique;not null" json:"code"`         // e.g., 1001
	Name       string    `gorm:"size:100;not null" json:"name"`               // e.g., Cash, Sales Revenue
	Type       string    `gorm:"size:50;not null" json:"type"`                // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, COGS
	Balance    float64   `gorm:"type:decimal(20,2);default:0" json:"balance"` // Cached balance
	ParentID   *uint     `json:"parent_id"`                                   // For hierarchy
	Parent     *COA      `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	IsActive   bool      `gorm:"default:true" json:"is_active"`
	CanPost    bool      `gorm:"default:true" json:"can_post"`      // If false, it's just a grouping header
	MappingKey *string   `gorm:"size:50;unique" json:"mapping_key"` // e.g., PRIMARY_BANK, SALES_REVENUE
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// JournalEntry - Header for a transaction
type JournalEntry struct {
	ID            uint          `gorm:"primaryKey" json:"id"`
	Date          time.Time     `json:"date"`
	Description   string        `json:"description"`
	ReferenceID   string        `json:"reference_id"`   // e.g., ORDER-123, ADJUST-001
	ReferenceType string        `json:"reference_type"` // ORDER, ADJUSTMENT, EXPENSE
	Items         []JournalItem `json:"items"`
	CreatedAt     time.Time     `json:"created_at"`
}

// JournalItem - Line items (Debit/Credit)
type JournalItem struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	JournalEntryID uint    `json:"journal_entry_id"`
	COAID          uint    `json:"coa_id"`
	COA            COA     `json:"coa"`
	Debit          float64 `gorm:"type:decimal(20,2);default:0" json:"debit"`
	Credit         float64 `gorm:"type:decimal(20,2);default:0" json:"credit"`
}

// Invoice - Virtual or Real Invoice for payments
type Invoice struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	InvoiceNumber  string     `gorm:"size:50;unique;not null" json:"invoice_number"` // INV-202310-001
	OrderID        *uint      `json:"order_id"`                                      // Pointer to allow null for TopUp
	Order          Order      `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	UserID         uint       `json:"user_id"` // Optional: For wallet topups without order
	User           User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type           string     `gorm:"size:20;default:'full'" json:"type"` // full, deposit, balance
	Amount         float64    `gorm:"type:decimal(20,2)" json:"amount"`
	CurrencyCode   string     `gorm:"size:3;default:'IDR'" json:"currency_code"`
	ExchangeRate   float64    `gorm:"type:decimal(20,6);default:1" json:"exchange_rate"`
	Status         string     `gorm:"default:'unpaid'" json:"status"` // unpaid, paid, cancelled
	DueDate        time.Time  `json:"due_date"`
	PaidAt         *time.Time `json:"paid_at"`
	ReminderSentAt *time.Time `json:"reminder_sent_at"` // ✅ Tracks when payment reminder email was last sent
	PaymentMethod  string     `json:"payment_method"`   // bank_transfer, etc.
	PaymentProof   string     `json:"payment_proof"`    // URL to receipt image
	PaymentNote    string     `json:"payment_note"`     // User note for payment
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// ============================================
// PAYMENT MODULE
// ============================================

type PaymentTransaction struct {
	ID                 uint           `gorm:"primaryKey" json:"id"`
	OrderID            uint           `json:"order_id"`
	InvoiceID          uint           `json:"invoice_id"`
	Invoice            Invoice        `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
	GatewayTxID        string         `gorm:"size:100" json:"gateway_tx_id"`   // Plink Ref No
	MerchantRefNo      string         `gorm:"size:100" json:"merchant_ref_no"` // Merchant Ref No
	ExternalID         string         `gorm:"size:100" json:"external_id"`     // External ID from dash
	PartnerRefNo       string         `gorm:"size:100" json:"partner_ref_no"`  // Partner Ref No
	Gateway            string         `gorm:"size:50;default:'prismalink'" json:"gateway"`
	Type               string         `gorm:"size:20;not null" json:"type"` // deposit, balance, full
	Amount             float64        `gorm:"type:decimal(20,2);not null" json:"amount"`
	Status             string         `gorm:"size:20;default:'pending'" json:"status"` // pending, success, failed, expired, refunded
	PaymentMethod      string         `gorm:"size:50" json:"payment_method"`           // bank_transfer, card, ewallet
	CallbackPayload    datatypes.JSON `json:"callback_payload"`
	CallbackReceivedAt *time.Time     `json:"callback_received_at"`
	ExpiredAt          *time.Time     `json:"expired_at"`
	RefundedAt         *time.Time     `json:"refunded_at"`
	RefundAmount       float64        `gorm:"type:decimal(20,2);default:0" json:"refund_amount"`
	SaveCard           bool           `gorm:"default:false" json:"save_card"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
}

// ============================================
// EXPENSE MODULE
// ============================================

type Expense struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Date         time.Time `json:"date"`
	Amount       float64   `gorm:"type:decimal(20,2);not null" json:"amount"`
	COAID        uint      `json:"coa_id"` // Link to expense account
	COA          COA       `json:"coa,omitempty"`
	Vendor       string    `gorm:"size:100" json:"vendor"`
	Description  string    `gorm:"type:text" json:"description"`
	Attachment   string    `gorm:"size:255" json:"attachment"` // File URL
	IsRecurring  bool      `gorm:"default:false" json:"is_recurring"`
	RecurringDay int       `gorm:"default:0" json:"recurring_day"` // Day of month for recurring
	CreatedBy    uint      `json:"created_by"`
	Creator      User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
