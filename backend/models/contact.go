package models

import (
	"time"

	"gorm.io/gorm"
)

type ContactMessage struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	Name    string `gorm:"size:255;not null" json:"name"`
	Email   string `gorm:"size:255;not null" json:"email"`
	Message string `gorm:"type:text;not null" json:"message"`
	Status  string `gorm:"size:50;default:'unread'" json:"status"` // unread, read, replied
}
