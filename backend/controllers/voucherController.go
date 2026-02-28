package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================
// ADMIN VOUCHER MANAGEMENT
// ============================================

// GetVouchers - List all vouchers with stats
func GetVouchers(c *gin.Context) {
	var vouchers []models.Voucher
	query := config.DB.Preload("Creator")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	// Filter by type
	if vType := c.Query("type"); vType != "" {
		query = query.Where("type = ?", vType)
	}
	// Search by code
	if search := c.Query("search"); search != "" {
		query = query.Where("code ILIKE ?", "%"+search+"%")
	}

	query.Order("created_at DESC").Find(&vouchers)

	// Auto-update expired status
	now := time.Now()
	for i := range vouchers {
		if vouchers[i].EndDate != nil && now.After(*vouchers[i].EndDate) && vouchers[i].Status == "active" {
			config.DB.Model(&vouchers[i]).Update("status", "expired")
			vouchers[i].Status = "expired"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"vouchers": vouchers,
		"total":    len(vouchers),
	})
}

// GetVoucher - Get single voucher with full details
func GetVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.
		Preload("Creator").
		Preload("Usages.User").
		Preload("Usages.Order").
		Preload("ProductRestricts.Product").
		Preload("CategoryRestricts.Category").
		First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Voucher tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, voucher)
}

// CreateVoucher - Create new voucher
func CreateVoucher(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		Code              string     `json:"code"`
		Description       string     `json:"description"`
		Type              string     `json:"type" binding:"required"`
		Value             float64    `json:"value"`
		MaxDiscount       float64    `json:"max_discount"`
		FreeShipping      bool       `json:"free_shipping"`
		MinSpend          float64    `json:"min_spend"`
		MaxSpend          float64    `json:"max_spend"`
		UsageLimitGlobal  int        `json:"usage_limit_global"`
		UsageLimitPerUser int        `json:"usage_limit_per_user"`
		IndividualUse     bool       `json:"individual_use"`
		StartDate         *time.Time `json:"start_date"`
		EndDate           *time.Time `json:"end_date"`
		Status            string     `json:"status"`
		ProductIDs        []struct {
			ID   uint   `json:"id"`
			Type string `json:"type"` // include/exclude
		} `json:"product_ids"`
		CategoryIDs []struct {
			ID   uint   `json:"id"`
			Type string `json:"type"`
		} `json:"category_ids"`
		BulkGenerate int `json:"bulk_generate"` // Generate N vouchers
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-generate code if empty
	if input.Code == "" {
		input.Code = generateVoucherCode(8)
	} else {
		input.Code = strings.ToUpper(strings.TrimSpace(input.Code))
	}

	// Check code uniqueness
	var existing models.Voucher
	if config.DB.Where("code = ?", input.Code).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Kode voucher sudah digunakan"})
		return
	}

	status := input.Status
	if status == "" {
		status = "active"
	}

	perUser := input.UsageLimitPerUser
	if perUser == 0 {
		perUser = 1 // Default: 1 per user
	}

	voucher := models.Voucher{
		Code:              input.Code,
		Description:       input.Description,
		Type:              input.Type,
		Value:             input.Value,
		MaxDiscount:       input.MaxDiscount,
		FreeShipping:      input.FreeShipping,
		MinSpend:          input.MinSpend,
		MaxSpend:          input.MaxSpend,
		UsageLimitGlobal:  input.UsageLimitGlobal,
		UsageLimitPerUser: perUser,
		IndividualUse:     input.IndividualUse,
		StartDate:         input.StartDate,
		EndDate:           input.EndDate,
		Status:            status,
		CreatedBy:         user.ID,
	}

	if err := config.DB.Create(&voucher).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat voucher"})
		return
	}

	// Save product/category restrictions
	for _, p := range input.ProductIDs {
		config.DB.Create(&models.VoucherProduct{
			VoucherID: voucher.ID,
			ProductID: p.ID,
			Type:      p.Type,
		})
	}
	for _, cat := range input.CategoryIDs {
		config.DB.Create(&models.VoucherCategory{
			VoucherID:  voucher.ID,
			CategoryID: cat.ID,
			Type:       cat.Type,
		})
	}

	// Handle bulk generation
	var createdCodes []string
	createdCodes = append(createdCodes, voucher.Code)
	if input.BulkGenerate > 1 && input.BulkGenerate <= 500 {
		for i := 1; i < input.BulkGenerate; i++ {
			bulkCode := generateVoucherCode(8)
			bulkVoucher := voucher
			bulkVoucher.ID = 0
			bulkVoucher.Code = bulkCode
			bulkVoucher.UsedCount = 0
			if err := config.DB.Create(&bulkVoucher).Error; err == nil {
				createdCodes = append(createdCodes, bulkCode)
			}
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"voucher":       voucher,
		"created_codes": createdCodes,
		"message":       fmt.Sprintf("%d voucher berhasil dibuat", len(createdCodes)),
	})
}

// UpdateVoucher - Update existing voucher
func UpdateVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Voucher tidak ditemukan"})
		return
	}

	var input struct {
		Code              string     `json:"code"`
		Description       string     `json:"description"`
		Type              string     `json:"type"`
		Value             float64    `json:"value"`
		MaxDiscount       float64    `json:"max_discount"`
		FreeShipping      bool       `json:"free_shipping"`
		MinSpend          float64    `json:"min_spend"`
		MaxSpend          float64    `json:"max_spend"`
		UsageLimitGlobal  int        `json:"usage_limit_global"`
		UsageLimitPerUser int        `json:"usage_limit_per_user"`
		IndividualUse     bool       `json:"individual_use"`
		StartDate         *time.Time `json:"start_date"`
		EndDate           *time.Time `json:"end_date"`
		Status            string     `json:"status"`
		ProductIDs        []struct {
			ID   uint   `json:"id"`
			Type string `json:"type"`
		} `json:"product_ids"`
		CategoryIDs []struct {
			ID   uint   `json:"id"`
			Type string `json:"type"`
		} `json:"category_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check code uniqueness if changed
	if input.Code != "" && strings.ToUpper(input.Code) != voucher.Code {
		var existing models.Voucher
		if config.DB.Where("code = ? AND id != ?", strings.ToUpper(input.Code), voucher.ID).First(&existing).Error == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Kode voucher sudah digunakan"})
			return
		}
		voucher.Code = strings.ToUpper(input.Code)
	}

	if input.Description != "" {
		voucher.Description = input.Description
	}
	if input.Type != "" {
		voucher.Type = input.Type
	}
	if input.Value > 0 {
		voucher.Value = input.Value
	}
	voucher.MaxDiscount = input.MaxDiscount
	voucher.FreeShipping = input.FreeShipping
	voucher.MinSpend = input.MinSpend
	voucher.MaxSpend = input.MaxSpend
	voucher.UsageLimitGlobal = input.UsageLimitGlobal
	if input.UsageLimitPerUser >= 0 {
		voucher.UsageLimitPerUser = input.UsageLimitPerUser
	}
	voucher.IndividualUse = input.IndividualUse
	voucher.StartDate = input.StartDate
	voucher.EndDate = input.EndDate
	if input.Status != "" {
		voucher.Status = input.Status
	}

	config.DB.Save(&voucher)

	// Update product/category restrictions if provided
	if len(input.ProductIDs) >= 0 {
		config.DB.Where("voucher_id = ?", voucher.ID).Delete(&models.VoucherProduct{})
		for _, p := range input.ProductIDs {
			config.DB.Create(&models.VoucherProduct{
				VoucherID: voucher.ID,
				ProductID: p.ID,
				Type:      p.Type,
			})
		}
	}
	if len(input.CategoryIDs) >= 0 {
		config.DB.Where("voucher_id = ?", voucher.ID).Delete(&models.VoucherCategory{})
		for _, cat := range input.CategoryIDs {
			config.DB.Create(&models.VoucherCategory{
				VoucherID:  voucher.ID,
				CategoryID: cat.ID,
				Type:       cat.Type,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Voucher berhasil diperbarui", "voucher": voucher})
}

// DeleteVoucher - Soft delete (disable) a voucher, or hard delete if already disabled
func DeleteVoucher(c *gin.Context) {
	id := c.Param("id")
	forceDelete := c.Query("force") == "true"

	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Voucher tidak ditemukan"})
		return
	}

	if forceDelete {
		// Hard Delete: clear relations first if not using cascade
		config.DB.Where("voucher_id = ?", voucher.ID).Delete(&models.VoucherProduct{})
		config.DB.Where("voucher_id = ?", voucher.ID).Delete(&models.VoucherCategory{})
		config.DB.Where("voucher_id = ?", voucher.ID).Delete(&models.VoucherUsage{})
		config.DB.Delete(&voucher)
		c.JSON(http.StatusOK, gin.H{"message": "Voucher berhasil dihapus secara permanen"})
		return
	}

	config.DB.Model(&voucher).Update("status", "disabled")
	c.JSON(http.StatusOK, gin.H{"message": "Voucher berhasil dinonaktifkan"})
}

// EnableVoucher - Activate a disabled or expired voucher manually
func EnableVoucher(c *gin.Context) {
	id := c.Param("id")
	var voucher models.Voucher
	if err := config.DB.First(&voucher, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Voucher tidak ditemukan"})
		return
	}
	config.DB.Model(&voucher).Update("status", "active")
	c.JSON(http.StatusOK, gin.H{"message": "Voucher berhasil diaktifkan kembali"})
}

// DuplicateVoucher - Clone a voucher with new code
func DuplicateVoucher(c *gin.Context) {
	id := c.Param("id")
	var src models.Voucher
	if err := config.DB.Preload("ProductRestricts").Preload("CategoryRestricts").First(&src, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Voucher tidak ditemukan"})
		return
	}

	newCode := src.Code + "-" + generateVoucherCode(4)
	newVoucher := src
	newVoucher.ID = 0
	newVoucher.Code = newCode
	newVoucher.UsedCount = 0
	newVoucher.Status = "active"
	newVoucher.CreatedAt = time.Now()
	newVoucher.UpdatedAt = time.Now()

	config.DB.Create(&newVoucher)

	for _, p := range src.ProductRestricts {
		config.DB.Create(&models.VoucherProduct{VoucherID: newVoucher.ID, ProductID: p.ProductID, Type: p.Type})
	}
	for _, cat := range src.CategoryRestricts {
		config.DB.Create(&models.VoucherCategory{VoucherID: newVoucher.ID, CategoryID: cat.CategoryID, Type: cat.Type})
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Voucher berhasil diduplikasi", "voucher": newVoucher})
}

// GetVoucherStats - Dashboard stats for vouchers
func GetVoucherStats(c *gin.Context) {
	var stats struct {
		TotalVouchers   int64   `json:"total_vouchers"`
		ActiveVouchers  int64   `json:"active_vouchers"`
		ExpiredVouchers int64   `json:"expired_vouchers"`
		TotalUsage      int64   `json:"total_usage"`
		TotalDiscount   float64 `json:"total_discount"`
	}

	config.DB.Model(&models.Voucher{}).Count(&stats.TotalVouchers)
	config.DB.Model(&models.Voucher{}).Where("status = 'active'").Count(&stats.ActiveVouchers)
	config.DB.Model(&models.Voucher{}).Where("status = 'expired'").Count(&stats.ExpiredVouchers)
	config.DB.Model(&models.VoucherUsage{}).Count(&stats.TotalUsage)
	config.DB.Model(&models.VoucherUsage{}).Select("COALESCE(SUM(discount_amount), 0)").Scan(&stats.TotalDiscount)

	// Top vouchers by usage
	type TopVoucher struct {
		Code       string  `json:"code"`
		UsedCount  int     `json:"used_count"`
		TotalSaved float64 `json:"total_saved"`
	}
	var topVouchers []TopVoucher
	config.DB.Table("vouchers").
		Select("vouchers.code, vouchers.used_count, COALESCE(SUM(voucher_usages.discount_amount), 0) as total_saved").
		Joins("LEFT JOIN voucher_usages ON vouchers.id = voucher_usages.voucher_id").
		Group("vouchers.id, vouchers.code, vouchers.used_count").
		Order("vouchers.used_count DESC").
		Limit(5).
		Scan(&topVouchers)

	c.JSON(http.StatusOK, gin.H{
		"stats":        stats,
		"top_vouchers": topVouchers,
	})
}

// ============================================
// CUSTOMER VOUCHER ENDPOINTS
// ============================================

// ValidateVoucherForCart - Customer validates a voucher code
func ValidateVoucherForCart(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		Code        string  `json:"code" binding:"required"`
		CartTotal   float64 `json:"cart_total" binding:"required"`
		ProductIDs  []uint  `json:"product_ids"`
		CategoryIDs []uint  `json:"category_ids"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak lengkap"})
		return
	}

	code := strings.ToUpper(strings.TrimSpace(input.Code))
	result := ValidateVoucher(code, user.ID, input.CartTotal, input.ProductIDs, input.CategoryIDs)

	if !result.Valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": result.Message})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":           true,
		"discount_amount": result.DiscountAmount,
		"free_shipping":   result.FreeShipping,
		"message":         result.Message,
		"voucher": gin.H{
			"code":  result.Voucher.Code,
			"type":  result.Voucher.Type,
			"value": result.Voucher.Value,
		},
	})
}

// ============================================
// CORE VALIDATION ENGINE
// ============================================

// ValidateVoucher - Central voucher validation logic
func ValidateVoucher(code string, userID uint, cartTotal float64, productIDs []uint, categoryIDs []uint) models.VoucherValidationResult {
	var voucher models.Voucher
	if err := config.DB.
		Preload("ProductRestricts").
		Preload("CategoryRestricts").
		Where("code = ?", code).
		First(&voucher).Error; err != nil {
		return models.VoucherValidationResult{Valid: false, Message: "Kode voucher tidak valid"}
	}

	now := time.Now()

	// 1. Status check
	if voucher.Status == "disabled" {
		return models.VoucherValidationResult{Valid: false, Message: "Voucher telah dinonaktifkan"}
	}
	if voucher.Status == "expired" {
		return models.VoucherValidationResult{Valid: false, Message: "Voucher telah kedaluwarsa"}
	}

	// 2. Date validity
	if voucher.StartDate != nil && now.Before(*voucher.StartDate) {
		return models.VoucherValidationResult{Valid: false, Message: fmt.Sprintf("Voucher belum aktif. Aktif mulai %s", voucher.StartDate.Format("02 Jan 2006"))}
	}
	if voucher.EndDate != nil && now.After(*voucher.EndDate) {
		config.DB.Model(&voucher).Update("status", "expired")
		return models.VoucherValidationResult{Valid: false, Message: "Voucher telah kedaluwarsa"}
	}

	// 3. Global usage limit
	if voucher.UsageLimitGlobal > 0 && voucher.UsedCount >= voucher.UsageLimitGlobal {
		return models.VoucherValidationResult{Valid: false, Message: "Kuota voucher telah habis"}
	}

	// 4. Per-user usage limit
	if voucher.UsageLimitPerUser > 0 {
		var userUsageCount int64
		config.DB.Model(&models.VoucherUsage{}).
			Where("voucher_id = ? AND user_id = ?", voucher.ID, userID).
			Count(&userUsageCount)
		if int(userUsageCount) >= voucher.UsageLimitPerUser {
			return models.VoucherValidationResult{Valid: false, Message: fmt.Sprintf("Kamu sudah menggunakan voucher ini %d kali (maks. %d kali)", userUsageCount, voucher.UsageLimitPerUser)}
		}
	}

	// 5. Minimum spend
	if voucher.MinSpend > 0 && cartTotal < voucher.MinSpend {
		return models.VoucherValidationResult{Valid: false, Message: fmt.Sprintf("Minimum pembelian Rp %.0f untuk menggunakan voucher ini", voucher.MinSpend)}
	}

	// 6. Maximum spend
	if voucher.MaxSpend > 0 && cartTotal > voucher.MaxSpend {
		return models.VoucherValidationResult{Valid: false, Message: fmt.Sprintf("Maksimum pembelian Rp %.0f untuk menggunakan voucher ini", voucher.MaxSpend)}
	}

	// 7. Product/Category restrictions
	if len(voucher.ProductRestricts) > 0 {
		eligible := false
		for _, restrict := range voucher.ProductRestricts {
			if restrict.Type == "include" {
				for _, pid := range productIDs {
					if pid == restrict.ProductID {
						eligible = true
						break
					}
				}
			}
		}
		if !eligible {
			return models.VoucherValidationResult{Valid: false, Message: "Voucher tidak berlaku untuk produk yang dipilih"}
		}
	}

	// 8. Calculate discount
	discountAmount := calculateDiscount(voucher, cartTotal)

	return models.VoucherValidationResult{
		Valid:          true,
		DiscountAmount: discountAmount,
		FreeShipping:   voucher.FreeShipping,
		Message:        fmt.Sprintf("Voucher berhasil diterapkan! Hemat Rp %.0f", discountAmount),
		Voucher:        &voucher,
	}
}

// calculateDiscount - Compute discount amount based on voucher type
func calculateDiscount(voucher models.Voucher, cartTotal float64) float64 {
	switch voucher.Type {
	case "percentage":
		discount := cartTotal * (voucher.Value / 100)
		if voucher.MaxDiscount > 0 && discount > voucher.MaxDiscount {
			discount = voucher.MaxDiscount
		}
		return discount
	case "fixed":
		if voucher.Value > cartTotal {
			return cartTotal
		}
		return voucher.Value
	case "shipping":
		// Shipping discount calculated separately
		return 0
	default:
		return 0
	}
}

// ApplyVoucherToOrder - Record voucher usage after order is placed
func ApplyVoucherToOrder(voucherCode string, userID uint, orderID uint, discountAmount float64) error {
	if voucherCode == "" {
		return nil
	}
	var voucher models.Voucher
	if err := config.DB.Where("code = ?", voucherCode).First(&voucher).Error; err != nil {
		return err
	}

	// Record usage
	config.DB.Create(&models.VoucherUsage{
		VoucherID:      voucher.ID,
		UserID:         userID,
		OrderID:        &orderID,
		DiscountAmount: discountAmount,
		UsedAt:         time.Now(),
	})

	// Increment used count
	config.DB.Model(&models.Voucher{}).Where("id = ?", voucher.ID).UpdateColumn("used_count", gorm.Expr("used_count + 1"))
	return nil
}

// IncVoucherUsage - Helper to increment used_count safely
func IncVoucherUsage(voucherCode string) {
	config.DB.Model(&models.Voucher{}).Where("code = ?", voucherCode).UpdateColumn("used_count", gorm.Expr("used_count + 1"))
}

// generateVoucherCode - Random alphanumeric code
func generateVoucherCode(n int) string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	rand.Seed(time.Now().UnixNano())
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// GetVoucherUsages - Get usage history for a specific voucher
func GetVoucherUsages(c *gin.Context) {
	id := c.Param("id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit := 20
	offset := (page - 1) * limit

	var usages []models.VoucherUsage
	var total int64
	config.DB.Model(&models.VoucherUsage{}).Where("voucher_id = ?", id).Count(&total)
	config.DB.Preload("User").Preload("Order").
		Where("voucher_id = ?", id).
		Order("used_at DESC").
		Limit(limit).Offset(offset).
		Find(&usages)

	c.JSON(http.StatusOK, gin.H{
		"usages": usages,
		"total":  total,
		"page":   page,
	})
}
