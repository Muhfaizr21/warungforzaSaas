package controllers

import (
	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ==========================================
// SERIES MANAGEMENT
// ==========================================

// GetAdminSeries - List all series for admin (could add pagination later)
func GetAdminSeries(c *gin.Context) {
	var series []models.Series
	if err := config.DB.Preload("Products").Order("name ASC").Find(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch series"})
		return
	}
	c.JSON(http.StatusOK, series)
}

// CreateSeries - Create a new series
func CreateSeries(c *gin.Context) {
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := helpers.GenerateSlug(input.Name)

	// Find or Create logic for Quick Add
	var existing models.Series
	if err := config.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	series := models.Series{
		Name:        input.Name,
		Slug:        slug,
		Description: input.Description,
		Image:       input.Image,
	}

	if err := config.DB.Create(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create series"})
		return
	}
	c.JSON(http.StatusCreated, series)
}

// UpdateSeries - Update existing series
func UpdateSeries(c *gin.Context) {
	id := c.Param("id")
	var series models.Series
	if err := config.DB.First(&series, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Series not found"})
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	series.Name = input.Name
	series.Description = input.Description
	series.Image = input.Image
	// Optional: Update slug if name changes? Usually risky for SEO, but for now let's keep slug stable or update if explicitly requested.
	// Let's regenerate slug if name changed significantly? No, keep it simple.

	if err := config.DB.Save(&series).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update series"})
		return
	}
	c.JSON(http.StatusOK, series)
}

// DeleteSeries - Delete a series
func DeleteSeries(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Series{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete series"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Series deleted"})
}

// ==========================================
// CHARACTER MANAGEMENT
// ==========================================

func GetAdminCharacters(c *gin.Context) {
	var characters []models.Character
	if err := config.DB.Preload("Series").Order("name ASC").Find(&characters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch characters"})
		return
	}
	c.JSON(http.StatusOK, characters)
}

func CreateCharacter(c *gin.Context) {
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
		SeriesID    *uint  `json:"series_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := helpers.GenerateSlug(input.Name)

	// Find or Create logic
	var existing models.Character
	if err := config.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	character := models.Character{
		Name:        input.Name,
		Slug:        slug,
		Description: input.Description,
		Image:       input.Image,
		SeriesID:    input.SeriesID,
	}

	if err := config.DB.Create(&character).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create character"})
		return
	}
	c.JSON(http.StatusCreated, character)
}

func UpdateCharacter(c *gin.Context) {
	id := c.Param("id")
	var character models.Character
	if err := config.DB.First(&character, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
		SeriesID    *uint  `json:"series_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	character.Name = input.Name
	character.Description = input.Description
	character.Image = input.Image
	character.SeriesID = input.SeriesID

	if err := config.DB.Save(&character).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update character"})
		return
	}
	c.JSON(http.StatusOK, character)
}

func DeleteCharacter(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Character{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete character"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Character deleted"})
}

// ==========================================
// GENRE MANAGEMENT
// ==========================================

func GetAdminGenres(c *gin.Context) {
	var genres []models.Genre
	if err := config.DB.Order("name ASC").Find(&genres).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch genres"})
		return
	}
	c.JSON(http.StatusOK, genres)
}

func CreateGenre(c *gin.Context) {
	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := helpers.GenerateSlug(input.Name)

	// Find or Create logic
	var existing models.Genre
	if err := config.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	genre := models.Genre{
		Name:        input.Name,
		Slug:        slug,
		Description: input.Description,
		Image:       input.Image,
	}

	if err := config.DB.Create(&genre).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create genre"})
		return
	}
	c.JSON(http.StatusCreated, genre)
}

func UpdateGenre(c *gin.Context) {
	id := c.Param("id")
	var genre models.Genre
	if err := config.DB.First(&genre, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Genre not found"})
		return
	}

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Image       string `json:"image"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	genre.Name = input.Name
	genre.Description = input.Description
	genre.Image = input.Image

	if err := config.DB.Save(&genre).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update genre"})
		return
	}
	c.JSON(http.StatusOK, genre)
}

func DeleteGenre(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.Genre{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete genre"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Genre deleted"})
}

// ==========================================
// SCALE MANAGEMENT
// ==========================================

func GetAdminScales(c *gin.Context) {
	var scales []models.Scale
	if err := config.DB.Order("name ASC").Find(&scales).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scales"})
		return
	}
	c.JSON(http.StatusOK, scales)
}

func CreateScale(c *gin.Context) {
	var input struct {
		Name string `json:"name"` // e.g., "1/6", "1/4"
		Slug string `json:"slug"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if input.Slug == "" {
		input.Slug = helpers.GenerateSlug(input.Name)
	}

	// Find or Create logic
	var existing models.Scale
	if err := config.DB.Where("slug = ?", input.Slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	scale := models.Scale{Name: input.Name, Slug: input.Slug}
	if err := config.DB.Create(&scale).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scale"})
		return
	}
	c.JSON(http.StatusCreated, scale)
}

func UpdateScale(c *gin.Context) {
	id := c.Param("id")
	var scale models.Scale
	if err := config.DB.First(&scale, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scale not found"})
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err == nil {
		scale.Name = input.Name
		config.DB.Save(&scale)
	}
	c.JSON(http.StatusOK, scale)
}

func DeleteScale(c *gin.Context) {
	id := c.Param("id")
	config.DB.Delete(&models.Scale{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Scale deleted"})
}

// ==========================================
// MATERIAL MANAGEMENT
// ==========================================

func GetAdminMaterials(c *gin.Context) {
	var materials []models.Material
	if err := config.DB.Order("name ASC").Find(&materials).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch materials"})
		return
	}
	c.JSON(http.StatusOK, materials)
}

func CreateMaterial(c *gin.Context) {
	var input struct {
		Name string `json:"name"` // e.g., "Polystone", "PVC"
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	slug := helpers.GenerateSlug(input.Name)

	// Find or Create logic
	var existing models.Material
	if err := config.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	material := models.Material{Name: input.Name, Slug: slug}
	if err := config.DB.Create(&material).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create material"})
		return
	}
	c.JSON(http.StatusCreated, material)
}

func DeleteMaterial(c *gin.Context) {
	config.DB.Delete(&models.Material{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Material deleted"})
}

func UpdateMaterial(c *gin.Context) {
	id := c.Param("id")
	var material models.Material
	if err := config.DB.First(&material, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Material not found"})
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err == nil {
		material.Name = input.Name
		material.Slug = helpers.GenerateSlug(input.Name)
		config.DB.Save(&material)
	}
	c.JSON(http.StatusOK, material)
}

// ==========================================
// EDITION TYPE MANAGEMENT
// ==========================================

func GetAdminEditionTypes(c *gin.Context) {
	var types []models.EditionType
	if err := config.DB.Find(&types).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch edition types"})
		return
	}
	c.JSON(http.StatusOK, types)
}

func CreateEditionType(c *gin.Context) {
	var input struct {
		Name string `json:"name"` // e.g., "Limited Edition", "Artist Proof"
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	slug := helpers.GenerateSlug(input.Name)

	// Find or Create logic
	var existing models.EditionType
	if err := config.DB.Where("slug = ?", slug).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, existing)
		return
	}

	et := models.EditionType{Name: input.Name, Slug: slug}
	if err := config.DB.Create(&et).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create edition type"})
		return
	}
	c.JSON(http.StatusCreated, et)
}

func UpdateEditionType(c *gin.Context) {
	id := c.Param("id")
	var et models.EditionType
	if err := config.DB.First(&et, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Edition Type not found"})
		return
	}
	var input struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&input); err == nil {
		et.Name = input.Name
		et.Slug = helpers.GenerateSlug(input.Name)
		config.DB.Save(&et)
	}
	c.JSON(http.StatusOK, et)
}

func DeleteEditionType(c *gin.Context) {
	config.DB.Delete(&models.EditionType{}, c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"message": "Edition Type deleted"})
}
