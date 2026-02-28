package models

import (
	"time"
)

// Series represents franchise/series taxonomy (e.g., Jurassic Series, DC Series, Transformers)
type Series struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;unique;not null;index" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	Image       string    `json:"image"`
	Products    []Product `gorm:"many2many:product_series;" json:"products,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Character represents character taxonomy (e.g., Batman, Guts, Optimus Prime)
type Character struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;unique;not null;index" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	Image       string    `json:"image"`
	SeriesID    *uint     `json:"series_id"` // Optional: character belongs to a series
	Series      *Series   `json:"series,omitempty"`
	Products    []Product `gorm:"many2many:product_characters;" json:"products,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Genre represents content genre (Comics, Video Games, Movie & TV, Anime & Manga)
type Genre struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;unique;not null;index" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	Image       string    `json:"image"`
	Products    []Product `gorm:"many2many:product_genres;" json:"products,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ProductScale represents scale information (1/6, 1/4, 1/3, etc)
type Scale struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:50;unique;not null" json:"name"` // e.g., "1/6", "1/4", "1/3"
	Slug      string    `gorm:"size:50;unique;index" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Material represents product material (Polystone, PVC, Resin, etc)
type Material struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:50;unique;not null" json:"name"`
	Slug      string    `gorm:"size:50;unique;index" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// EditionType represents edition classification (Standard, Deluxe, Limited, Exclusive)
type EditionType struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:50;unique;not null" json:"name"`
	Slug      string    `gorm:"size:50;unique;index" json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
