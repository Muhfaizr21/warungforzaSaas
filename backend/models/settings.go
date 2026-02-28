package models

import (
	"time"
)

type Setting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `gorm:"size:100;unique;not null" json:"key"` // prismalink_api_key, smtp_host, etc.
	Value     string    `gorm:"type:text" json:"value"`
	Group     string    `gorm:"size:50;default:'general'" json:"group"` // payment, email, shipping
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ShippingRate struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Zone            string    `gorm:"size:100;not null" json:"zone"`  // DOMESTIC, ASIA, INTERNATIONAL
	Country         string    `gorm:"size:100" json:"country"`        // Specific countries like JP, US, SG or empty for all
	Region          string    `gorm:"size:100" json:"region"`         // e.g., ASEAN, EUROPE, NORTH_AMERICA
	Method          string    `gorm:"size:50;not null" json:"method"` // AIR, SEA
	BaseCost        float64   `gorm:"type:decimal(10,2);default:0" json:"base_cost"`
	CostPerKg       float64   `gorm:"type:decimal(10,2);default:0" json:"cost_per_kg"`
	MinChargeWeight float64   `gorm:"type:decimal(10,2);default:0" json:"min_charge_weight"`
	MaxWeight       float64   `gorm:"type:decimal(10,2);default:0" json:"max_weight"` // 0 = unlimited
	EstDaysMin      int       `gorm:"default:1" json:"est_days_min"`                  // Min estimated delivery days
	EstDaysMax      int       `gorm:"default:7" json:"est_days_max"`                  // Max estimated delivery days
	Active          bool      `gorm:"default:true" json:"active"`
	DisplayOrder    int       `gorm:"default:0" json:"display_order"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
