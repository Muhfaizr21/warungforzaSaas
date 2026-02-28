package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// GetAllBlogPosts (Public) - with pagination, search, and tag filtering
func GetAllBlogPosts(c *gin.Context) {
	var posts []models.BlogPost
	var total int64

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit
	search := c.Query("search")
	tag := c.Query("tag")

	query := config.DB.Model(&models.BlogPost{}).Where("status = ?", "published")

	if search != "" {
		query = query.Where("title ILIKE ? OR content ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if tag != "" {
		query = query.Where("tags ILIKE ?", "%"+tag+"%")
	}

	query.Count(&total)
	query.Order("created_at desc").Offset(offset).Limit(limit).Preload("Author").Find(&posts)

	c.JSON(http.StatusOK, gin.H{
		"data":  posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetBlogPostBySlug (Public)
func GetBlogPostBySlug(c *gin.Context) {
	slug := c.Param("slug")
	var post models.BlogPost

	if err := config.DB.Where("slug = ? AND status = ?", slug, "published").Preload("Author").First(&post).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog post not found"})
		return
	}

	c.JSON(http.StatusOK, post)
}

// GetLatestBlogPosts (Public) - e.g. for homepage
func GetLatestBlogPosts(c *gin.Context) {
	var posts []models.BlogPost
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "3"))

	config.DB.Where("status = ?", "published").Order("created_at desc").Limit(limit).Preload("Author").Find(&posts)
	c.JSON(http.StatusOK, posts)
}

// Admin: Get All (including drafts)
func AdminGetAllBlogPosts(c *gin.Context) {
	var posts []models.BlogPost
	var total int64

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit
	status := c.Query("status")

	query := config.DB.Model(&models.BlogPost{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)
	query.Order("created_at desc").Offset(offset).Limit(limit).Preload("Author").Find(&posts)

	c.JSON(http.StatusOK, gin.H{
		"data":  posts,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetBlogPostByID (Admin)
func GetBlogPostByID(c *gin.Context) {
	id := c.Param("id")
	var post models.BlogPost

	if err := config.DB.Preload("Author").First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog post not found"})
		return
	}

	c.JSON(http.StatusOK, post)
}

// CreateBlogPost (Admin)
func CreateBlogPost(c *gin.Context) {
	var input struct {
		Title           string     `json:"title" binding:"required"`
		Slug            string     `json:"slug"`
		Content         string     `json:"content" binding:"required"`
		Excerpt         string     `json:"excerpt"`
		FeaturedImage   string     `json:"featured_image"`
		MetaDescription string     `json:"meta_description"`
		Status          string     `json:"status"`
		Tags            string     `json:"tags"`
		PublishDate     *time.Time `json:"publish_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, _ := c.Get("currentUser")
	userID := user.(models.User).ID

	// Generate Slug if empty
	if input.Slug == "" {
		input.Slug = generateSlug(input.Title)
	}

	post := models.BlogPost{
		Title:           input.Title,
		Slug:            input.Slug,
		Content:         input.Content,
		Excerpt:         input.Excerpt,
		FeaturedImage:   input.FeaturedImage,
		MetaDescription: input.MetaDescription,
		Status:          input.Status,
		Tags:            input.Tags,
		AuthorID:        userID,
		PublishDate:     input.PublishDate,
	}

	if err := config.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create blog post"})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// UpdateBlogPost (Admin)
func UpdateBlogPost(c *gin.Context) {
	id := c.Param("id")
	var post models.BlogPost

	if err := config.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog post not found"})
		return
	}

	// Use map interface to allow partial updates including zero values if needed
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Explicitly handle fields
	updates := make(map[string]interface{})

	if val, ok := input["title"]; ok {
		updates["title"] = val
	}
	if val, ok := input["slug"]; ok {
		updates["slug"] = val
	}
	if val, ok := input["content"]; ok {
		updates["content"] = val
	}
	if val, ok := input["excerpt"]; ok {
		updates["excerpt"] = val
	}
	if val, ok := input["featured_image"]; ok {
		updates["featured_image"] = val
	}
	if val, ok := input["meta_description"]; ok {
		updates["meta_description"] = val
	}
	if val, ok := input["status"]; ok {
		updates["status"] = val
	}
	if val, ok := input["tags"]; ok {
		updates["tags"] = val
	}
	// Publish Date needs special handling if it comes as string
	if val, ok := input["publish_date"]; ok {
		if valStr, ok := val.(string); ok && valStr != "" {
			t, err := time.Parse(time.RFC3339, valStr)
			if err == nil {
				updates["publish_date"] = t
			}
		} else if val == nil {
			updates["publish_date"] = nil
		}
	}

	if err := config.DB.Model(&post).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update blog post"})
		return
	}

	c.JSON(http.StatusOK, post)
}

// DeleteBlogPost (Admin)
func DeleteBlogPost(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.BlogPost{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete blog post"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Blog post deleted"})
}

// Helper to generate slug
func generateSlug(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	return s
}
