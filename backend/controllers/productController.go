package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// GetProductStats - Get product statistics
func GetProductStats(c *gin.Context) {
	var total int64
	var active int64
	var draft int64
	var preOrder int64
	var readyStock int64
	var outOfStock int64

	// Total
	config.DB.Model(&models.Product{}).Count(&total)

	// Active
	config.DB.Model(&models.Product{}).Where("status = ?", "active").Count(&active)

	// Draft
	config.DB.Model(&models.Product{}).Where("status = ?", "draft").Count(&draft)

	// Pre-Order
	config.DB.Model(&models.Product{}).Where("product_type = ?", "po").Count(&preOrder)

	// Ready Stock
	config.DB.Model(&models.Product{}).Where("product_type != ? OR product_type IS NULL OR product_type = ''", "po").Count(&readyStock)

	// Out of Stock (Stock - Reserved <= 0) for BOTH Ready Stock and Pre-Order items
	// Pre-Order items that have hit their max quota (stock limit) are also considered 'Out of Stock'
	config.DB.Model(&models.Product{}).
		Where("(stock - reserved_qty) <= 0").
		Count(&outOfStock)

	c.JSON(http.StatusOK, gin.H{
		"total":        total,
		"active":       active,
		"draft":        draft,
		"preorder":     preOrder,
		"ready_stock":  readyStock,
		"out_of_stock": outOfStock,
	})
}

// GetProducts - List all products
func GetProducts(c *gin.Context) {
	// 1. CACHE CHECK (Public only)
	if !strings.HasPrefix(c.Request.URL.Path, "/api/admin") {
		cacheKey := "products:" + c.Request.URL.RequestURI()
		if cachedData, found := helpers.Cache.Get(cacheKey); found {
			c.JSON(http.StatusOK, cachedData)
			return
		}
	}

	var products []models.Product

	// Start with the Product model for proper type safety and session management
	query := config.DB.Model(&models.Product{}).
		Preload("Category.Parent").
		Preload("Category").
		Preload("Brand").
		Preload("Series").
		Preload("Characters").
		Preload("Genres")

	// Filter by Search Query (Name or SKU)
	if search := c.Query("search"); search != "" {
		cleanSearch := "%" + strings.ReplaceAll(search, " ", "") + "%"
		searchTerm := "%" + search + "%"
		query = query.Where("REPLACE(products.name, ' ', '') ILIKE ? OR products.sku ILIKE ? OR products.name ILIKE ?", cleanSearch, searchTerm, searchTerm)
	}

	// Filter by Category Slug
	if categorySlug := c.Query("category"); categorySlug != "" {
		query = query.Joins("JOIN categories ON categories.id = products.category_id").
			Where("categories.slug = ? OR categories.name ILIKE ?", categorySlug, categorySlug)
	}

	// Filter by Series Slug (Many-to-Many)
	if seriesSlug := c.Query("series"); seriesSlug != "" {
		// Use a subquery or join to filter products that have this series
		query = query.Where("id IN (SELECT product_id FROM product_series JOIN series ON series.id = product_series.series_id WHERE series.slug = ? OR series.name ILIKE ?)", seriesSlug, seriesSlug)
	}

	// Filter by Character Slug (Many-to-Many)
	if characterSlug := c.Query("character"); characterSlug != "" {
		query = query.Where("id IN (SELECT product_id FROM product_characters JOIN characters ON characters.id = product_characters.character_id WHERE characters.slug = ?)", characterSlug)
	}

	// Filter by Genre Slug (Many-to-Many)
	if genreSlug := c.Query("genre"); genreSlug != "" {
		query = query.Where("id IN (SELECT product_id FROM product_genres JOIN genres ON genres.id = product_genres.genre_id WHERE genres.slug = ?)", genreSlug)
	}

	// Filter by Scale Slug (One-to-Many)
	if scaleSlug := c.Query("scale"); scaleSlug != "" {
		query = query.Joins("JOIN scales ON scales.id = products.scale_id").
			Where("scales.slug = ?", scaleSlug)
	}

	// Filter by Material Slug (One-to-Many)
	if materialSlug := c.Query("material"); materialSlug != "" {
		query = query.Joins("JOIN materials ON materials.id = products.material_id").
			Where("materials.slug = ?", materialSlug)
	}

	// Filter by Edition Type Slug (One-to-Many)
	if editionTypeSlug := c.Query("edition_type"); editionTypeSlug != "" {
		query = query.Joins("JOIN edition_types ON edition_types.id = products.edition_type_id").
			Where("edition_types.slug = ?", editionTypeSlug)
	}

	// Filter by Status
	if status := c.Query("status"); status != "" {
		query = query.Where("products.status = ?", status)
	}

	// Filter by Brand Slug
	if brandSlug := c.Query("brand"); brandSlug != "" {
		query = query.Joins("JOIN brands ON brands.id = products.brand_id").
			Where("brands.slug = ? OR brands.name ILIKE ?", brandSlug, brandSlug)
	}

	// Filter by Product Type
	if pType := c.Query("product_type"); pType != "" {
		query = query.Where("products.product_type = ?", pType)
	}

	// Filter by Stock Status (Real-time logical calculation)
	if stockStatus := c.Query("stock_status"); stockStatus == "outofstock" {
		query = query.Where("(products.stock - products.reserved_qty) <= 0")
	}

	// Filter by Featured
	if featured := c.Query("is_featured"); featured == "true" {
		query = query.Where("products.is_featured = ?", true)
	}

	// Filter by Price Range
	if minPrice := c.Query("min_price"); minPrice != "" {
		query = query.Where("products.price >= ?", minPrice)
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		query = query.Where("products.price <= ?", maxPrice)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Count(&total)

	// Sorting
	sort := c.Query("sort")
	orderClause := "products.created_at DESC"
	switch sort {
	case "price_asc":
		orderClause = "products.price ASC"
	case "price_desc":
		orderClause = "products.price DESC"
	case "oldest":
		orderClause = "products.created_at ASC"
	}

	// Fetch with distinct and order
	if err := query.Distinct("products.*").Order(orderClause).Limit(limit).Offset(offset).Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products", "details": err.Error()})
		return
	}

	// Return empty array instead of null
	if products == nil {
		products = []models.Product{}
	}

	// Calculate Available Stock
	for i := range products {
		products[i].AvailableStock = products[i].Stock - products[i].ReservedQty
		if products[i].AvailableStock < 0 {
			products[i].AvailableStock = 0
		}
	}

	responseData := gin.H{
		"data":  products,
		"total": total,
		"page":  page,
		"limit": limit,
	}

	// 2. SET CACHE (Public only, 2 Minutes TTL)
	if !strings.HasPrefix(c.Request.URL.Path, "/api/admin") {
		cacheKey := "products:" + c.Request.URL.RequestURI()
		helpers.Cache.Set(cacheKey, responseData, 2*time.Minute)
	}

	c.JSON(http.StatusOK, responseData)
}

// GetProduct - Get single product detail
func GetProduct(c *gin.Context) {
	id := c.Param("id")
	var product models.Product

	if err := config.DB.
		Preload("Category.Parent").
		Preload("Category").
		Preload("Brand").
		Preload("Series").
		Preload("Characters").
		Preload("Genres").
		Preload("Scale").
		Preload("Material").
		Preload("EditionType").
		First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Calculate Available Stock
	product.AvailableStock = product.Stock - product.ReservedQty
	if product.AvailableStock < 0 {
		product.AvailableStock = 0
	}

	c.JSON(http.StatusOK, product)
}

// GetRelatedProducts - Get products from the same category (US-PRD-008)
func GetRelatedProducts(c *gin.Context) {
	id := c.Param("id")
	var product models.Product

	// Find the current product to get its category
	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Get limit from query, default 8
	limit := 8
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 20 {
			limit = parsed
		}
	}

	var relatedProducts []models.Product

	// Find products in the same category, excluding current product
	query := config.DB.Model(&models.Product{}).
		Preload("Category").
		Preload("Brand").
		Where("category_id = ? AND id != ? AND status = ?", product.CategoryID, product.ID, "active")

	// Optional: Also match by brand if same category returns few results
	if err := query.Limit(limit).Find(&relatedProducts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch related products"})
		return
	}

	// If we got fewer than limit, try to fill with same brand
	if len(relatedProducts) < limit && product.BrandID != nil {
		remaining := limit - len(relatedProducts)
		existingIDs := []uint{product.ID}
		for _, rp := range relatedProducts {
			existingIDs = append(existingIDs, rp.ID)
		}

		var brandProducts []models.Product
		config.DB.Model(&models.Product{}).
			Preload("Category").
			Preload("Brand").
			Where("brand_id = ? AND id NOT IN ? AND status = ?", product.BrandID, existingIDs, "active").
			Limit(remaining).
			Find(&brandProducts)

		relatedProducts = append(relatedProducts, brandProducts...)
	}

	// Calculate available stock for each
	for i := range relatedProducts {
		relatedProducts[i].AvailableStock = relatedProducts[i].Stock - relatedProducts[i].ReservedQty
		if relatedProducts[i].AvailableStock < 0 {
			relatedProducts[i].AvailableStock = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  relatedProducts,
		"count": len(relatedProducts),
	})
}

// GetProductBySlug - Get product by slug for SEO-friendly URLs
func GetProductBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var product models.Product

	if err := config.DB.
		Preload("Category").
		Preload("Brand").
		Preload("Series").
		Preload("Characters").
		Preload("Genres").
		Preload("Scale").
		Preload("Material").
		Preload("EditionType").
		Where("slug = ?", slug).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Calculate Available Stock
	product.AvailableStock = product.Stock - product.ReservedQty
	if product.AvailableStock < 0 {
		product.AvailableStock = 0
	}

	c.JSON(http.StatusOK, product)
}

// CreateProduct - Add new product
func CreateProduct(c *gin.Context) {
	var input services.ProductInput

	// Bind JSON
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("currentUser").(models.User).ID

	svc := services.NewProductService()
	product, err := svc.CreateProduct(input, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	helpers.Cache.Flush()
	c.JSON(http.StatusCreated, product)
}

// UpdateProduct - Edit existing product
func UpdateProduct(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	var input services.ProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("currentUser").(models.User).ID

	svc := services.NewProductService()
	product, err := svc.UpdateProduct(uint(id), input, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, product)
}

// DeleteProduct - Soft delete or Hard delete (using Hard for now based on GORM default if logic not present)
func DeleteProduct(c *gin.Context) {
	id := c.Param("id")

	// Find first for audit
	var product models.Product
	config.DB.First(&product, id)

	if err := config.DB.Delete(&models.Product{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	// Audit Log
	if userVal, exists := c.Get("currentUser"); exists {
		user := userVal.(models.User)
		helpers.LogAudit(user.ID, "Product", "Delete", id, "Deleted product: "+product.Name, product, nil, c.ClientIP(), c.Request.UserAgent())
	}

	helpers.Cache.Flush()
	c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}
