package models

import (
	"time"
)

// ============================================
// CARRIER TRACKING URL TEMPLATES
// ============================================

type CarrierTemplate struct {
	ID                  uint             `gorm:"primaryKey" json:"id"`
	Name                string           `gorm:"size:50;unique;not null" json:"name"`                   // JNE, J&T, Sicepat
	TrackingURLTemplate string           `gorm:"size:255;not null" json:"tracking_url_template"`        // https://jne.co.id/track/{tracking}
	BiteshipCode        string           `gorm:"size:50" json:"biteship_code"`                          // "jne", "sicepat", "jnt"
	FallbackRate        float64          `gorm:"type:decimal(10,2);default:20000" json:"fallback_rate"` // Fallback ongkir per-kg jika Biteship gagal
	Active              bool             `gorm:"default:true" json:"active"`
	Services            []CarrierService `gorm:"foreignKey:CarrierID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"services"`
	CreatedAt           time.Time        `json:"created_at"`
	UpdatedAt           time.Time        `json:"updated_at"`
}

// CarrierService allows managing specific courier services like Express, Regular, Same Day
type CarrierService struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CarrierID   uint      `json:"carrier_id"`
	ServiceCode string    `gorm:"size:50;not null" json:"service_code"` // e.g. "sam" (Same Day), "reg" (Regular)
	Name        string    `gorm:"size:100;not null" json:"name"`        // e.g. "JNE Regular"
	Description string    `gorm:"size:255" json:"description"`          // e.g. "On Demand Instant (bike) (1 - 3 hours)"
	Active      bool      `gorm:"default:true" json:"active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ============================================
// INTERNATIONAL WOOCOMMERCE-STYLE SHIPPING
// ============================================

// ShippingZone represents a geographic region for shipping rates.
type ShippingZone struct {
	ID          uint             `gorm:"primaryKey" json:"id"`
	Name        string           `gorm:"size:100;not null" json:"name"` // "Asia", "North America", "Rest of World"
	Countries   string           `gorm:"type:text" json:"countries"`    // JSON Array: '["MY", "SG", "US"]'
	PostalCodes string           `gorm:"type:text" json:"postal_codes"` // '10001, 10002, 20000-29999'
	IsActive    bool             `gorm:"default:true" json:"is_active"`
	Methods     []ShippingMethod `gorm:"foreignKey:ZoneID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"methods"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// ShippingMethod provides the rule to calculate the cost.
type ShippingMethod struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	ZoneID      uint         `json:"zone_id"`
	Zone        ShippingZone `gorm:"foreignKey:ZoneID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
	Name        string       `gorm:"size:100;not null" json:"name"`                  // "Standard Sea Freight", "Express Air"
	CourierType string       `gorm:"size:50;not null" json:"courier_type"`           // "AIR", "SHIP"
	CalcType    string       `gorm:"size:50;not null" json:"calc_type"`              // "flat", "per_kg", "free_shipping", "api"
	Rate        float64      `gorm:"type:decimal(15,2)" json:"rate"`                 // Base price / per kg price (e.g., 15.00)
	MinWeight   float64      `gorm:"type:decimal(10,2);default:1" json:"min_weight"` // Minimum weight for calculation (e.g., 1kg)
	MinSubtotal float64      `gorm:"type:decimal(15,2)" json:"min_subtotal"`         // If free shipping needs a min
	EtaText     string       `gorm:"size:100" json:"eta_text"`                       // "14-30 Business Days"
	IsActive    bool         `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}
