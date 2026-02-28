package models

import (
	"time"
)

type Wishlist struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	UserID          uint       `json:"user_id"`
	User            User       `json:"user"`
	ProductID       uint       `json:"product_id"`
	Product         Product    `json:"product"`
	NotifyOnRestock bool       `gorm:"default:true" json:"notify_on_restock"`
	Notified        bool       `gorm:"default:false" json:"notified"`
	NotifiedAt      *time.Time `json:"notified_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
