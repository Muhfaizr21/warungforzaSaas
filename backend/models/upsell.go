package models

// ProductUpsell holds the upsell/cross-sell relationship between products
// Admin can specify which products to recommend alongside a given product
type ProductUpsell struct {
	ProductID uint    `gorm:"primaryKey;index" json:"product_id"`
	UpsellID  uint    `gorm:"primaryKey;index" json:"upsell_id"`
	SortOrder int     `gorm:"default:0" json:"sort_order"`
	Type      string  `gorm:"size:20;default:'upsell'" json:"type"` // 'upsell' or 'crosssell'
	Upsell    Product `gorm:"foreignKey:UpsellID" json:"upsell,omitempty"`
}
