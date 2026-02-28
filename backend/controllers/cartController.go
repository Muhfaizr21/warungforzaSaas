package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

// SyncCart - Saves the current cart state to the database
// Called periodically by the frontend (debounce) or on checkout init
func SyncCart(c *gin.Context) {
	var input struct {
		Items     []interface{} `json:"items"` // Raw JSON of items
		Total     float64       `json:"total"`
		SessionID string        `json:"session_id"` // Optional from cookie
		Email     string        `json:"email"`      // Optional if user typed it
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Determine User (if logged in) or utilize SessionID
	var userID uint
	if user, exists := c.Get("currentUser"); exists {
		userID = user.(models.User).ID
	}

	// Requires at least session_id or user_id
	if userID == 0 && input.SessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identity required (session or login)"})
		return
	}

	// Serialize items to JSON
	itemsJSON, _ := json.Marshal(input.Items)

	// Upsert logic
	var cart models.AbandonedCart
	var err error

	// Try to find existing cart
	query := config.DB.Where("status = ?", "active")
	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	} else {
		query = query.Where("session_id = ?", input.SessionID)
	}

	if err = query.First(&cart).Error; err != nil {
		// Create new
		var cartUserID *uint
		if userID > 0 {
			cartUserID = &userID
		}

		cart = models.AbandonedCart{
			UserID:       cartUserID,
			SessionID:    input.SessionID,
			Items:        datatypes.JSON(itemsJSON),
			Total:        input.Total,
			Email:        input.Email,
			Status:       "active",
			LastActivity: time.Now(),
		}
		config.DB.Create(&cart)
	} else {
		// Update existing
		cart.Items = datatypes.JSON(itemsJSON)
		cart.Total = input.Total
		cart.LastActivity = time.Now()
		if input.Email != "" {
			cart.Email = input.Email
		}
		// If user just logged in, link the session cart
		if userID > 0 && cart.UserID == nil {
			cart.UserID = &userID
		}
		config.DB.Save(&cart)
	}

	c.JSON(http.StatusOK, gin.H{"status": "synced"})
}

// ConvertCartToOrder - Called when checkout is successful to mark cart as 'recovered'
// This is internal helper or can be an endpoint
func MarkCartRecovered(userID uint, sessionID string) {
	query := config.DB.Model(&models.AbandonedCart{}).Where("status = ?", "active")
	if userID > 0 {
		query = query.Where("user_id = ?", userID)
	} else {
		query = query.Where("session_id = ?", sessionID)
	}
	query.Update("status", "recovered")
}
