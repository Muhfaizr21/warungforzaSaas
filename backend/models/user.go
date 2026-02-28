package models

import (
	"time"

	"gorm.io/datatypes"
)

const (
	RoleSuperAdmin = "super_admin"
	RoleAdmin      = "admin"
	RoleStaff      = "staff"
	RoleReseller   = "reseller"
	RoleUser       = "user" // Regular customer
)

type Role struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	Name        string       `gorm:"size:50;unique;not null" json:"name"` // Super Admin, Product Admin, etc.
	Slug        string       `gorm:"size:50;unique;not null" json:"slug"` // super_admin, product_admin
	Description string       `gorm:"size:255" json:"description"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type Permission struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`        // e.g., "Edit Product"
	Slug        string    `gorm:"size:100;unique;not null" json:"slug"` // e.g., "product.edit"
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type User struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Username    string    `gorm:"size:100;unique;not null" json:"username"`
	Email       string    `gorm:"size:255;unique;not null" json:"email"`
	Password    string    `gorm:"size:255;not null" json:"-"`
	FullName    string    `gorm:"size:255" json:"full_name"`
	Phone       string    `gorm:"size:20" json:"phone"`
	Status      string    `gorm:"size:20;default:'active'" json:"status"` // active, inactive
	GoogleID    *string   `gorm:"size:255;unique;index" json:"google_id"` // OAuth Provider ID
	RoleID      uint      `json:"role_id"`
	Role        Role      `gorm:"foreignKey:RoleID" json:"role"`
	OrdersCount int64     `gorm:"->" json:"orders_count"` // Virtual field for subqueries
	TotalSpent  float64   `gorm:"->" json:"total_spent"`  // Virtual field for LTV
	Balance     float64   `gorm:"type:decimal(15,2);default:0" json:"balance"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ============================================
// CUSTOMER PROFILE EXTENSION
// ============================================

type CustomerProfile struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	UserID        uint           `gorm:"unique;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user_id"`
	User          User           `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"user,omitempty"`
	Phone         string         `gorm:"size:20" json:"phone"`
	Address       datatypes.JSON `json:"address"`                // Default shipping address
	Addresses     datatypes.JSON `json:"addresses"`              // Array of saved addresses
	Notes         string         `gorm:"type:text" json:"notes"` // Internal notes from CS
	NewsletterSub bool           `gorm:"default:false" json:"newsletter_sub"`
	RestockNotify bool           `gorm:"default:true" json:"restock_notify"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}
