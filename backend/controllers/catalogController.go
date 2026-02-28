package controllers

import (
	"net/http"
	"strconv"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// ============================================
// CATEGORY CONTROLLERS
// ============================================

func GetCategories(c *gin.Context) {
	var categories []models.Category
	if err := config.DB.Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

func GetCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": category})
}

func CreateCategory(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Slug        string `json:"slug" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	category := models.Category{
		Name:        input.Name,
		Slug:        input.Slug,
		Description: input.Description,
	}

	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	// Audit log
	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Category", "Create", strconv.Itoa(int(category.ID)),
		"Created category: "+category.Name, nil, category, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": category, "message": "Category created successfully"})
}

func UpdateCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	oldData := category

	var input struct {
		Name        string `json:"name"`
		Slug        string `json:"slug"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		category.Name = input.Name
	}
	if input.Slug != "" {
		category.Slug = input.Slug
	}
	category.Description = input.Description

	if err := config.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Category", "Update", id,
		"Updated category: "+category.Name, oldData, category, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": category, "message": "Category updated successfully"})
}

func DeleteCategory(c *gin.Context) {
	id := c.Param("id")
	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		return
	}

	if err := config.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Category", "Delete", id,
		"Deleted category: "+category.Name, category, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}

// ============================================
// BRAND CONTROLLERS
// ============================================

func GetBrands(c *gin.Context) {
	var brands []models.Brand
	if err := config.DB.Find(&brands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch brands"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": brands})
}

func GetBrand(c *gin.Context) {
	id := c.Param("id")
	var brand models.Brand
	if err := config.DB.First(&brand, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Brand not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": brand})
}

func CreateBrand(c *gin.Context) {
	var input struct {
		Name string `json:"name" binding:"required"`
		Slug string `json:"slug" binding:"required"`
		Logo string `json:"logo"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	brand := models.Brand{
		Name: input.Name,
		Slug: input.Slug,
		Logo: input.Logo,
	}

	if err := config.DB.Create(&brand).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create brand"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Brand", "Create", strconv.Itoa(int(brand.ID)),
		"Created brand: "+brand.Name, nil, brand, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": brand, "message": "Brand created successfully"})
}

func UpdateBrand(c *gin.Context) {
	id := c.Param("id")
	var brand models.Brand
	if err := config.DB.First(&brand, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Brand not found"})
		return
	}

	oldData := brand

	var input struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
		Logo string `json:"logo"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		brand.Name = input.Name
	}
	if input.Slug != "" {
		brand.Slug = input.Slug
	}
	if input.Logo != "" {
		brand.Logo = input.Logo
	}

	if err := config.DB.Save(&brand).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update brand"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Brand", "Update", id,
		"Updated brand: "+brand.Name, oldData, brand, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": brand, "message": "Brand updated successfully"})
}

func DeleteBrand(c *gin.Context) {
	id := c.Param("id")
	var brand models.Brand
	if err := config.DB.First(&brand, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Brand not found"})
		return
	}

	if err := config.DB.Delete(&brand).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete brand"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Brand", "Delete", id,
		"Deleted brand: "+brand.Name, brand, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Brand deleted successfully"})
}

// ============================================
// CUSTOM FIELD TEMPLATE CONTROLLERS
// ============================================

func GetCustomFields(c *gin.Context) {
	var fields []models.CustomFieldTemplate
	query := config.DB

	if active := c.Query("active"); active == "true" {
		query = query.Where("active = ?", true)
	}

	if err := query.Order("display_order").Find(&fields).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch custom fields"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": fields})
}

func CreateCustomField(c *gin.Context) {
	var input struct {
		FieldKey          string `json:"field_key" binding:"required"`
		Label             string `json:"label" binding:"required"`
		Type              string `json:"type" binding:"required"` // text, number, select, boolean
		AllowedCategories []uint `json:"allowed_categories"`
		DisplayOrder      int    `json:"display_order"`
		Required          bool   `json:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	field := models.CustomFieldTemplate{
		FieldKey:     input.FieldKey,
		Label:        input.Label,
		Type:         input.Type,
		DisplayOrder: input.DisplayOrder,
		Required:     input.Required,
		Active:       true,
	}

	if err := config.DB.Create(&field).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom field. Key may already exist."})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "CustomField", "Create", strconv.Itoa(int(field.ID)),
		"Created custom field: "+field.Label, nil, field, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": field, "message": "Custom field created successfully"})
}

func UpdateCustomField(c *gin.Context) {
	id := c.Param("id")
	var field models.CustomFieldTemplate
	if err := config.DB.First(&field, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Custom field not found"})
		return
	}

	oldData := field

	var input struct {
		Label        string `json:"label"`
		Type         string `json:"type"`
		DisplayOrder int    `json:"display_order"`
		Required     bool   `json:"required"`
		Active       *bool  `json:"active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Label != "" {
		field.Label = input.Label
	}
	if input.Type != "" {
		field.Type = input.Type
	}
	field.DisplayOrder = input.DisplayOrder
	field.Required = input.Required
	if input.Active != nil {
		field.Active = *input.Active
	}

	if err := config.DB.Save(&field).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update custom field"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "CustomField", "Update", id,
		"Updated custom field: "+field.Label, oldData, field, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": field, "message": "Custom field updated successfully"})
}

func DeleteCustomField(c *gin.Context) {
	id := c.Param("id")
	var field models.CustomFieldTemplate
	if err := config.DB.First(&field, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Custom field not found"})
		return
	}

	// Soft delete - just deactivate
	field.Active = false
	if err := config.DB.Save(&field).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deactivate custom field"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "CustomField", "Deactivate", id,
		"Deactivated custom field: "+field.Label, nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Custom field deactivated successfully"})
}
