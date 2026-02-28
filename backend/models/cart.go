package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// AbandonedCart - Tracks users who added items but didn't checkout
// This is critical for remarketing (e.g., sending email reminders)
type AbandonedCart struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	UserID       *uint          `json:"user_id"` // If logged in
	User         User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SessionID    string         `gorm:"index" json:"session_id"` // For guests (cookie based)
	Items        datatypes.JSON `json:"items"`                   // JSON snapshot of cart items
	Total        float64        `json:"total"`
	Email        string         `json:"email"`                          // Captured if user started checkout
	Status       string         `gorm:"default:'active'" json:"status"` // active, recovered, lost
	LastActivity time.Time      `json:"last_activity"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName overrides the table name
func (AbandonedCart) TableName() string {
	return "abandoned_carts"
}
