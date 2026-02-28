package models

import (
	"time"

	"gorm.io/datatypes"
)

type AuditLog struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    *uint          `json:"user_id"`
	User      User           `json:"user"` // Who did it
	Details   string         `gorm:"type:text" json:"details"`
	Module    string         `gorm:"size:50;index" json:"module"`     // Product, Order, Finance
	Action    string         `gorm:"size:50;index" json:"action"`     // Create, Update, Delete
	ObjectID  string         `gorm:"size:100;index" json:"object_id"` // ID of the object (e.g. Order ID string)
	OldData   datatypes.JSON `json:"old_data"`
	NewData   datatypes.JSON `json:"new_data"`
	IPAddress string         `gorm:"size:50" json:"ip_address"`
	UserAgent string         `gorm:"size:255" json:"user_agent"`
	CreatedAt time.Time      `json:"created_at"`
}
