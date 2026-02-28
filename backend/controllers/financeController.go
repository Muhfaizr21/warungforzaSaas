package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// ============================================
// COA (Chart of Accounts) - FULL CRUD
// ============================================

// GetCOAs - List all Chart of Accounts
func GetCOAs(c *gin.Context) {
	var coas []models.COA

	query := config.DB.Order("code asc")

	// Optional filter by type
	if coaType := c.Query("type"); coaType != "" {
		query = query.Where("type = ?", coaType)
	}

	if err := query.Find(&coas).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch COAs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": coas})
}

// GetCOA - Get single COA by ID
func GetCOA(c *gin.Context) {
	id := c.Param("id")
	var coa models.COA

	if err := config.DB.First(&coa, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "COA not found"})
		return
	}
	c.JSON(http.StatusOK, coa)
}

// CreateCOA - Create new Chart of Account
func CreateCOA(c *gin.Context) {
	var input models.COA
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svc := services.NewFinanceService()
	coa, err := svc.CreateCOA(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, coa)
}

// GetNextCOACode - Suggests the next available code for a type or parent
func GetNextCOACode(c *gin.Context) {
	coaType := c.Query("type")
	parentID := c.Query("parent_id")

	svc := services.NewFinanceService()
	code, err := svc.GetNextCOACode(coaType, parentID)
	if err != nil {
		// Fallback or error
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": code})
}

// UpdateCOA - Update existing COA
func UpdateCOA(c *gin.Context) {
	id := c.Param("id")
	var coa models.COA

	if err := config.DB.First(&coa, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "COA not found"})
		return
	}

	var input struct {
		Code       string  `json:"code"`
		Name       string  `json:"name"`
		Type       string  `json:"type"`
		ParentID   *uint   `json:"parent_id"`
		IsActive   *bool   `json:"is_active"`
		CanPost    *bool   `json:"can_post"`
		MappingKey *string `json:"mapping_key"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Code != "" {
		coa.Code = input.Code
	}
	if input.Name != "" {
		coa.Name = input.Name
	}
	if input.Type != "" {
		coa.Type = input.Type
	}
	if input.ParentID != nil {
		coa.ParentID = input.ParentID
	}
	if input.IsActive != nil {
		coa.IsActive = *input.IsActive
	}
	if input.CanPost != nil {
		coa.CanPost = *input.CanPost
	}
	if input.MappingKey != nil {
		if *input.MappingKey == "" {
			coa.MappingKey = nil
		} else {
			coa.MappingKey = input.MappingKey
		}
	}

	if err := config.DB.Save(&coa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update COA: " + err.Error()})
		return
	}

	helpers.LogAuditSimple(0, "finance", "UPDATE", coa.ID, "Updated COA: "+coa.Name)
	c.JSON(http.StatusOK, coa)
}

// DeleteCOA - Delete COA
func DeleteCOA(c *gin.Context) {
	id := c.Param("id")
	var coa models.COA

	if err := config.DB.First(&coa, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "COA not found"})
		return
	}

	if err := config.DB.Delete(&coa).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete COA"})
		return
	}

	helpers.LogAuditSimple(0, "finance", "DELETE", coa.ID, "Deleted COA: "+coa.Name)
	c.JSON(http.StatusOK, gin.H{"message": "COA deleted successfully"})
}

// ============================================
// JOURNAL ENTRIES (General Ledger)
// ============================================

// GetJournalEntries - List journal entries
func GetJournalEntries(c *gin.Context) {
	var entries []models.JournalEntry
	limit, _ := parseInt(c.DefaultQuery("limit", "50"))
	offset, _ := parseInt(c.DefaultQuery("offset", "0"))

	// ✅ FIX: Cap limit to prevent DoS via ?limit=999999
	if limit > 200 {
		limit = 200
	}
	if limit < 1 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	period := c.Query("period")

	query := config.DB.Preload("Items.COA").Order("date desc, created_at desc")

	if period != "" && period != "all" {
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		var since time.Time
		if period == "1m" {
			since = today.AddDate(0, -1, 0)
		} else if period == "6m" {
			since = today.AddDate(0, -6, 0)
		} else if period == "1y" {
			since = today.AddDate(-1, 0, 0)
		}
		if !since.IsZero() {
			query = query.Where("date >= ?", since)
		}
	}

	if err := query.Limit(limit).Offset(offset).Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": entries})
}

// GetJournalEntry - Get single journal
func GetJournalEntry(c *gin.Context) {
	id := c.Param("id")
	var entry models.JournalEntry

	if err := config.DB.Preload("Items.COA").First(&entry, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal entry not found"})
		return
	}
	c.JSON(http.StatusOK, entry)
}

// CreateJournalEntry - Manual Journal Entry
func CreateJournalEntry(c *gin.Context) {
	var input services.JournalInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svc := services.NewFinanceService()
	entry, err := svc.CreateManualJournal(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// ============================================
// EXPENSES (Simple Interface for Ops)
// ============================================

// GetExpenses - List expenses
func GetExpenses(c *gin.Context) {
	var expenses []models.Expense
	limit, _ := parseInt(c.DefaultQuery("limit", "20"))

	// ✅ FIX: Cap limit to prevent DoS via large limit values
	if limit > 200 {
		limit = 200
	}
	if limit < 1 {
		limit = 20
	}

	period := c.Query("period")

	query := config.DB.Preload("COA").Order("date desc")

	if period != "" && period != "all" {
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		var since time.Time
		if period == "1m" {
			since = today.AddDate(0, -1, 0)
		} else if period == "6m" {
			since = today.AddDate(0, -6, 0)
		} else if period == "1y" {
			since = today.AddDate(-1, 0, 0)
		}
		if !since.IsZero() {
			query = query.Where("date >= ?", since)
		}
	}

	if err := query.Limit(limit).Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": expenses})
}

// GetExpense - Get single expense
func GetExpense(c *gin.Context) {
	id := c.Param("id")
	var expense models.Expense

	if err := config.DB.Preload("COA").First(&expense, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}
	c.JSON(http.StatusOK, expense)
}

// CreateExpense - Create expense & Auto Journal
func CreateExpense(c *gin.Context) {
	userID := c.GetUint("userID")

	var input struct {
		COAID       uint    `json:"coa_id" binding:"required"`
		Amount      float64 `json:"amount" binding:"required,gt=0"`
		Description string  `json:"description" binding:"required"`
		Vendor      string  `json:"vendor"`
		Date        string  `json:"date"` // YYYY-MM-DD
		Attachment  string  `json:"attachment"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parsedDate, _ := time.Parse("2006-01-02", input.Date)
	if parsedDate.IsZero() {
		parsedDate = time.Now()
	}

	svc := services.NewFinanceService()
	expense, err := svc.CreateExpense(services.ExpenseInput{
		COAID:       input.COAID,
		Amount:      input.Amount,
		Description: input.Description,
		Vendor:      input.Vendor,
		Date:        parsedDate,
		UserID:      userID,
		Attachment:  input.Attachment,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

// UpdateExpense - Update expense (only description, vendor, attachment)
func UpdateExpense(c *gin.Context) {
	id := c.Param("id")
	var expense models.Expense

	if err := config.DB.First(&expense, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	var input struct {
		Vendor       string `json:"vendor"`
		Description  string `json:"description"`
		Attachment   string `json:"attachment"`
		IsRecurring  *bool  `json:"is_recurring"`
		RecurringDay *int   `json:"recurring_day"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Note: We don't allow changing amount/COA as it would require journal reversal
	if input.Vendor != "" {
		expense.Vendor = input.Vendor
	}
	if input.Description != "" {
		expense.Description = input.Description
	}
	if input.Attachment != "" {
		expense.Attachment = input.Attachment
	}
	if input.IsRecurring != nil {
		expense.IsRecurring = *input.IsRecurring
	}
	if input.RecurringDay != nil {
		expense.RecurringDay = *input.RecurringDay
	}

	if err := config.DB.Save(&expense).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	helpers.LogAuditSimple(0, "finance", "UPDATE", expense.ID, "Updated expense: "+expense.Description)
	c.JSON(http.StatusOK, expense)
}

// DeleteExpense - Delete expense (with journal reversal)
func DeleteExpense(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)
	userID := c.GetUint("userID")

	svc := services.NewFinanceService()
	if err := svc.DeleteExpense(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Expense deleted and journal reversed"})
}

// ============================================
// FINANCE STATS & REPORTS
// ============================================

// GetFinanceStats - Basic summary for dashboard
func GetFinanceStats(c *gin.Context) {
	period := c.DefaultQuery("period", "6m")

	svc := services.NewFinanceService()
	stats, err := svc.GetFinanceStats(period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetCashFlowTrend - Monthly revenue vs expense trend
func GetCashFlowTrend(c *gin.Context) {
	period := c.DefaultQuery("period", "6m")
	var monthCount int
	var sinceTime time.Time
	isFiltered := false

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch period {
	case "1m":
		monthCount = 3 // Minimum 3 months for trend visibility
		sinceTime = today.AddDate(0, -3, 0)
		isFiltered = true
	case "6m":
		monthCount = 6
		sinceTime = today.AddDate(0, -6, 0)
		isFiltered = true
	case "1y":
		monthCount = 12
		sinceTime = today.AddDate(-1, 0, 0)
		isFiltered = true
	case "all":
		// For 'all', we search back reasonably or just show everything.
		var oldestEntry models.JournalEntry
		if err := config.DB.Order("date asc").First(&oldestEntry).Error; err == nil {
			duration := time.Since(oldestEntry.Date)
			monthCount = int(duration.Hours() / (24 * 30))
			if monthCount < 6 {
				monthCount = 6
			} else if monthCount > 60 {
				monthCount = 60
			}
			sinceTime = oldestEntry.Date
		} else {
			monthCount = 6
			sinceTime = today.AddDate(0, -6, 0)
		}
		isFiltered = false
	default:
		monthCount = 6
		sinceTime = today.AddDate(0, -6, 0)
		isFiltered = true
	}

	type TrendData struct {
		Month   string  `json:"name"`
		Revenue float64 `json:"revenue"`
		Expense float64 `json:"expense"`
	}

	// Prepare result map
	results := make(map[string]*TrendData)
	months := []string{}

	// If 1 month requested, maybe show daily trend?
	// But let's stick to monthly for consistency as requested across 1m/6m/1y.
	// Actually for 1m, "Monthly" trend is just one point.
	// Let's generate keys.
	for i := monthCount - 1; i >= 0; i-- {
		m := time.Now().AddDate(0, -i, 0).Format("Jan")
		months = append(months, m)
		results[m] = &TrendData{Month: m, Revenue: 0, Expense: 0}
	}

	// Query Revenue
	revQuery := config.DB.Table("journal_items ji").
		Select("TO_CHAR(je.date, 'Mon') as month, COALESCE(SUM(ji.credit - ji.debit), 0) as total").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("c.type = ?", "REVENUE")

	if isFiltered {
		revQuery = revQuery.Where("je.date >= ?", sinceTime)
	}

	rows, err := revQuery.Group("TO_CHAR(je.date, 'Mon')").Rows()

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var month string
			var total float64
			rows.Scan(&month, &total)
			if val, ok := results[month]; ok {
				val.Revenue = total
			}
		}
	}

	// Query Expenses (EXPENSE + COGS)
	expTrendQuery := config.DB.Table("journal_items ji").
		Select("TO_CHAR(je.date, 'Mon') as month, COALESCE(SUM(ji.debit - ji.credit), 0) as total").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("(c.type = ? OR c.type = ?)", "EXPENSE", "COGS")

	if isFiltered {
		expTrendQuery = expTrendQuery.Where("je.date >= ?", sinceTime)
	}

	rowsExp, err := expTrendQuery.Group("TO_CHAR(je.date, 'Mon')").Rows()

	if err == nil {
		defer rowsExp.Close()
		for rowsExp.Next() {
			var month string
			var total float64
			rowsExp.Scan(&month, &total)
			if val, ok := results[month]; ok {
				val.Expense = total
			}
		}
	}

	// Convert map to slice in correct order
	var finalResult []TrendData
	for _, m := range months {
		if val, ok := results[m]; ok {
			finalResult = append(finalResult, *val)
		}
	}

	c.JSON(http.StatusOK, finalResult)
}

// GetProfitLossReport - Profit & Loss Report
func GetProfitLossReport(c *gin.Context) {
	// Get date range
	fromDate := c.Query("from_date")
	toDate := c.Query("to_date")

	if fromDate == "" {
		fromDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if toDate == "" {
		toDate = time.Now().Format("2006-01-02")
	}

	// Revenue breakdown
	var revenues []struct {
		COACode string  `json:"coa_code"`
		COAName string  `json:"coa_name"`
		Total   float64 `json:"total"`
	}
	config.DB.Table("journal_items ji").
		Select("c.code as coa_code, c.name as coa_name, COALESCE(SUM(ji.credit - ji.debit), 0) as total").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("c.type = ? AND je.date BETWEEN ? AND ?", "REVENUE", fromDate, toDate).
		Group("c.id, c.code, c.name").
		Scan(&revenues)

	// Expense breakdown
	var expenses []struct {
		COACode string  `json:"coa_code"`
		COAName string  `json:"coa_name"`
		Total   float64 `json:"total"`
	}
	config.DB.Table("journal_items ji").
		Select("c.code as coa_code, c.name as coa_name, COALESCE(SUM(ji.debit - ji.credit), 0) as total").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("(c.type = ? OR c.type = ?) AND je.date BETWEEN ? AND ?", "EXPENSE", "COGS", fromDate, toDate).
		Group("c.id, c.code, c.name").
		Scan(&expenses)

	// Calculate totals
	var totalRevenue, totalExpense float64
	for _, r := range revenues {
		totalRevenue += r.Total
	}
	for _, e := range expenses {
		totalExpense += e.Total
	}

	c.JSON(http.StatusOK, gin.H{
		"from_date":     fromDate,
		"to_date":       toDate,
		"revenues":      revenues,
		"expenses":      expenses,
		"total_revenue": totalRevenue,
		"total_expense": totalExpense,
		"net_profit":    totalRevenue - totalExpense,
	})
}

// Helper function to parse int
func parseInt(s string) (int, error) {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}
