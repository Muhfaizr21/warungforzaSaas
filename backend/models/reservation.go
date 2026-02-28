package models

import (
	"time"
)

// ReservationStatus represents the state of a stock reservation
type ReservationStatus string

const (
	ReservationReserved ReservationStatus = "reserved" // Stock is held for customer
	ReservationConsumed ReservationStatus = "consumed" // Payment successful, stock deducted
	ReservationReleased ReservationStatus = "released" // Manually released
	ReservationExpired  ReservationStatus = "expired"  // Timeout, auto-released
)

// StockReservation tracks stock holds during checkout process
type StockReservation struct {
	ID        uint              `gorm:"primaryKey" json:"id"`
	OrderID   uint              `gorm:"index" json:"order_id"`
	Order     *Order            `json:"order,omitempty"`
	ProductID uint              `gorm:"index;not null" json:"product_id"`
	Product   *Product          `json:"product,omitempty"`
	Quantity  int               `gorm:"not null" json:"quantity"`
	Status    ReservationStatus `gorm:"size:20;default:'reserved';index" json:"status"`
	ExpiresAt time.Time         `gorm:"index" json:"expires_at"`
	CreatedAt time.Time         `json:"created_at"`
	UpdatedAt time.Time         `json:"updated_at"`

	// Audit fields
	ConsumedAt *time.Time `json:"consumed_at,omitempty"`
	ReleasedAt *time.Time `json:"released_at,omitempty"`
	ReleasedBy string     `gorm:"size:50" json:"released_by,omitempty"` // "system", "user", "admin"
}

// IsExpired checks if the reservation has passed its expiration time
func (r *StockReservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

// IsActive checks if reservation is still holding stock
func (r *StockReservation) IsActive() bool {
	return r.Status == ReservationReserved && !r.IsExpired()
}

// TimeRemaining returns duration until expiration
func (r *StockReservation) TimeRemaining() time.Duration {
	if r.IsExpired() {
		return 0
	}
	return time.Until(r.ExpiresAt)
}

// ReservationConfig holds settings for the reservation system
type ReservationConfig struct {
	// DefaultTTL is the default time-to-live for reservations (e.g., 15 minutes)
	DefaultTTL time.Duration
	// MaxTTL is the maximum allowed TTL
	MaxTTL time.Duration
	// CleanupInterval is how often to check for expired reservations
	CleanupInterval time.Duration
}

// DefaultReservationConfig returns sensible defaults
func DefaultReservationConfig() ReservationConfig {
	return ReservationConfig{
		DefaultTTL:      15 * time.Minute,
		MaxTTL:          30 * time.Minute,
		CleanupInterval: 1 * time.Minute,
	}
}
