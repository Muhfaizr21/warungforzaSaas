package models

import (
	"time"

	"gorm.io/gorm"
)

type BlogPost struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	Title           string     `gorm:"size:255;not null" json:"title"`
	Slug            string     `gorm:"size:255;unique;not null;index" json:"slug"`
	Content         string     `gorm:"type:text" json:"content"`
	Excerpt         string     `gorm:"type:text" json:"excerpt"`
	FeaturedImage   string     `gorm:"size:255" json:"featured_image"`
	MetaDescription string     `gorm:"size:255" json:"meta_description"`
	AuthorID        uint       `json:"author_id"`
	Author          User       `gorm:"foreignKey:AuthorID" json:"author"`
	Status          string     `gorm:"size:50;default:'draft';index" json:"status"` // draft, published
	Tags            string     `gorm:"size:255" json:"tags"`                        // Comma separated tags used for simple search/filtering
	PublishDate     *time.Time `json:"publish_date"`                                // Optional future publishing
}
