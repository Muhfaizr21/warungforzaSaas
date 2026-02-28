package services

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ProductService struct {
	DB *gorm.DB
}

func NewProductService() *ProductService {
	return &ProductService{
		DB: config.DB,
	}
}

type ProductInput struct {
	Name         string                 `json:"name"`
	SKU          string                 `json:"sku"`
	Description  string                 `json:"description"`
	Price        float64                `json:"price"`
	SupplierCost float64                `json:"supplier_cost"`
	Stock        *int                   `json:"stock"` // Ptr to distinguish 0
	Weight       float64                `json:"weight"`
	AllowAir     bool                   `json:"allow_air"`
	AllowSea     bool                   `json:"allow_sea"`
	Dimensions   map[string]interface{} `json:"dimensions"`
	Status       string                 `json:"status"`
	ProductType  string                 `json:"product_type"`
	POConfig     map[string]interface{} `json:"po_config"`
	CustomFields map[string]interface{} `json:"custom_fields"`
	CategoryName string                 `json:"category"`
	BrandName    string                 `json:"brand"`
	Images       []string               `json:"images"`
	SeriesIDs    []uint                 `json:"series_ids"`
	CharacterIDs []uint                 `json:"character_ids"`
	GenreIDs     []uint                 `json:"genre_ids"`
	// Premium Fields
	ScaleID       *uint    `json:"scale_id"`
	MaterialID    *uint    `json:"material_id"`
	EditionTypeID *uint    `json:"edition_type_id"`
	EditionSize   *int     `json:"edition_size"`
	EditionNumber string   `json:"edition_number"`
	LicenseInfo   string   `json:"license_info"`
	Artist        string   `json:"artist"`
	Height        *float64 `json:"height"`
	Width         *float64 `json:"width"`
	Depth         *float64 `json:"depth"`
	VideoURL      string   `json:"video_url"`
	IsExclusive   bool     `json:"is_exclusive"`
	IsLimited     bool     `json:"is_limited"`
	IsFeatured    bool     `json:"is_featured"`
	MinStockLevel int      `json:"min_stock_level"`
}

// CreateProduct encapsulates detailed creation logic
func (s *ProductService) CreateProduct(input ProductInput, currentUserID uint) (*models.Product, error) {
	// 1. Validations
	if input.Name == "" || input.SKU == "" || input.Price <= 0 {
		return nil, fmt.Errorf("name, sku, and price are required")
	}
	// Weight WAJIB > 0 jika status = active (Biteship requirement)
	if input.Status == "active" && input.Weight <= 0 {
		return nil, fmt.Errorf("berat produk (weight) wajib diisi sebelum produk bisa diaktifkan. Biteship membutuhkan data berat untuk kalkulasi ongkir")
	}

	// SKU Uniqueness
	var count int64
	s.DB.Model(&models.Product{}).Where("sku = ?", input.SKU).Count(&count)
	if count > 0 {
		return nil, fmt.Errorf("sku already exists")
	}

	// PO Validation
	if input.ProductType == "po" {
		if err := s.validatePOConfig(input.POConfig, input.Price); err != nil {
			return nil, err
		}
	}

	stockVal := 0
	if input.Stock != nil {
		stockVal = *input.Stock
	}

	// Helper to marshal JSON safely
	marshalJSON := func(v interface{}) datatypes.JSON {
		if v == nil {
			return datatypes.JSON("null")
		}
		b, _ := json.Marshal(v)
		return datatypes.JSON(b)
	}

	product := models.Product{
		Name:         input.Name,
		SKU:          input.SKU,
		Description:  input.Description,
		Price:        input.Price,
		SupplierCost: input.SupplierCost,
		Stock:        stockVal,
		Weight:       input.Weight,
		AllowAir:     input.AllowAir,
		AllowSea:     input.AllowSea,
		Dimensions:   marshalJSON(input.Dimensions),
		Status:       input.Status,
		ProductType:  input.ProductType,
		POConfig:     marshalJSON(input.POConfig),
		CustomFields: marshalJSON(input.CustomFields),
		Images:       marshalJSON(input.Images),
		// Premium Fields
		ScaleID:       input.ScaleID,
		MaterialID:    input.MaterialID,
		EditionTypeID: input.EditionTypeID,
		EditionSize:   input.EditionSize,
		EditionNumber: input.EditionNumber,
		LicenseInfo:   input.LicenseInfo,
		Artist:        input.Artist,
		Height:        input.Height,
		Width:         input.Width,
		Depth:         input.Depth,
		VideoURL:      input.VideoURL,
		IsExclusive:   input.IsExclusive,
		IsLimited:     input.IsLimited,
		IsFeatured:    input.IsFeatured,
		MinStockLevel: input.MinStockLevel,
	}

	if product.Status == "" {
		product.Status = "draft"
	}

	// Handle Category/Brand
	product.CategoryID = s.getOrCreateCategory(input.CategoryName)
	product.BrandID = s.getOrCreateBrand(input.BrandName)

	// Relations (Many-to-Many) - Need to fetch first
	if len(input.SeriesIDs) > 0 {
		var list []models.Series
		s.DB.Where("id IN ?", input.SeriesIDs).Find(&list)
		product.Series = list
	}
	if len(input.CharacterIDs) > 0 {
		var list []models.Character
		s.DB.Where("id IN ?", input.CharacterIDs).Find(&list)
		product.Characters = list
	}
	if len(input.GenreIDs) > 0 {
		var list []models.Genre
		s.DB.Where("id IN ?", input.GenreIDs).Find(&list)
		product.Genres = list
	}

	// Slug & QR
	product.Slug = s.generateUniqueSlug(product.Name)

	qrBytes := make([]byte, 4)
	rand.Read(qrBytes)
	product.QRCode = fmt.Sprintf("FZ-%s-%s", strings.ToUpper(product.SKU), hex.EncodeToString(qrBytes))

	if err := s.DB.Create(&product).Error; err != nil {
		return nil, err
	}

	// Log Stock
	if product.Stock > 0 {
		helpers.RecordStockMovement(s.DB, product.ID, product.Stock, "physical", "adjustment", "MANUAL", "INITIAL", "Initial stock setup", &currentUserID)
	}

	helpers.LogAuditSimple(currentUserID, "Product", "CREATE", product.ID, "Created product: "+product.Name)

	return &product, nil
}

// UpdateProduct updates existing product
func (s *ProductService) UpdateProduct(id uint, input ProductInput, currentUserID uint) (*models.Product, error) {
	var product models.Product
	if err := s.DB.Preload("Series").Preload("Characters").Preload("Genres").First(&product, id).Error; err != nil {
		return nil, fmt.Errorf("product not found")
	}

	oldStock := product.Stock

	// Validations
	// Weight WAJIB > 0 jika status = active (Biteship requirement)
	if input.Status == "active" && input.Weight <= 0 {
		return nil, fmt.Errorf("berat produk (weight) wajib diisi sebelum produk bisa diaktifkan. Biteship membutuhkan data berat untuk kalkulasi ongkir")
	}
	if input.ProductType == "po" {
		if err := s.validatePOConfig(input.POConfig, input.Price); err != nil {
			return nil, err
		}
	}

	marshalJSON := func(v interface{}) datatypes.JSON {
		if v == nil {
			return datatypes.JSON("null")
		}
		b, _ := json.Marshal(v)
		return datatypes.JSON(b)
	}

	// Apply Updates (Naive full update for simplicity based on controller logic)
	if input.Name != "" {
		product.Name = input.Name
	}
	if input.SKU != "" {
		product.SKU = input.SKU
	} // Should check uniqueness if changed
	product.Description = input.Description
	product.Price = input.Price
	product.SupplierCost = input.SupplierCost
	if input.Stock != nil {
		product.Stock = *input.Stock
	}
	product.Weight = input.Weight
	product.AllowAir = input.AllowAir
	product.AllowSea = input.AllowSea
	product.Dimensions = marshalJSON(input.Dimensions)
	product.Status = input.Status
	product.ProductType = input.ProductType
	product.POConfig = marshalJSON(input.POConfig)
	product.CustomFields = marshalJSON(input.CustomFields)
	product.Images = marshalJSON(input.Images)

	product.ScaleID = input.ScaleID
	product.MaterialID = input.MaterialID
	product.EditionTypeID = input.EditionTypeID
	product.EditionSize = input.EditionSize
	product.EditionNumber = input.EditionNumber
	product.LicenseInfo = input.LicenseInfo
	product.Artist = input.Artist
	product.Height = input.Height
	product.Width = input.Width
	product.Depth = input.Depth
	product.VideoURL = input.VideoURL
	product.IsExclusive = input.IsExclusive
	product.IsLimited = input.IsLimited
	product.IsFeatured = input.IsFeatured
	product.MinStockLevel = input.MinStockLevel

	// Handle Category/Brand
	if input.CategoryName != "" {
		product.CategoryID = s.getOrCreateCategory(input.CategoryName)
	}
	if input.BrandName != "" {
		product.BrandID = s.getOrCreateBrand(input.BrandName)
	}

	// Updating Relations using Replace
	s.DB.Model(&product).Association("Series").Replace(s.getEntities("models.Series", input.SeriesIDs))
	s.DB.Model(&product).Association("Characters").Replace(s.getEntities("models.Character", input.CharacterIDs))
	s.DB.Model(&product).Association("Genres").Replace(s.getEntities("models.Genre", input.GenreIDs))

	if err := s.DB.Save(&product).Error; err != nil {
		return nil, err
	}

	// Log Stock Adjustment
	if oldStock != product.Stock {
		diff := product.Stock - oldStock
		helpers.RecordStockMovement(s.DB, product.ID, diff, "physical", "adjustment", "MANUAL", "UPDATE", "Manual adjustment via dashboard", &currentUserID)
	}

	helpers.LogAuditSimple(currentUserID, "Product", "UPDATE", product.ID, "Updated product: "+product.Name)

	return &product, nil
}

// Internal Helpers

func (s *ProductService) validatePOConfig(config map[string]interface{}, price float64) error {
	if config == nil {
		return fmt.Errorf("PO Config is required for Pre-Order")
	}
	depositType, _ := config["deposit_type"].(string)
	depositValue, _ := config["deposit_value"].(string)

	var depVal float64
	if val, ok := config["deposit_value"].(float64); ok {
		depVal = val
	} else if depositValue != "" {
		fmt.Sscanf(depositValue, "%f", &depVal)
	}

	if depositType == "" || depVal <= 0 {
		return fmt.Errorf("PO requires valid deposit type and value")
	}
	if depositType == "fixed" && depVal > price {
		return fmt.Errorf("deposit amount cannot exceed product price")
	}
	return nil
}

func (s *ProductService) getOrCreateCategory(name string) *uint {
	if name == "" {
		return nil
	}
	var cat models.Category
	slug := helpers.GenerateSlug(name)
	if err := s.DB.Where("slug = ?", slug).First(&cat).Error; err != nil {
		cat = models.Category{Name: name, Slug: slug}
		s.DB.Create(&cat)
	}
	return &cat.ID
}

func (s *ProductService) getOrCreateBrand(name string) *uint {
	if name == "" {
		return nil
	}
	var br models.Brand
	slug := helpers.GenerateSlug(name)
	if err := s.DB.Where("slug = ?", slug).First(&br).Error; err != nil {
		br = models.Brand{Name: name, Slug: slug}
		s.DB.Create(&br)
	}
	return &br.ID
}

func (s *ProductService) generateUniqueSlug(name string) string {
	baseSlug := helpers.GenerateSlug(name)
	finalSlug := baseSlug
	counter := 1
	for {
		var check models.Product
		if err := s.DB.Where("slug = ?", finalSlug).First(&check).Error; err != nil {
			break
		}
		finalSlug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}
	return finalSlug
}

func (s *ProductService) getEntities(modelName string, ids []uint) interface{} {
	if len(ids) == 0 {
		return nil
	}
	switch modelName {
	case "models.Series":
		var list []models.Series
		s.DB.Where("id IN ?", ids).Find(&list)
		return list
	case "models.Character":
		var list []models.Character
		s.DB.Where("id IN ?", ids).Find(&list)
		return list
	case "models.Genre":
		var list []models.Genre
		s.DB.Where("id IN ?", ids).Find(&list)
		return list
	}
	return nil
}
