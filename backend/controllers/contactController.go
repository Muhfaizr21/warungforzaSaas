package controllers

import (
	"net/http"
	"strconv"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// SubmitContactMessage (Public)
func SubmitContactMessage(c *gin.Context) {
	var input struct {
		Name    string `json:"name" binding:"required"`
		Email   string `json:"email" binding:"required,email"`
		Message string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message := models.ContactMessage{
		Name:    input.Name,
		Email:   input.Email,
		Message: input.Message,
		Status:  "unread",
	}

	if err := config.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Message sent successfully"})
}

// GetContactMessages (Admin Only)
func GetContactMessages(c *gin.Context) {
	var messages []models.ContactMessage
	var total int64

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit
	status := c.Query("status")

	query := config.DB.Model(&models.ContactMessage{})

	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)
	query.Order("created_at desc").Offset(offset).Limit(limit).Find(&messages)

	// Mark as read if status is unread? No, let admin decide or mark on open.
	// For simplicity, just return list.

	c.JSON(http.StatusOK, gin.H{
		"data":  messages,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// MarkMessageAsRead (Admin)
func MarkMessageAsRead(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Model(&models.ContactMessage{}).Where("id = ?", id).Update("status", "read").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

// DeleteContactMessage (Admin)
func DeleteContactMessage(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.ContactMessage{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Message deleted"})
}
