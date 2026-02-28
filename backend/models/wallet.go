package models

import (
	"time"
)

// WalletTransaction - Records all balance changes
type WalletTransaction struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"not null;index" json:"user_id"`
	User          User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Type          string    `gorm:"size:20;not null" json:"type"` // credit (topup), debit (payment), refund
	Amount        float64   `gorm:"type:decimal(20,2);not null" json:"amount"`
	Description   string    `gorm:"size:255" json:"description"`
	ReferenceID   string    `gorm:"size:100;index" json:"reference_id"` // Invoice Number or Order ID
	ReferenceType string    `gorm:"size:50" json:"reference_type"`      // invoice, order, manual
	BalanceBefore float64   `gorm:"type:decimal(20,2)" json:"balance_before"`
	BalanceAfter  float64   `gorm:"type:decimal(20,2)" json:"balance_after"`
	CreatedAt     time.Time `json:"created_at"`
}
