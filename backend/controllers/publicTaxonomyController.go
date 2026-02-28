package controllers

import (
	"forzashop/backend/config"
	"forzashop/backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetSeries - List all series
func GetSeries(c *gin.Context) {
	var series []models.Series
	if err := config.DB.Order("name ASC").Find(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch series"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": series})
}

// GetCharacters - List all characters
func GetCharacters(c *gin.Context) {
	var characters []models.Character
	if err := config.DB.Order("name ASC").Find(&characters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch characters"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": characters})
}

// GetGenres - List all genres
func GetGenres(c *gin.Context) {
	var genres []models.Genre
	if err := config.DB.Order("name ASC").Find(&genres).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch genres"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": genres})
}

// GetPublicCategories - List all categories for public view
func GetPublicCategories(c *gin.Context) {
	var categories []models.Category
	if err := config.DB.Where("is_active = ?", true).Order("display_order ASC").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": categories})
}

// GetPublicBrands - List all brands for public view
func GetPublicBrands(c *gin.Context) {
	var brands []models.Brand
	if err := config.DB.Where("is_active = ?", true).Order("name ASC").Find(&brands).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch brands"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": brands})
}

// GetPublicScales - List all scales
func GetPublicScales(c *gin.Context) {
	var scales []models.Scale
	if err := config.DB.Order("name ASC").Find(&scales).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scales"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": scales})
}

// GetPublicMaterials - List all materials
func GetPublicMaterials(c *gin.Context) {
	var materials []models.Material
	if err := config.DB.Order("name ASC").Find(&materials).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch materials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": materials})
}

// GetPublicEditionTypes - List all edition types
func GetPublicEditionTypes(c *gin.Context) {
	var editionTypes []models.EditionType
	if err := config.DB.Order("name ASC").Find(&editionTypes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch edition types"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": editionTypes})
}
