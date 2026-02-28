package models

import (
	"time"
)

type VerificationCode struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"size:255;not null;index" json:"email"`
	Code      string    `gorm:"size:6;not null" json:"code"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
