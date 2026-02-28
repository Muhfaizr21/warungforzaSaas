package models

import "time"

type Currency struct {
	Code         string    `gorm:"primaryKey;size:3" json:"code"` // USD, IDR, SGD
	Name         string    `gorm:"size:50;not null" json:"name"`
	Symbol       string    `gorm:"size:10;not null" json:"symbol"`                             // $, Rp
	ExchangeRate float64   `gorm:"type:decimal(16,6);not null;default:1" json:"exchange_rate"` // Rate relative to Base Currency
	IsBase       bool      `gorm:"default:false" json:"is_base"`
	UpdatedAt    time.Time `json:"updated_at"`
}
