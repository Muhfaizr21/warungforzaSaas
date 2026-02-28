package models

import (
	"time"
)

type PasswordReset struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"size:255;not null;index" json:"email"`
	Code      string    `gorm:"size:6;not null" json:"code"`    // 6-digit OTP
	Token     string    `gorm:"size:255;not null" json:"token"` // Secure token for verification link
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}
