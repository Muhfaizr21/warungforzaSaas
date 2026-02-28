package controllers

import (
	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Add to Wishlist
func AddToWishlist(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	userID := user.ID

	var req struct {
		ProductID uint `json:"product_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if product exists
	var product models.Product
	if err := config.DB.First(&product, req.ProductID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check if already in wishlist
	var existing models.Wishlist
	if err := config.DB.Where("user_id = ? AND product_id = ?", userID, req.ProductID).First(&existing).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Already in wishlist", "wishlist": existing})
		return
	}

	// Create wishlist entry
	wishlist := models.Wishlist{
		UserID:          userID,
		ProductID:       req.ProductID,
		NotifyOnRestock: true,
	}

	if err := config.DB.Create(&wishlist).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to wishlist"})
		return
	}

	// Load relations
	config.DB.Preload("Product").Preload("Product.Brand").First(&wishlist, wishlist.ID)

	c.JSON(http.StatusCreated, wishlist)
}

// Get User Wishlist
func GetUserWishlist(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	userID := user.ID

	var wishlists []models.Wishlist
	if err := config.DB.Where("user_id = ?", userID).
		Preload("Product").
		Preload("Product.Brand").
		Preload("Product.Category").
		Order("created_at DESC").
		Find(&wishlists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch wishlist"})
		return
	}

	c.JSON(http.StatusOK, wishlists)
}

// Remove from Wishlist
func RemoveFromWishlist(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	userID := user.ID
	wishlistID := c.Param("id")

	result := config.DB.Where("id = ? AND user_id = ?", wishlistID, userID).Delete(&models.Wishlist{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from wishlist"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Wishlist item not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from wishlist"})
}

// Admin: Get All Wishlists
func GetAllWishlists(c *gin.Context) {
	var wishlists []models.Wishlist

	query := config.DB.Preload("User").
		Preload("Product").
		Preload("Product.Brand").
		Order("created_at DESC")

	// Filter by product if specified
	if productID := c.Query("product_id"); productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	// Filter by notified status
	if notified := c.Query("notified"); notified != "" {
		query = query.Where("notified = ?", notified == "true")
	}

	if err := query.Find(&wishlists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch wishlists"})
		return
	}

	c.JSON(http.StatusOK, wishlists)
}

// Notify Wishlist Users (called when product is restocked)
func NotifyWishlistUsers(c *gin.Context) {
	productID := c.Param("product_id")

	var wishlists []models.Wishlist
	if err := config.DB.Where("product_id = ? AND notified = false AND notify_on_restock = true", productID).
		Preload("User").
		Preload("Product").
		Find(&wishlists).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch wishlist users"})
		return
	}

	if len(wishlists) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No users to notify"})
		return
	}

	// Send emails and mark as notified
	now := time.Now()
	for _, wishlist := range wishlists {
		// Send actual email here
		subject := "Restock Alert: " + wishlist.Product.Name
		body := "<h3>Good News!</h3><p>The product you've been waiting for, <strong>" + wishlist.Product.Name + "</strong>, is now back in stock.</p><p>Hurry and secure your purchase before it runs out again!</p>"

		helpers.SendEmail(wishlist.User.Email, subject, body)

		config.DB.Model(&wishlist).Updates(map[string]interface{}{
			"notified":    true,
			"notified_at": &now,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Notifications sent",
		"users_notified": len(wishlists),
	})
}
