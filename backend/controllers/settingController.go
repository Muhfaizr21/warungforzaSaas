package controllers

import (
	"log"
	"net/http"
	"os"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// EmailPreviewReq - Request format for email previews
type EmailPreviewReq struct {
	Type      string            `json:"type"`
	Overrides map[string]string `json:"overrides"`
}

// EmailPreview - Renders a full email HTML preview.
// Accepts a POST payload so frontend can send unsaved draft templates.
func EmailPreview(c *gin.Context) {
	var req EmailPreviewReq
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Type = "payment"
		req.Overrides = make(map[string]string)
	}
	if req.Type == "" {
		req.Type = "payment"
	}
	if req.Overrides == nil {
		req.Overrides = make(map[string]string)
	}

	// Helper to get from overrides first, then DB, then fallback
	getVal := func(key, fallback string) string {
		if val, ok := req.Overrides[key]; ok && val != "" {
			return val
		}
		return helpers.GetSetting(key, fallback)
	}

	// Fetch live settings/overrides for shop identity
	accentColor := getVal("theme_accent_color", "#e11d48")
	shopName := getVal("store_name", "Warung Forza")
	logoURL := getVal("email_tpl_logo_url", "")

	// Dummy data for preview
	dummyVars := map[string]string{
		"customer_name":  "John Collector",
		"invoice_number": "INV-2026-X123",
		"amount":         "Rp 1.500.000",
		"product_name":   "1/4 Scale T-Rex Premium",
		"balance":        "Rp 3.000.000",
		"due_date":       "12 Oct 2026",
		"order_number":   "ORD-9999",
		"refund_type":    "Store Wallet",
		"reason":         "Out of Stock Guarantee",
		"message":        getVal("email_tpl_deposit_message", "Terima kasih! Pembayaran Anda telah dikonfirmasi."),
		"next_step":      getVal("email_tpl_deposit_nextstep", "Kami sedang mengemas pesanan Anda."),
		"shop_name":      shopName,
		"accent_color":   accentColor,
		"otp_code":       "123456",
		"reset_link":     "#",
		"logo_url":       logoURL,
	}

	// Select the body template based on type
	var bodyTpl string
	var subject string
	switch req.Type {
	case "payment":
		subject = getVal("email_tpl_payment_subject", "Konfirmasi Pembayaran - "+shopName)
		bodyTpl = getVal("email_tpl_payment_success", helpers.DefaultTPL_PaymentSuccess)
	case "po_arrival":
		subject = getVal("email_tpl_po_arrival_subject", "Pre-Order Anda Telah Tiba!")
		bodyTpl = getVal("email_tpl_po_arrival", helpers.DefaultTPL_POArrival)
	case "po_full":
		subject = getVal("email_tpl_po_arrival_subject", "Pre-Order Lunas - Siap Kirim!")
		bodyTpl = getVal("email_tpl_po_arrival_full", helpers.DefaultTPL_POArrivalFull)
	case "refund":
		bodyTpl = getVal("email_tpl_refund", helpers.DefaultTPL_Refund)
		subject = "Konfirmasi Refund - " + shopName
	case "otp":
		bodyTpl = getVal("email_tpl_welcome_otp", helpers.DefaultTPL_WelcomeOTP)
		subject = "Kode Verifikasi - " + shopName
	default:
		bodyTpl = getVal("email_tpl_payment_success", helpers.DefaultTPL_PaymentSuccess)
		subject = "Email Preview - " + shopName
	}

	// Replace variables in body
	bodyHTML := helpers.ApplyEmailVars(bodyTpl, dummyVars)

	// Wrap in global layout (using overrides if any)
	globalLayout := getVal("email_tpl_global_layout", helpers.DefaultTPL_GlobalLayout)

	fullHTML := globalLayout
	fullVars := map[string]string{
		"subject":      subject,
		"shop_name":    shopName,
		"accent_color": accentColor,
		"body_content": bodyHTML,
		"logo_url":     logoURL,
	}
	fullHTML = helpers.ApplyEmailVars(fullHTML, fullVars) // Apply vars to layout

	c.Header("Content-Type", "text/html; charset=utf-8")
	c.String(http.StatusOK, fullHTML)
}

var (
	publicSettingsCache []models.Setting
	cacheExpiry         time.Time
	cacheMutex          sync.Mutex
)

// GetSettings - List all settings
func GetSettings(c *gin.Context) {
	var settings []models.Setting
	config.DB.Find(&settings)

	// Map existing settings to quickly check
	existingKeys := make(map[string]bool)
	for _, s := range settings {
		existingKeys[s.Key] = true
	}

	// Supply default/fallback values from .env if missing from DB
	envFallbacks := map[string]string{
		"smtp_host":              os.Getenv("SMTP_HOST"),
		"smtp_port":              os.Getenv("SMTP_PORT"),
		"smtp_username":          os.Getenv("SMTP_USER"),
		"smtp_password":          os.Getenv("SMTP_PASS"),
		"smtp_from":              os.Getenv("SMTP_FROM"),
		"biteship_api_key":       os.Getenv("BITESHIP_API_KEY"),
		"prismalink_merchant_id": os.Getenv("PRISMALINK_MERCHANT_ID"),
		"prismalink_key_id":      os.Getenv("PRISMALINK_KEY_ID"),
		"prismalink_secret_key":  os.Getenv("PRISMALINK_SECRET_KEY"),
		"prismalink_url":         os.Getenv("PRISMALINK_URL"),
		"store_postal_code":      os.Getenv("STORE_POSTAL_CODE"),
		"store_address":          os.Getenv("STORE_ADDRESS"),
	}

	for key, val := range envFallbacks {
		if !existingKeys[key] && val != "" {
			settings = append(settings, models.Setting{
				Key:   key,
				Value: val,
			})
		}
	}

	c.JSON(http.StatusOK, settings)
}

// GetPublicSettings - List only safe public settings
func GetPublicSettings(c *gin.Context) {
	cacheMutex.Lock()
	if time.Now().Before(cacheExpiry) && publicSettingsCache != nil {
		data := publicSettingsCache
		cacheMutex.Unlock()
		c.JSON(http.StatusOK, data)
		return
	}
	cacheMutex.Unlock()

	var settings []models.Setting
	// Define safe keys to expose
	safeKeys := []string{"store_name", "store_url", "currency", "enable_bank_transfer", "bank_account", "po_deposit_percentage",
		"company_name", "company_tagline", "company_address", "company_email", "company_phone", "store_email", "maintenance_mode",
		"bank_name", "bank_account_number", "bank_account_name"}

	// Fetch safe keys AND any keys starting with 'theme_'
	if err := config.DB.Where("key IN ? OR key LIKE 'theme_%'", safeKeys).Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Update Cache
	cacheMutex.Lock()
	publicSettingsCache = settings
	cacheExpiry = time.Now().Add(5 * time.Minute)
	cacheMutex.Unlock()

	c.JSON(http.StatusOK, settings)
}

// UpdateSetting - Save or update a setting
func UpdateSetting(c *gin.Context) {
	var input models.Setting
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var setting models.Setting
	if err := config.DB.Where("key = ?", input.Key).First(&setting).Error; err == nil {
		// Update
		setting.Value = input.Value
		setting.Group = input.Group
		config.DB.Save(&setting)
	} else {
		// Create
		config.DB.Create(&input)
	}

	// Invalidate cache on update
	cacheMutex.Lock()
	publicSettingsCache = nil
	cacheExpiry = time.Time{}
	cacheMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "Setting saved"})
}

// BulkUpdateSettings - Save or update multiple settings in one request
func BulkUpdateSettings(c *gin.Context) {
	var inputs []models.Setting
	if err := c.ShouldBindJSON(&inputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := config.DB.Begin()
	for _, input := range inputs {
		var setting models.Setting
		if err := tx.Where("key = ?", input.Key).First(&setting).Error; err == nil {
			setting.Value = input.Value
			setting.Group = input.Group
			tx.Save(&setting)
		} else {
			tx.Create(&input)
		}
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("❌ BulkUpdateSettings commit error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	// Invalidate cache
	cacheMutex.Lock()
	publicSettingsCache = nil
	cacheExpiry = time.Time{}
	cacheMutex.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "Settings saved", "count": len(inputs)})
}

// GetShippingRates - List all shipping rates with optional filters
func GetShippingRates(c *gin.Context) {
	var rates []models.ShippingRate
	query := config.DB

	// Optional filters
	if zone := c.Query("zone"); zone != "" {
		query = query.Where("zone = ?", zone)
	}
	if method := c.Query("method"); method != "" {
		query = query.Where("method = ?", method)
	}
	if activeOnly := c.Query("active"); activeOnly == "true" {
		query = query.Where("active = ?", true)
	}
	if country := c.Query("country"); country != "" {
		query = query.Where("country = ?", country)
	}

	query.Order("display_order ASC, zone ASC, method ASC").Find(&rates)
	log.Printf("📦 GetShippingRates: Found %d rates", len(rates))
	c.JSON(http.StatusOK, rates)
}

// CreateShippingRate - Add new shipping rate
func CreateShippingRate(c *gin.Context) {
	var input models.ShippingRate
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("❌ CreateShippingRate Binding Error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("📦 Creating Rate: %+v", input)

	if err := config.DB.Create(&input).Error; err != nil {
		log.Printf("❌ CreateShippingRate DB Error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create rate"})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// UpdateShippingRate - Update existing shipping rate
func UpdateShippingRate(c *gin.Context) {
	id := c.Param("id")
	var rate models.ShippingRate

	if err := config.DB.First(&rate, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipping rate not found"})
		return
	}

	var input models.ShippingRate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	rate.Zone = input.Zone
	rate.Country = input.Country
	rate.Region = input.Region
	rate.Method = input.Method
	rate.BaseCost = input.BaseCost
	rate.CostPerKg = input.CostPerKg
	rate.MinChargeWeight = input.MinChargeWeight
	rate.MaxWeight = input.MaxWeight
	rate.EstDaysMin = input.EstDaysMin
	rate.EstDaysMax = input.EstDaysMax
	rate.Active = input.Active
	rate.DisplayOrder = input.DisplayOrder

	if err := config.DB.Save(&rate).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update rate"})
		return
	}

	c.JSON(http.StatusOK, rate)
}

// DeleteShippingRate - Delete shipping rate
func DeleteShippingRate(c *gin.Context) {
	id := c.Param("id")

	if err := config.DB.Delete(&models.ShippingRate{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete rate"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shipping rate deleted"})
}

// GetActiveCouriers - List all active courier templates
func GetActiveCouriers(c *gin.Context) {
	var carriers []models.CarrierTemplate
	if err := config.DB.Where("active = ?", true).Order("name ASC").Find(&carriers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch carriers"})
		return
	}
	c.JSON(http.StatusOK, carriers)
}
