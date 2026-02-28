package controllers

import (
	"forzashop/backend/config"
	"forzashop/backend/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMyNotifications fetches the current user's notifications
func GetMyNotifications(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var notifications []models.NotificationLog
	// limit to 50 latest notifications
	if err := config.DB.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(50).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	// Count unread
	var unreadCount int64
	config.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND is_read = ?", user.ID, false).Count(&unreadCount)

	c.JSON(http.StatusOK, gin.H{
		"data":   notifications,
		"unread": unreadCount,
	})
}

// MarkNotificationAsRead marks specific or all notifications as read
func MarkNotificationAsRead(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	// If ID is provided in body or query, mark that one. If "all", mark all.
	// For simplicity, let's look for an ID param. If "all", mark all.
	targetID := c.Param("id")

	if targetID == "all" {
		config.DB.Model(&models.NotificationLog{}).Where("user_id = ? AND is_read = ?", user.ID, false).Update("is_read", true)
		c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
		return
	}

	// Else mark specific
	if err := config.DB.Model(&models.NotificationLog{}).
		Where("id = ? AND user_id = ?", targetID, user.ID).
		Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
