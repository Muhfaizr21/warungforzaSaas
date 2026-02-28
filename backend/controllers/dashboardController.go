package controllers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// GetDashboardStats computesMetrics for the admin dashboard with period support
func GetDashboardStats(c *gin.Context) {
	period := c.DefaultQuery("period", "all")
	var sinceTime time.Time
	isFiltered := false

	switch period {
	case "1m":
		sinceTime = time.Now().AddDate(0, -1, 0)
		isFiltered = true
	case "6m":
		sinceTime = time.Now().AddDate(0, -6, 0)
		isFiltered = true
	case "1y":
		sinceTime = time.Now().AddDate(-1, 0, 0)
		isFiltered = true
	}

	var revenue float64
	var productsCount int64
	var newOrdersCount int64

	// 1. Revenue (filtered by period if requested)
	revQuery := config.DB.Model(&models.Order{}).Where("payment_status = ?", "paid")
	if isFiltered {
		revQuery = revQuery.Where("created_at >= ?", sinceTime)
	}
	revQuery.Select("COALESCE(SUM(total_amount), 0)").Scan(&revenue)

	// 2. Total Orders (filtered by period if requested)
	var totalOrdersCount int64
	orderCountQuery := config.DB.Model(&models.Order{})
	if isFiltered {
		orderCountQuery = orderCountQuery.Where("created_at >= ?", sinceTime)
	}
	orderCountQuery.Count(&totalOrdersCount)

	// 3. Pending Orders (Usually we want total pending, regardless of period, for actionability)
	config.DB.Model(&models.Order{}).Where("status = ?", "pending").Count(&newOrdersCount)

	// 4. Products & Staff (Always total/static)
	config.DB.Model(&models.Product{}).Count(&productsCount)

	var customersCount int64
	config.DB.Model(&models.User{}).
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("roles.slug = ?", models.RoleUser).
		Count(&customersCount)

	var staffCount int64
	config.DB.Model(&models.User{}).
		Joins("JOIN roles ON roles.id = users.role_id").
		Where("roles.slug != ?", models.RoleUser).
		Count(&staffCount)

	// 5. Recent Activity
	var recentOrders []models.Order
	config.DB.Preload("User").Order("created_at desc").Limit(5).Find(&recentOrders)

	var recentLogs []models.AuditLog
	config.DB.Preload("User.Role").Order("created_at desc").Limit(5).Find(&recentLogs)

	c.JSON(http.StatusOK, gin.H{
		"revenue":            revenue,
		"products_count":     productsCount,
		"total_orders_count": totalOrdersCount,
		"new_orders_count":   newOrdersCount,
		"customers_count":    customersCount,
		"staff_count":        staffCount,
		"recent_orders":      recentOrders,
		"recent_logs":        recentLogs,
		"period":             period,
	})
}

// GetSalesTrend returns the daily revenue for the last 30 days
func GetSalesTrend(c *gin.Context) {
	type Result struct {
		Date  string  `json:"date"`
		Total float64 `json:"total"`
	}

	var results []Result

	period := c.DefaultQuery("period", "30d") // 30d, 1m, 6m, 1y, all
	var sinceTime time.Time
	isFiltered := false

	switch period {
	case "7d":
		sinceTime = time.Now().AddDate(0, 0, -7)
		isFiltered = true
	case "30d", "1m":
		sinceTime = time.Now().AddDate(0, 0, -30)
		isFiltered = true
	case "90d", "3m":
		sinceTime = time.Now().AddDate(0, 0, -90)
		isFiltered = true
	case "6m":
		sinceTime = time.Now().AddDate(0, -6, 0)
		isFiltered = true
	case "1y":
		sinceTime = time.Now().AddDate(-1, 0, 0)
		isFiltered = true
	case "all":
		isFiltered = false
	default:
		sinceTime = time.Now().AddDate(0, 0, -30)
		isFiltered = true
	}

	// Postgres syntax for daily stats
	query := config.DB.Model(&models.Order{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(total_amount) as total").
		Where("payment_status = ?", "paid")

	if isFiltered {
		query = query.Where("created_at >= ?", sinceTime)
	}

	query.Group("date").
		Order("date asc").
		Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetMonthlySalesTrend returns the monthly revenue
func GetMonthlySalesTrend(c *gin.Context) {
	type Result struct {
		Month string  `json:"month"`
		Total float64 `json:"total"`
	}

	var results []Result

	period := c.DefaultQuery("period", "1y")
	var sinceTime time.Time
	isFiltered := false

	switch period {
	case "1m":
		sinceTime = time.Now().AddDate(0, -3, 0) // At least show 3 months for 1m period trend
		isFiltered = true
	case "6m":
		sinceTime = time.Now().AddDate(0, -6, 0)
		isFiltered = true
	case "1y":
		sinceTime = time.Now().AddDate(-1, 0, 0)
		isFiltered = true
	case "all":
		isFiltered = false
	default:
		sinceTime = time.Now().AddDate(-1, 0, 0)
		isFiltered = true
	}

	// Fetch sum of total_amount grouped by month
	query := config.DB.Model(&models.Order{}).
		Select("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_amount) as total").
		Where("payment_status = ?", "paid")

	if isFiltered {
		query = query.Where("created_at >= ?", sinceTime)
	}

	query.Group("month").
		Order("month asc").
		Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetTopProducts returns top selling products by quantity
func GetTopProducts(c *gin.Context) {
	type Result struct {
		ProductName string  `json:"product_name"`
		Sold        int     `json:"sold"`
		Revenue     float64 `json:"revenue"`
	}

	period := c.DefaultQuery("period", "6m")
	var sinceTime time.Time
	isFiltered := false

	if period != "all" {
		isFiltered = true
		switch period {
		case "1m":
			sinceTime = time.Now().AddDate(0, -1, 0)
		case "6m":
			sinceTime = time.Now().AddDate(0, -6, 0)
		case "1y":
			sinceTime = time.Now().AddDate(-1, 0, 0)
		default:
			sinceTime = time.Now().AddDate(0, -6, 0)
		}
	}

	var results []Result

	query := config.DB.Table("order_items").
		Select("products.name as product_name, SUM(order_items.quantity) as sold, SUM(order_items.total) as revenue").
		Joins("JOIN products ON products.id = order_items.product_id").
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ?", []string{"processing", "shipped", "delivered", "completed"})

	if isFiltered {
		query = query.Where("orders.created_at >= ?", sinceTime)
	}

	query.Group("products.name").
		Order("sold desc").
		Limit(10).
		Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetOrderStatusDistribution returns count of orders by status
func GetOrderStatusDistribution(c *gin.Context) {
	type Result struct {
		Status string `json:"status"`
		Count  int    `json:"count"`
	}

	var results []Result

	config.DB.Model(&models.Order{}).
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&results)

	if results == nil {
		results = []Result{}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// GetCustomerDemographics returns customer distribution by country based on phone number
func GetCustomerDemographics(c *gin.Context) {
	type CountryStat struct {
		Code       string  `json:"code"` // ISO code for flags
		Country    string  `json:"country"`
		Count      int     `json:"count"`
		Percentage float64 `json:"percentage"`
	}

	var users []models.User
	// Fetch users with 'user' role only
	config.DB.Joins("JOIN roles ON roles.id = users.role_id").
		Where("roles.slug = ?", models.RoleUser).
		Find(&users)

	// Fetch their profiles
	var profiles []models.CustomerProfile
	config.DB.Where("user_id IN (SELECT users.id FROM users JOIN roles ON roles.id = users.role_id WHERE roles.slug = ?)", models.RoleUser).Find(&profiles)

	profileMap := make(map[uint]models.CustomerProfile)
	for _, p := range profiles {
		profileMap[p.UserID] = p
	}

	// Map: CountryCode -> Count
	counts := make(map[string]int)

	for _, user := range users {
		code := ""

		// Attempt to get ISO code from Profile Address JSON
		if p, ok := profileMap[user.ID]; ok {
			if len(p.Address) > 0 && string(p.Address) != "null" {
				var addr map[string]interface{}
				if err := json.Unmarshal(p.Address, &addr); err == nil {
					if c, ok := addr["country"].(string); ok && c != "" {
						code = strings.ToUpper(c)
					}
				}
			}
		}

		// Fallback to Phone Prefix Mapping if code is still empty
		if code == "" && user.Phone != "" {
			phone := strings.TrimSpace(user.Phone)
			cleanPhone := strings.Map(func(r rune) rune {
				if strings.ContainsRune("0123456789+", r) {
					return r
				}
				return -1
			}, phone)

			if strings.HasPrefix(cleanPhone, "+62") || strings.HasPrefix(cleanPhone, "62") || strings.HasPrefix(cleanPhone, "08") {
				code = "ID"
			} else if strings.HasPrefix(cleanPhone, "+1") || strings.HasPrefix(cleanPhone, "1") {
				code = "US"
			} else if strings.HasPrefix(cleanPhone, "+60") || strings.HasPrefix(cleanPhone, "60") {
				code = "MY"
			} else if strings.HasPrefix(cleanPhone, "+65") || strings.HasPrefix(cleanPhone, "65") {
				code = "SG"
			} else if strings.HasPrefix(cleanPhone, "+61") || strings.HasPrefix(cleanPhone, "61") {
				code = "AU"
			} else if strings.HasPrefix(cleanPhone, "+81") || strings.HasPrefix(cleanPhone, "81") {
				code = "JP"
			} else if strings.HasPrefix(cleanPhone, "+86") || strings.HasPrefix(cleanPhone, "86") {
				code = "CN"
			} else if strings.HasPrefix(cleanPhone, "+44") || strings.HasPrefix(cleanPhone, "44") {
				code = "GB"
			} else if strings.HasPrefix(cleanPhone, "+91") || strings.HasPrefix(cleanPhone, "91") {
				code = "IN"
			} else if strings.HasPrefix(cleanPhone, "+33") || strings.HasPrefix(cleanPhone, "33") {
				code = "FR"
			} else if strings.HasPrefix(cleanPhone, "+49") || strings.HasPrefix(cleanPhone, "49") {
				code = "DE"
			}
		}

		if code == "" {
			code = "UN" // Unknown
		}

		counts[code]++
	}

	// Helper map for Country Code -> Country Name (Fallback, mostly handled by frontend now)
	countryNames := map[string]string{
		"ID": "Indonesia",
		"US": "USA",
		"MY": "Malaysia",
		"SG": "Singapore",
		"AU": "Australia",
		"JP": "Japan",
		"CN": "China",
		"GB": "United Kingdom",
		"IN": "India",
		"FR": "France",
		"DE": "Germany",
		"UN": "Unknown",
	}

	var stats []CountryStat
	totalMappedUsers := 0
	for _, count := range counts {
		totalMappedUsers += count
	}

	for code, count := range counts {
		percentage := 0.0
		if totalMappedUsers > 0 {
			percentage = (float64(count) / float64(totalMappedUsers)) * 100
		}

		name, exists := countryNames[code]
		if !exists {
			name = code // If not in our basic map, just output code. The frontend will map it to full name.
		}

		stats = append(stats, CountryStat{
			Code:       code,
			Country:    name,
			Count:      count,
			Percentage: percentage,
		})
	}

	// Sort by count desc
	for i := 0; i < len(stats)-1; i++ {
		for j := 0; j < len(stats)-i-1; j++ {
			if stats[j].Count < stats[j+1].Count {
				stats[j], stats[j+1] = stats[j+1], stats[j]
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_users": totalMappedUsers,
		"data":        stats,
	})
}
