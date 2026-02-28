package controllers

import (
	"net/http"

	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// SearchPOSProducts - Search products optimized for POS (Barcode/SKU/Name)
func SearchPOSProducts(c *gin.Context) {
	query := c.Query("q")
	posService := services.NewPOSService()

	products, err := posService.SearchProducts(services.SearchParams{
		Query: query,
		Limit: 100,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencari produk: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, products)
}

// CreatePOSOrder - Handle Sales from physical store
func CreatePOSOrder(c *gin.Context) {
	var input services.CreateOrderInput

	// Bind JSON to the service input struct directly or via intermediate struct
	// Since the service input matches the JSON structure mostly, we can map it.
	var requestBody struct {
		UserID        uint               `json:"user_id"`
		CustomerName  string             `json:"customer_name"`
		CustomerEmail string             `json:"customer_email"`
		Items         []models.OrderItem `json:"items"`
		PaymentMethod string             `json:"payment_method"`
		POPaymentType string             `json:"po_payment_type"`
		Notes         string             `json:"notes"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// User Identification
	var staffID uint
	if userVal, exists := c.Get("currentUser"); exists {
		u := userVal.(models.User)
		staffID = u.ID
	}

	// Map to Service Input
	input = services.CreateOrderInput{
		UserID:        requestBody.UserID,
		CustomerName:  requestBody.CustomerName,
		CustomerEmail: requestBody.CustomerEmail,
		Items:         requestBody.Items,
		PaymentMethod: requestBody.PaymentMethod,
		POPaymentType: requestBody.POPaymentType,
		Notes:         requestBody.Notes,
		ProcessorID:   staffID,
		IPAddress:     c.ClientIP(),
		UserAgent:     c.Request.UserAgent(),
	}

	posService := services.NewPOSService()
	result, err := posService.CreateOrder(input)

	if err != nil {
		// Distinguish errors here if needed (e.g. 404 vs 400 vs 500)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":             result.Order.ID,
		"order_number":   result.Order.OrderNumber,
		"total_amount":   result.Order.TotalAmount,
		"status":         result.Order.Status,
		"payment_status": result.Order.PaymentStatus,
		"payment_url":    result.PaymentURL,
	})
}

// GenerateProductQRCodes - Backfill QR codes for all products missing one
func GenerateProductQRCodes(c *gin.Context) {
	posService := services.NewPOSService()
	count, err := posService.GenerateQRCodes()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate QR codes: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "QR codes logic executed",
		"count":   count,
	})
}
