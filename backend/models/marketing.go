package models

import (
	"time"

	"gorm.io/datatypes"
)

type NotificationLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `json:"user_id"`
	Type      string    `gorm:"size:50" json:"type"` // e.g., RESTOCK_ALERT
	Channel   string    `gorm:"size:50;default:'email'" json:"channel"`
	Subject   string    `json:"subject"`
	Status    string    `gorm:"size:20" json:"status"`     // sent, failed
	Metadata  string    `gorm:"type:text" json:"metadata"` // JSON string
	IsRead    bool      `gorm:"default:false" json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}

// ============================================
// ANNOUNCEMENT MODULE
// ============================================

type Announcement struct {
	ID           uint                    `gorm:"primaryKey" json:"id"`
	Title        string                  `gorm:"size:100;not null" json:"title"`
	Content      string                  `gorm:"type:text;not null" json:"content"`
	Images       datatypes.JSON          `json:"images"`                                   // Array of image URLs
	Category     string                  `gorm:"size:50;not null" json:"category"`         // DELAY, CANCEL, PROMO, INFO
	TargetType   string                  `gorm:"size:50;default:'all'" json:"target_type"` // all, products, orders
	TargetIDs    datatypes.JSON          `json:"target_ids"`                               // Array of product/order IDs if targeted
	IsPinned     bool                    `gorm:"default:false" json:"is_pinned"`
	PublishStart *time.Time              `json:"publish_start"`
	PublishEnd   *time.Time              `json:"publish_end"`
	Status       string                  `gorm:"size:20;default:'draft'" json:"status"` // draft, published, archived
	CreatedBy    uint                    `json:"created_by"`
	Creator      User                    `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Broadcasts   []AnnouncementBroadcast `json:"broadcasts,omitempty"`
	CreatedAt    time.Time               `json:"created_at"`
	UpdatedAt    time.Time               `json:"updated_at"`
}

type AnnouncementBroadcast struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	AnnouncementID uint       `json:"announcement_id"`
	UserID         uint       `json:"user_id"`
	User           User       `json:"user,omitempty"`
	Status         string     `gorm:"size:20;default:'pending'" json:"status"` // pending, sent, failed
	SentAt         *time.Time `json:"sent_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

// ============================================
// NEWSLETTER MODULE
// ============================================

type NewsletterSubscriber struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	UserID         *uint          `json:"user_id"` // Optional link to user
	Email          string         `gorm:"size:255;unique;not null" json:"email"`
	Status         string         `gorm:"size:20;default:'subscribed'" json:"status"` // subscribed, unsubscribed, bounced
	Segments       datatypes.JSON `json:"segments"`                                   // Array of segment tags
	SubscribedAt   time.Time      `json:"subscribed_at"`
	UnsubscribedAt *time.Time     `json:"unsubscribed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type NewsletterCampaign struct {
	ID            uint            `gorm:"primaryKey" json:"id"`
	Name          string          `gorm:"size:100;not null" json:"name"`
	Subject       string          `gorm:"size:255;not null" json:"subject"`
	Content       string          `gorm:"type:text;not null" json:"content"`
	TargetSegment string          `gorm:"size:50" json:"target_segment"`         // all, po_customers, wishlist_joiners
	Status        string          `gorm:"size:20;default:'draft'" json:"status"` // draft, scheduled, sending, sent, cancelled
	ScheduledAt   *time.Time      `json:"scheduled_at"`
	SentAt        *time.Time      `json:"sent_at"`
	SentCount     int             `gorm:"default:0" json:"sent_count"`
	FailedCount   int             `gorm:"default:0" json:"failed_count"`
	UTMSource     string          `gorm:"size:100" json:"utm_source"`
	UTMMedium     string          `gorm:"size:100" json:"utm_medium"`
	UTMCampaign   string          `gorm:"size:100" json:"utm_campaign"`
	CreatedBy     uint            `json:"created_by"`
	Creator       User            `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Logs          []NewsletterLog `gorm:"foreignKey:CampaignID" json:"logs,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

type NewsletterLog struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	CampaignID   uint       `gorm:"index" json:"campaign_id"`
	SubscriberID uint       `gorm:"index" json:"subscriber_id"`
	Email        string     `gorm:"size:255" json:"email"`
	Status       string     `gorm:"size:20" json:"status"` // sent, delivered, failed, bounced
	SentAt       *time.Time `json:"sent_at"`
	OpenedAt     *time.Time `json:"opened_at"`
	ClickedAt    *time.Time `json:"clicked_at"`
	ErrorMessage string     `gorm:"size:255" json:"error_message"`
	CreatedAt    time.Time  `json:"created_at"`
}
