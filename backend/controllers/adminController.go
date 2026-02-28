package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ============================================
// CUSTOMER CONTROLLERS (Admin View)
// ============================================

// CreateSystemUser - Create a new staff/user with specific role
func CreateSystemUser(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		RoleID   uint   `json:"role_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create User Logic via Service
	admin := c.MustGet("currentUser").(models.User)
	svc := services.NewUserService()

	user, err := svc.CreateSystemUser(input.Username, input.Email, input.Password, input.RoleID, admin.ID, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "data": user})
}

// GetCustomerStats - Aggregated stats for dashboard
func GetCustomerStats(c *gin.Context) {
	var total int64
	var active int64
	var pending int64
	var banned int64
	var newThisMonth int64

	// Base query for customers (role = user)
	baseQuery := config.DB.Model(&models.User{}).
		Joins("INNER JOIN roles ON roles.id = users.role_id").
		Where("roles.slug = ?", models.RoleUser)

	// Total
	baseQuery.Count(&total)

	// Active
	baseQuery.Session(&gorm.Session{}).Where("users.status = ?", "active").Count(&active)

	// Pending
	baseQuery.Session(&gorm.Session{}).Where("users.status = ?", "pending").Count(&pending)

	// Banned
	baseQuery.Session(&gorm.Session{}).Where("users.status = ?", "banned").Count(&banned)

	// New This Month
	startOfMonth := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Local)
	baseQuery.Session(&gorm.Session{}).Where("users.created_at >= ?", startOfMonth).Count(&newThisMonth)

	c.JSON(http.StatusOK, gin.H{
		"total":          total,
		"active":         active,
		"pending":        pending,
		"banned":         banned,
		"new_this_month": newThisMonth,
	})
}

func GetCustomers(c *gin.Context) {
	var customers []models.User

	// Unified role: only show registered users/customers
	query := config.DB.Model(&models.User{}).
		Select("users.*, "+
			"(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) as orders_count, "+
			"(SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE orders.user_id = users.id AND status IN ('paid', 'processing', 'shipped', 'delivered', 'completed')) as total_spent").
		Preload("Role").
		Joins("INNER JOIN roles ON roles.id = users.role_id").
		Where("roles.slug = ?", models.RoleUser)

	// Filter by Status
	if status := c.Query("status"); status != "" {
		query = query.Where("users.status = ?", status)
	}

	// Search Query
	if search := c.Query("search"); search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("users.email ILIKE ? OR users.full_name ILIKE ? OR users.username ILIKE ?", searchTerm, searchTerm, searchTerm)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "500"))
	offset := (page - 1) * limit

	var total int64
	// Clone query for count
	countQuery := config.DB.Model(&models.User{}).
		Joins("INNER JOIN roles ON roles.id = users.role_id").
		Where("roles.slug = ?", models.RoleUser)

	// Apply same filters to count
	if status := c.Query("status"); status != "" {
		countQuery = countQuery.Where("users.status = ?", status)
	}
	if search := c.Query("search"); search != "" {
		searchTerm := "%" + search + "%"
		countQuery = countQuery.Where("users.email ILIKE ? OR users.full_name ILIKE ? OR users.username ILIKE ?", searchTerm, searchTerm, searchTerm)
	}
	countQuery.Count(&total)

	if err := query.Order("users.created_at DESC").Offset(offset).Limit(limit).Find(&customers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  customers,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func GetCustomer(c *gin.Context) {
	id := c.Param("id")

	var customer models.User
	if err := config.DB.Preload("Role").First(&customer, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	// Get customer profile if exists
	var profile models.CustomerProfile
	config.DB.Where("user_id = ?", customer.ID).First(&profile)

	// Get order count
	var orderCount int64
	config.DB.Model(&models.Order{}).Where("user_id = ?", customer.ID).Count(&orderCount)

	// Get wishlist count
	var wishlistCount int64
	config.DB.Model(&models.Wishlist{}).Where("user_id = ?", customer.ID).Count(&wishlistCount)

	// Get LTV (Total Spent from legitimate orders - exclude cancelled/pending)
	var totalSpent float64
	paidStatuses := []string{"paid", "processing", "shipped", "delivered", "completed"}
	config.DB.Model(&models.Order{}).Where("user_id = ? AND status IN ?", customer.ID, paidStatuses).Select("SUM(total_amount)").Row().Scan(&totalSpent)
	fmt.Printf("🔍 Calculated LTV for User %d: Rp %.2f (Status: %v)\n", customer.ID, totalSpent, paidStatuses)

	// Get recent orders
	var recentOrders []models.Order
	config.DB.Where("user_id = ?", customer.ID).Order("created_at DESC").Limit(10).Find(&recentOrders)

	// Get wishlisted products
	var wishlists []models.Wishlist
	config.DB.Preload("Product").Where("user_id = ?", customer.ID).Find(&wishlists)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"customer":       customer,
			"profile":        profile,
			"order_count":    orderCount,
			"wishlist_count": wishlistCount,
			"total_spent":    totalSpent,
			"recent_orders":  recentOrders,
			"wishlists":      wishlists,
		},
	})
}

func UpdateCustomerNotes(c *gin.Context) {
	id := c.Param("id")

	var profile models.CustomerProfile
	if err := config.DB.Where("user_id = ?", id).First(&profile).Error; err != nil {
		// Create new profile if not exists
		uid, _ := strconv.ParseUint(id, 10, 32)
		profile = models.CustomerProfile{
			UserID: uint(uid),
		}
	}

	var input struct {
		Notes string `json:"notes"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	profile.Notes = input.Notes
	if err := config.DB.Save(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notes"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Customer", "UpdateNotes", id,
		"Updated customer notes", nil, input, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Notes updated successfully", "data": profile})
}

// ============================================
// AUDIT LOG CONTROLLERS
// ============================================

func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog

	query := config.DB.Order("created_at DESC")

	// Filters
	if module := c.Query("module"); module != "" {
		query = query.Where("module = ?", module)
	}
	if action := c.Query("action"); action != "" {
		query = query.Where("action = ?", action)
	}
	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if objectID := c.Query("object_id"); objectID != "" {
		query = query.Where("object_id = ?", objectID)
	}

	// Date range
	if from := c.Query("from"); from != "" {
		query = query.Where("created_at >= ?", from)
	}
	if to := c.Query("to"); to != "" {
		query = query.Where("created_at <= ?", to)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.AuditLog{}).Count(&total)

	if err := query.Preload("User.Role").Offset(offset).Limit(limit).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func GetAuditLogModules(c *gin.Context) {
	// Get distinct modules for filter dropdown
	var modules []string
	config.DB.Model(&models.AuditLog{}).Distinct("module").Pluck("module", &modules)
	c.JSON(http.StatusOK, gin.H{"data": modules})
}

// ============================================
// SUPPLIER CONTROLLERS
// ============================================

func GetSuppliers(c *gin.Context) {
	var suppliers []models.Supplier
	query := config.DB

	if active := c.Query("active"); active == "true" {
		query = query.Where("active = ?", true)
	}

	if err := query.Find(&suppliers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suppliers"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": suppliers})
}

func GetSupplier(c *gin.Context) {
	id := c.Param("id")
	var supplier models.Supplier
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": supplier})
}

func CreateSupplier(c *gin.Context) {
	var input struct {
		Name    string `json:"name" binding:"required"`
		Contact string `json:"contact"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	supplier := models.Supplier{
		Name:    input.Name,
		Contact: input.Contact,
		Email:   input.Email,
		Phone:   input.Phone,
		Address: input.Address,
		Active:  true,
	}

	if err := config.DB.Create(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create supplier"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Supplier", "Create", strconv.Itoa(int(supplier.ID)),
		"Created supplier: "+supplier.Name, nil, supplier, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusCreated, gin.H{"data": supplier, "message": "Supplier created successfully"})
}

func UpdateSupplier(c *gin.Context) {
	id := c.Param("id")
	var supplier models.Supplier
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier not found"})
		return
	}

	oldData := supplier

	var input struct {
		Name    string `json:"name"`
		Contact string `json:"contact"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Address string `json:"address"`
		Active  *bool  `json:"active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		supplier.Name = input.Name
	}
	supplier.Contact = input.Contact
	supplier.Email = input.Email
	supplier.Phone = input.Phone
	supplier.Address = input.Address
	if input.Active != nil {
		supplier.Active = *input.Active
	}

	if err := config.DB.Save(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update supplier"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Supplier", "Update", id,
		"Updated supplier: "+supplier.Name, oldData, supplier, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"data": supplier, "message": "Supplier updated successfully"})
}

func DeleteSupplier(c *gin.Context) {
	id := c.Param("id")
	var supplier models.Supplier
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Supplier tidak ditemukan"})
		return
	}

	// Soft delete - just deactivate
	supplier.Active = false
	if err := config.DB.Save(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pemasok"})
		return
	}

	user := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(user.ID, "Supplier", "Delete", id,
		"Menghapus (menonaktifkan) pemasok: "+supplier.Name, nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Pemasok berhasil dihapus"})
}

// ============================================
// CARRIER TEMPLATE CONTROLLERS
// ============================================

func GetCarriers(c *gin.Context) {
	var carriers []models.CarrierTemplate
	if err := config.DB.Preload("Services").Order("name ASC").Find(&carriers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch carriers"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": carriers})
}

func SyncBiteshipCouriers(c *gin.Context) {
	apiKey := helpers.GetSetting("biteship_api_key", os.Getenv("BITESHIP_API_KEY"))
	if apiKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Biteship API Key belum dikonfigurasi"})
		return
	}

	req, _ := http.NewRequest("GET", "https://api.biteship.com/v1/couriers", nil)
	req.Header.Set("Authorization", apiKey)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal terhubung ke Biteship API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data dari Biteship"})
		return
	}

	var parsed struct {
		Success  bool `json:"success"`
		Couriers []struct {
			CourierName        string `json:"courier_name"`
			CourierCode        string `json:"courier_code"`
			CourierServiceName string `json:"courier_service_name"`
			CourierServiceCode string `json:"courier_service_code"`
			Description        string `json:"description"`
		} `json:"couriers"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal parsing respons dari Biteship API"})
		return
	}

	var currentCarriers []models.CarrierTemplate
	config.DB.Preload("Services").Find(&currentCarriers)
	codeMap := make(map[string]*models.CarrierTemplate)
	for i, cc := range currentCarriers {
		if cc.BiteshipCode != "" {
			codeMap[cc.BiteshipCode] = &currentCarriers[i]
		}
	}

	addedCount := 0
	serviceUpdatedCount := 0

	for _, cinfo := range parsed.Couriers {
		if cinfo.CourierCode == "" {
			continue
		}

		var parentCarrier *models.CarrierTemplate
		if mapped, exists := codeMap[cinfo.CourierCode]; exists {
			parentCarrier = mapped
		} else {
			// Create new carrier
			newCarrier := models.CarrierTemplate{
				Name:                cinfo.CourierName,
				BiteshipCode:        cinfo.CourierCode,
				TrackingURLTemplate: "https://biteship.com/track/" + cinfo.CourierCode,
				Active:              false,
				FallbackRate:        20000,
			}
			config.DB.Create(&newCarrier)
			codeMap[cinfo.CourierCode] = &newCarrier
			parentCarrier = &newCarrier
			addedCount++
		}

		// Create or update specific service based on Biteship data
		if cinfo.CourierServiceCode != "" && parentCarrier != nil && parentCarrier.ID > 0 {
			// Check if service already exists
			var existingService models.CarrierService
			if err := config.DB.Where("carrier_id = ? AND service_code = ?", parentCarrier.ID, cinfo.CourierServiceCode).First(&existingService).Error; err != nil {
				// Not found, create it
				newService := models.CarrierService{
					CarrierID:   parentCarrier.ID,
					ServiceCode: cinfo.CourierServiceCode,
					Name:        cinfo.CourierServiceName,
					Description: cinfo.Description,
					Active:      false, // default false so users can manually turn it on
				}
				config.DB.Create(&newService)
				serviceUpdatedCount++
			} else {
				// Update existing service description if it's different
				if existingService.Description != cinfo.Description || existingService.Name != cinfo.CourierServiceName {
					existingService.Description = cinfo.Description
					existingService.Name = cinfo.CourierServiceName
					config.DB.Save(&existingService)
					serviceUpdatedCount++
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("%d kurir baru berhasil disinkronisasi", addedCount)})
}

func CreateCarrier(c *gin.Context) {
	var input struct {
		Name                string `json:"name" binding:"required"`
		TrackingURLTemplate string `json:"tracking_url_template" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	carrier := models.CarrierTemplate{
		Name:                input.Name,
		TrackingURLTemplate: input.TrackingURLTemplate,
		Active:              true,
	}

	if err := config.DB.Create(&carrier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create carrier"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": carrier, "message": "Carrier created successfully"})
}

func UpdateCarrier(c *gin.Context) {
	id := c.Param("id")
	var carrier models.CarrierTemplate
	if err := config.DB.First(&carrier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Carrier not found"})
		return
	}

	var input struct {
		Name                string `json:"name"`
		TrackingURLTemplate string `json:"tracking_url_template"`
		Active              *bool  `json:"active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" {
		carrier.Name = input.Name
	}
	if input.TrackingURLTemplate != "" {
		carrier.TrackingURLTemplate = input.TrackingURLTemplate
	}
	if input.Active != nil {
		carrier.Active = *input.Active
	}

	if err := config.DB.Save(&carrier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update carrier"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": carrier, "message": "Carrier updated successfully"})
}

// ============================================
// SYSTEM USER / STAFF CONTROLLERS
// ============================================

func UpdateCarrierService(c *gin.Context) {
	serviceID := c.Param("service_id")
	var service models.CarrierService
	if err := config.DB.First(&service, serviceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Service not found"})
		return
	}

	var input struct {
		Active *bool `json:"active"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Active != nil {
		service.Active = *input.Active
	}

	if err := config.DB.Save(&service).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update service"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": service, "message": "Service updated successfully"})
}

// GetSystemUsers - Get list of staff users (non-customer)
func GetSystemUsers(c *gin.Context) {
	var users []models.User

	// Unified role: only show non-customer users (staff)
	query := config.DB.Model(&models.User{}).
		Select("users.*").
		Preload("Role").
		Joins("INNER JOIN roles ON roles.id = users.role_id").
		Where("roles.slug != ?", models.RoleUser)

	// Search Query
	if search := c.Query("search"); search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("email LIKE ? OR full_name LIKE ? OR username LIKE ?", searchTerm, searchTerm, searchTerm)
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset := (page - 1) * limit

	var total int64
	// Clone query for count
	countQuery := config.DB.Model(&models.User{}).
		Joins("INNER JOIN roles ON roles.id = users.role_id").
		Where("roles.slug != ?", models.RoleUser)

	if search := c.Query("search"); search != "" {
		searchTerm := "%" + search + "%"
		countQuery = countQuery.Where("email LIKE ? OR full_name LIKE ? OR username LIKE ?", searchTerm, searchTerm, searchTerm)
	}
	countQuery.Count(&total)

	if err := query.Order("users.created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch system users", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  users,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func UpdateSystemUserRole(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		RoleID uint `json:"role_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Prevent demoting Super Admin if it's the last one (Optional safety, skip for now to keep it simple)

	if err := config.DB.Model(&user).Update("role_id", input.RoleID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	// Log Audit
	admin := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(admin.ID, "User", "UpdateRole", id,
		"Updated user role to ID: "+strconv.Itoa(int(input.RoleID)), nil, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "Role updated successfully"})
}

// UpdateSystemUser - Update general staff information
func UpdateSystemUser(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Status   string `json:"status"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	oldData := user

	if input.Username != "" {
		user.Username = input.Username
	}
	if input.Email != "" {
		user.Email = input.Email
	}
	if input.FullName != "" {
		user.FullName = input.FullName
	}
	if input.Status != "" {
		user.Status = input.Status
	}

	if err := config.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Log Audit
	admin := c.MustGet("currentUser").(models.User)
	helpers.LogAudit(admin.ID, "User", "Update", id,
		"Updated system user: "+user.Username, oldData, user, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully", "data": user})
}

// DeleteSystemUser - Delete/Remove a staff account
func DeleteSystemUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Safety: prevent deleting self
	adminCtx := c.MustGet("currentUser").(models.User)
	if adminCtx.ID == user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot delete your own account"})
		return
	}

	if err := config.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// Log Audit
	helpers.LogAudit(adminCtx.ID, "User", "Delete", id,
		"Deleted system user: "+user.Username, user, nil, c.ClientIP(), c.GetHeader("User-Agent"))

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}
