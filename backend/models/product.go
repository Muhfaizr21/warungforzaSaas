package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Category represents product category with hierarchical structure support
type Category struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Name         string     `gorm:"size:100;not null" json:"name"`
	Slug         string     `gorm:"size:100;unique;not null;index" json:"slug"`
	Description  string     `gorm:"type:text" json:"description"`
	Image        string     `json:"image"`
	ParentID     *uint      `json:"parent_id"` // For hierarchical categories (e.g., STATUE GENERAL > Prime 1 Studio)
	Parent       *Category  `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children     []Category `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	Products     []Product  `json:"products,omitempty"`
	DisplayOrder int        `gorm:"default:0" json:"display_order"` // For custom sorting
	IsActive     bool       `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type CustomFieldTemplate struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	FieldKey          string         `gorm:"size:100;unique;not null" json:"field_key"`
	Label             string         `gorm:"size:100;not null" json:"label"`
	Type              string         `gorm:"size:50;not null" json:"type"` // text, number, select, boolean
	AllowedCategories datatypes.JSON `json:"allowed_categories"`           // Optional list of category IDs
	DisplayOrder      int            `json:"display_order"`
	Required          bool           `json:"required"`
	Active            bool           `gorm:"default:true" json:"active"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

// Brand represents manufacturer/brand with optional parent for brand families
type Brand struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;unique;not null;index" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	Logo        string    `json:"logo"`
	ParentID    *uint     `json:"parent_id"` // For brand families (e.g., ACTION FIGURE GENERAL > Hot Toys)
	Parent      *Brand    `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	Children    []Brand   `gorm:"foreignKey:ParentID" json:"children,omitempty"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Product represents a collectible product with comprehensive taxonomy and metadata
type Product struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	SKU            string  `gorm:"size:100;unique;not null;index" json:"sku"`
	QRCode         string  `gorm:"size:100;unique;index" json:"qr_code"` // Unique QR identifier for POS scanning
	Name           string  `gorm:"size:255;not null" json:"name"`
	Slug           string  `gorm:"size:255;unique;not null;index" json:"slug"`
	Description    string  `gorm:"type:text" json:"description"`
	Price          float64 `gorm:"type:decimal(20,2);not null" json:"price"`
	SupplierCost   float64 `gorm:"type:decimal(20,2);default:0" json:"supplier_cost"` // COGS
	Stock          int     `gorm:"default:0" json:"stock"`
	ReservedQty    int     `gorm:"default:0" json:"reserved_qty"`              // Stock held by active reservations
	AvailableStock int     `gorm:"-" json:"available_stock"`                   // Virtual field: Stock - ReservedQty
	Weight         float64 `gorm:"type:decimal(20,2);default:0" json:"weight"` // in grams or kg
	IncomingStock  int     `gorm:"default:0" json:"incoming_stock"`            // Stock ordered from supplier but not yet physically in warehouse

	// Primary Classification
	CategoryID *uint    `json:"category_id"`
	Category   Category `json:"category"`
	BrandID    *uint    `json:"brand_id"`
	Brand      Brand    `json:"brand"`

	// Multi-dimensional Taxonomy (Many-to-Many)
	Series     []Series    `gorm:"many2many:product_series;" json:"series,omitempty"`
	Characters []Character `gorm:"many2many:product_characters;" json:"characters,omitempty"`
	Genres     []Genre     `gorm:"many2many:product_genres;" json:"genres,omitempty"`

	// Collectible-Specific Metadata
	ScaleID       *uint        `json:"scale_id"`
	Scale         *Scale       `json:"scale,omitempty"`
	MaterialID    *uint        `json:"material_id"`
	Material      *Material    `json:"material,omitempty"`
	EditionTypeID *uint        `json:"edition_type_id"`
	EditionType   *EditionType `json:"edition_type,omitempty"`

	// Edition Information
	EditionSize   *int   `json:"edition_size"`                  // Total pieces in edition (e.g., 500)
	EditionNumber string `gorm:"size:50" json:"edition_number"` // e.g., "42/500", "AP 5/10"
	LicenseInfo   string `gorm:"size:255" json:"license_info"`  // e.g., "Officially Licensed by Universal Studios"
	Artist        string `gorm:"size:255" json:"artist"`        // Sculptor/Artist name

	// Dimensions & Specifications
	Height        *float64 `gorm:"type:decimal(20,2)" json:"height"` // in cm
	Width         *float64 `gorm:"type:decimal(20,2)" json:"width"`
	Depth         *float64 `gorm:"type:decimal(20,2)" json:"depth"`
	DimensionUnit string   `gorm:"size:10;default:'cm'" json:"dimension_unit"`

	// Shipping Configuration
	AllowAir   bool           `gorm:"default:true" json:"allow_air"`
	AllowSea   bool           `gorm:"default:false" json:"allow_sea"`
	Dimensions datatypes.JSON `json:"dimensions"` // Legacy field for backward compatibility

	// Product Status
	Status        string         `gorm:"size:50;default:'draft';index" json:"status"`       // draft, active, archived
	ProductType   string         `gorm:"size:50;default:'ready';index" json:"product_type"` // ready, po
	MinStockLevel int            `gorm:"default:0" json:"min_stock_level"`                  // Threshold for alerts
	POConfig      datatypes.JSON `json:"po_config"`                                         // { \"deposit_type\": \"percent\", \"deposit_value\": 30, \"eta\": \"2023-12-01\" }
	CustomFields  datatypes.JSON `json:"custom_fields"`                                     // Flexible additional fields

	// Media
	Images   datatypes.JSON `json:"images"`    // Array of image URLs
	VideoURL string         `json:"video_url"` // YouTube/Vimeo URL for product showcase

	// Feature Flags
	IsFeatured  bool `gorm:"default:false;index" json:"is_featured"`
	IsExclusive bool `gorm:"default:false" json:"is_exclusive"` // Warung Forza exclusive
	IsLimited   bool `gorm:"default:false" json:"is_limited"`   // Limited edition

	// SEO & Marketing
	MetaTitle       string `gorm:"size:255" json:"meta_title"`
	MetaDescription string `gorm:"size:500" json:"meta_description"`
	MetaKeywords    string `gorm:"size:500" json:"meta_keywords"`

	// Timestamps
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"deleted_at"`
	ReleaseDate  *time.Time     `json:"release_date"`  // Official release date
	PreOrderDate *time.Time     `json:"preorder_date"` // When pre-orders open
}
