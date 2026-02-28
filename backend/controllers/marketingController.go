package controllers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// ============================================
// ANNOUNCEMENT CONTROLLERS
// ============================================

func GetAnnouncements(c *gin.Context) {
	var announcements []models.Announcement
	query := config.DB.Preload("Creator").Order("is_pinned DESC, created_at DESC")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": announcements})
}

func GetAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement models.Announcement
	if err := config.DB.Preload("Creator").First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": announcement})
}

func CreateAnnouncement(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		Title        string     `json:"title" binding:"required"`
		Content      string     `json:"content" binding:"required"`
		Images       []string   `json:"images"`
		Category     string     `json:"category" binding:"required"` // DELAY, CANCEL, PROMO, INFO
		TargetType   string     `json:"target_type"`                 // all, products, orders
		TargetIDs    []uint     `json:"target_ids"`
		IsPinned     bool       `json:"is_pinned"`
		PublishStart *time.Time `json:"publish_start"`
		PublishEnd   *time.Time `json:"publish_end"`
		Status       string     `json:"status"` // draft, published
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.TargetType == "" {
		input.TargetType = "all"
	}
	if input.Status == "" {
		input.Status = "draft"
	}

	announcement := models.Announcement{
		Title:        input.Title,
		Content:      input.Content,
		Category:     input.Category,
		TargetType:   input.TargetType,
		IsPinned:     input.IsPinned,
		PublishStart: input.PublishStart,
		PublishEnd:   input.PublishEnd,
		Status:       input.Status,
		CreatedBy:    user.ID,
	}

	if err := config.DB.Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	helpers.LogAudit(user.ID, "Announcement", "Create", strconv.Itoa(int(announcement.ID)),
		"Created announcement: "+announcement.Title, nil, announcement, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": announcement, "message": "Announcement created successfully"})
}

func UpdateAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement models.Announcement
	if err := config.DB.First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	oldData := announcement

	var input struct {
		Title        string     `json:"title"`
		Content      string     `json:"content"`
		Images       []string   `json:"images"`
		Category     string     `json:"category"`
		TargetType   string     `json:"target_type"`
		TargetIDs    []uint     `json:"target_ids"`
		IsPinned     bool       `json:"is_pinned"`
		PublishStart *time.Time `json:"publish_start"`
		PublishEnd   *time.Time `json:"publish_end"`
		Status       string     `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Title != "" {
		announcement.Title = input.Title
	}
	if input.Content != "" {
		announcement.Content = input.Content
	}
	if input.Category != "" {
		announcement.Category = input.Category
	}
	if input.TargetType != "" {
		announcement.TargetType = input.TargetType
	}
	if input.Status != "" {
		announcement.Status = input.Status
	}
	announcement.IsPinned = input.IsPinned
	announcement.PublishStart = input.PublishStart
	announcement.PublishEnd = input.PublishEnd

	if err := config.DB.Save(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update announcement"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Announcement", "Update", id,
		"Updated announcement: "+announcement.Title, oldData, announcement, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": announcement, "message": "Announcement updated successfully"})
}

func DeleteAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement models.Announcement
	if err := config.DB.First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// Delete related broadcasts first to avoid foreign key constraints
	config.DB.Where("announcement_id = ?", announcement.ID).Delete(&models.AnnouncementBroadcast{})

	if err := config.DB.Delete(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Announcement", "Delete", id,
		"Deleted announcement: "+announcement.Title, announcement, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Announcement deleted successfully"})
}

func PublishAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement models.Announcement
	if err := config.DB.First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	announcement.Status = "published"
	if err := config.DB.Save(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish announcement"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Announcement", "Publish", id,
		"Published announcement: "+announcement.Title, nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": announcement, "message": "Announcement published successfully"})
}

// BroadcastAnnouncement sends email to targeted users
func BroadcastAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var announcement models.Announcement
	if err := config.DB.First(&announcement, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Announcement not found"})
		return
	}

	// Get target users based on target_type
	var users []models.User
	switch announcement.TargetType {
	case "all":
		config.DB.Where("role_id != ?", 1).Find(&users) // Exclude admin
	case "products":
		// Get users who ordered specific products
		// Simplified: get all customers for now
		config.DB.Where("role_id != ?", 1).Find(&users)
	case "orders":
		// Get users with specific order IDs
		config.DB.Where("role_id != ?", 1).Find(&users)
	default:
		config.DB.Where("role_id != ?", 1).Find(&users)
	}

	// Create broadcast records
	for _, u := range users {
		broadcast := models.AnnouncementBroadcast{
			AnnouncementID: announcement.ID,
			UserID:         u.ID,
			Status:         "sent",
		}
		now := time.Now()
		broadcast.SentAt = &now
		config.DB.Create(&broadcast)

		// Send Email with Premium Template
		subject := "Announcement: " + announcement.Title
		body := fmt.Sprintf(`
			<div style="background-color: #030303; padding: 50px 20px; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;">
				<div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 40px; padding: 60px 40px; backdrop-filter: blur(20px);">
					<img src="%s/forza.png" alt="FORZA SHOP" style="width: 140px; margin-bottom: 40px; filter: brightness(1.2);">
					
					<h2 style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; font-style: italic; margin-bottom: 20px; color: #ffffff;">
						%s
					</h2>
					
					<div style="height: 1px; background: linear-gradient(to right, transparent, rgba(59, 130, 246, 0.4), transparent); margin-bottom: 40px;"></div>

					<div style="font-size: 15px; color: #a1a1aa; line-height: 1.8; margin-bottom: 40px; text-align: left; font-weight: 400;">
						%s
					</div>

					<div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
						<a href="%s" style="display: inline-block; background: #ffffff; color: #000000; padding: 16px 32px; border-radius: 12px; font-weight: 800; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
							Visit System Portal
						</a>
					</div>

					<div style="margin-top: 40px; font-size: 9px; font-weight: 900; color: #3f3f46; text-transform: uppercase; letter-spacing: 2px;">
						REF_ID: ANN_%d // SECURED_COMMUNICATION
					</div>
				</div>
				
				<div style="margin-top: 40px; font-size: 10px; color: #3f3f46; text-transform: uppercase; letter-spacing: 1px;">
					© 2026 WARUNG FORZA SHOP INDONESIA. ALL RIGHTS RESERVED.
				</div>
			</div>
		`, os.Getenv("APP_URL"), announcement.Title, announcement.Content, os.Getenv("APP_URL"), announcement.ID)

		helpers.SendEmail(u.Email, subject, body)

		helpers.NotifyUser(u.ID, "ANNOUNCEMENT", announcement.Title, map[string]interface{}{
			"announcement_id": announcement.ID,
			"category":        announcement.Category,
		})
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Announcement", "Broadcast", id,
		"Broadcasted announcement to "+strconv.Itoa(len(users))+" users", nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{
		"message":    "Announcement broadcasted successfully",
		"sent_count": len(users),
	})
}

// ============================================
// NEWSLETTER CONTROLLERS
// ============================================

// SyncNewsletterSubscribers synchronizes the subscriber list with actual registered users
func SyncNewsletterSubscribers(c *gin.Context) {
	// 1. Clear existing subscribers (optional: strictly sync mode)
	// For now, let's delete those that look like dummies or just reset based on user request to "sync"
	// User complained about "77" dummies, so let's wipe the table and rebuild from actual users.
	tx := config.DB.Begin()

	// Wipe all subscribers
	if err := tx.Exec("DELETE FROM newsletter_subscribers").Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear old data"})
		return
	}

	// 2. Fetch all customers (assuming role_id != 1 is customer)
	var customers []models.User
	if err := tx.Where("role_id != ?", 1).Find(&customers).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers"})
		return
	}

	// 3. Insert real customers
	count := 0
	for _, user := range customers {
		sub := models.NewsletterSubscriber{
			UserID:       &user.ID,
			Email:        user.Email,
			Status:       "subscribed",
			SubscribedAt: time.Now(),
			// Default segment is customer
		}
		if err := tx.Create(&sub).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sync user: " + user.Email})
			return
		}
		count++
	}

	tx.Commit()

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Newsletter", "Sync", "ALL",
		"Synchronized subscribers with customer database. Total: "+strconv.Itoa(count), nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{
		"message":      "Successfully synchronized with customer data",
		"total_synced": count,
	})
}

func GetNewsletterSubscribers(c *gin.Context) {
	var subscribers []models.NewsletterSubscriber
	query := config.DB

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&subscribers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subscribers"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": subscribers, "total": len(subscribers)})
}

func GetNewsletterCampaigns(c *gin.Context) {
	var campaigns []models.NewsletterCampaign
	query := config.DB.Preload("Creator").Order("created_at DESC")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&campaigns).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch campaigns"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": campaigns})
}

func GetNewsletterCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.NewsletterCampaign
	if err := config.DB.Preload("Creator").Preload("Logs").First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": campaign})
}

func CreateNewsletterCampaign(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		Name          string     `json:"name" binding:"required"`
		Subject       string     `json:"subject" binding:"required"`
		Content       string     `json:"content" binding:"required"`
		TargetSegment string     `json:"target_segment"` // all, po_customers, wishlist_joiners
		ScheduledAt   *time.Time `json:"scheduled_at"`
		UTMSource     string     `json:"utm_source"`
		UTMMedium     string     `json:"utm_medium"`
		UTMCampaign   string     `json:"utm_campaign"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.TargetSegment == "" {
		input.TargetSegment = "all"
	}

	status := "draft"
	if input.ScheduledAt != nil {
		status = "scheduled"
	}

	campaign := models.NewsletterCampaign{
		Name:          input.Name,
		Subject:       input.Subject,
		Content:       input.Content,
		TargetSegment: input.TargetSegment,
		Status:        status,
		ScheduledAt:   input.ScheduledAt,
		UTMSource:     input.UTMSource,
		UTMMedium:     input.UTMMedium,
		UTMCampaign:   input.UTMCampaign,
		CreatedBy:     user.ID,
	}

	if err := config.DB.Create(&campaign).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create campaign"})
		return
	}

	helpers.LogAudit(user.ID, "Newsletter", "Create", strconv.Itoa(int(campaign.ID)),
		"Created newsletter campaign: "+campaign.Name, nil, campaign, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": campaign, "message": "Campaign created successfully"})
}

func SendNewsletterCampaign(c *gin.Context) {
	id := c.Param("id")
	var campaign models.NewsletterCampaign
	if err := config.DB.First(&campaign, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Campaign not found"})
		return
	}

	// Get all customers/users
	var users []models.User
	config.DB.Where("role_id != ?", 1).Find(&users)

	sentCount := 0
	failedCount := 0

	for _, u := range users {
		// Send Email with Premium Template
		body := fmt.Sprintf(`
			<div style="background-color: #030303; padding: 50px 20px; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;">
				<div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 40px; padding: 60px 40px; backdrop-filter: blur(20px);">
					<img src="%s/forza.png" alt="FORZA SHOP" style="width: 140px; margin-bottom: 40px; filter: brightness(1.2);">
					
					<h2 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; font-style: italic; margin-bottom: 25px; color: #ffffff;">
						%s
					</h2>
					
					<div style="height: 1px; background: linear-gradient(to right, transparent, rgba(236, 72, 153, 0.4), transparent); margin-bottom: 40px;"></div>

					<div style="font-size: 15px; color: #d1d1d6; line-height: 1.8; margin-bottom: 40px; text-align: left;">
						%s
					</div>

					<div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
						<a href="%s" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%%, #8b5cf6 100%%); color: #ffffff; padding: 18px 36px; border-radius: 14px; font-weight: 800; font-size: 13px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; shadow: 0 10px 20px rgba(236, 72, 153, 0.3);">
							EXPLORE NEW ARRIVALS
						</a>
					</div>

					<div style="margin-top: 40px; font-size: 9px; font-weight: 900; color: #3f3f46; text-transform: uppercase; letter-spacing: 2px;">
						CAMPAIGN_ID: %d // DISTRIBUTED_NODE
					</div>
					
					<p style="margin-top: 20px; font-size: 11px; color: #52525b;">
						You requested to receive our transmissions. <br/>
						<a href="#" style="color: #a1a1aa; text-decoration: underline;">Disconnect from frequency</a>
					</p>
				</div>
				
				<div style="margin-top: 40px; font-size: 10px; color: #3f3f46; text-transform: uppercase; letter-spacing: 1px;">
					© 2026 WARUNG FORZA SHOP INDONESIA. ALL RIGHTS RESERVED.
				</div>
			</div>
		`, os.Getenv("APP_URL"), campaign.Subject, campaign.Content, os.Getenv("APP_URL"), campaign.ID)

		err := helpers.SendEmail(u.Email, campaign.Subject, body)
		status := "sent"
		if err != nil {
			status = "failed"
			failedCount++
		} else {
			sentCount++

			// Also send as an in-app notification if successful
			helpers.NotifyUser(u.ID, "NEWSLETTER", campaign.Subject, map[string]interface{}{
				"campaign_id": campaign.ID,
			})
		}

		log := models.NewsletterLog{
			CampaignID:   campaign.ID,
			SubscriberID: u.ID,
			Email:        u.Email,
			Status:       status,
		}
		now := time.Now()
		if status == "sent" {
			log.SentAt = &now
		}

		config.DB.Create(&log)
	}

	// Update campaign
	campaign.Status = "sent"
	now := time.Now()
	campaign.SentAt = &now
	campaign.SentCount = sentCount
	campaign.FailedCount = failedCount
	config.DB.Save(&campaign)

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Newsletter", "Send", id,
		"Sent newsletter campaign to "+strconv.Itoa(sentCount)+" subscribers", nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{
		"message":      "Campaign sent successfully",
		"sent_count":   sentCount,
		"failed_count": failedCount,
	})
}

// ============================================
// WISHLIST ADMIN CONTROLLERS
// ============================================

func GetWishlistOverview(c *gin.Context) {
	type WishlistUser struct {
		UserID   uint   `json:"user_id"`
		Username string `json:"username"`
		FullName string `json:"full_name"`
		Email    string `json:"email"`
	}

	type WishlistStat struct {
		ProductID     uint           `json:"product_id"`
		ProductName   string         `json:"product_name"`
		WishlistCount int64          `json:"wishlist_count"`
		Stock         int            `json:"stock"`
		Status        string         `json:"status"`
		Product       models.Product `json:"product"`
		Users         []WishlistUser `json:"users"`
	}

	var results []WishlistStat

	// 1. Get product aggregated data
	var aggregations []struct {
		ProductID uint
		Count     int64
	}
	config.DB.Table("wishlists").
		Select("product_id, COUNT(id) as count").
		Group("product_id").
		Order("count DESC").
		Limit(50).
		Scan(&aggregations)

	// 2. Total global interest
	var totalInterest int64
	config.DB.Model(&models.Wishlist{}).Count(&totalInterest)

	// 3. Build detailed stats
	for _, agg := range aggregations {
		var product models.Product
		if err := config.DB.First(&product, agg.ProductID).Error; err == nil {
			var users []WishlistUser
			config.DB.Table("wishlists").
				Select("users.id as user_id, users.username, users.full_name, users.email").
				Joins("JOIN users ON users.id = wishlists.user_id").
				Where("wishlists.product_id = ?", agg.ProductID).
				Limit(10). // Show top 10 interested users per product
				Scan(&users)

			results = append(results, WishlistStat{
				ProductID:     product.ID,
				ProductName:   product.Name,
				WishlistCount: agg.Count,
				Stock:         product.Stock,
				Status:        product.Status,
				Product:       product,
				Users:         users,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"overview": results,
			"total":    totalInterest,
		},
	})
}

// TriggerRestockNotification manually triggers restock notification
func TriggerRestockNotification(c *gin.Context) {
	productID := c.Param("product_id")
	pid, _ := strconv.Atoi(productID)

	var product models.Product
	if err := config.DB.First(&product, pid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	if product.Stock <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Product is not in stock"})
		return
	}

	// Call restock helper
	helpers.ProcessRestockAlerts(product.ID, product.Name)

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Wishlist", "RestockNotification", productID,
		"Triggered restock notification for: "+product.Name, nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Restock notification triggered for " + product.Name})
}
