package services

import (
	"fmt"
	"math"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"gorm.io/gorm"
)

type FinanceService struct {
	DB *gorm.DB
}

func NewFinanceService() *FinanceService {
	return &FinanceService{
		DB: config.DB,
	}
}

// ---------------------------------------------------------
// COA (Chart of Accounts)
// ---------------------------------------------------------

// CreateCOA creates a new Chart of Account
func (s *FinanceService) CreateCOA(input models.COA) (*models.COA, error) {
	// Validate type
	validTypes := map[string]bool{
		"ASSET": true, "LIABILITY": true, "EQUITY": true,
		"REVENUE": true, "EXPENSE": true, "COGS": true,
	}
	if !validTypes[input.Type] {
		return nil, fmt.Errorf("invalid COA type")
	}

	if err := s.DB.Create(&input).Error; err != nil {
		return nil, err
	}

	helpers.LogAuditSimple(0, "finance", "CREATE", input.ID, "Created COA: "+input.Name)
	return &input, nil
}

// GetNextCOACode suggests the next available code
func (s *FinanceService) GetNextCOACode(coaType string, parentIDStr string) (string, error) {
	prefix := ""

	// Determine Prefix
	if parentIDStr != "" && parentIDStr != "null" {
		var parent models.COA
		if err := s.DB.First(&parent, parentIDStr).Error; err == nil {
			prefix = parent.Code
		}
	}

	if prefix == "" {
		switch coaType {
		case "ASSET":
			prefix = "1"
		case "LIABILITY":
			prefix = "2"
		case "EQUITY":
			prefix = "3"
		case "REVENUE":
			prefix = "4"
		case "COGS":
			prefix = "5"
		case "EXPENSE":
			prefix = "6"
		default:
			prefix = "1"
		}
	}

	// Find the highest code
	var lastCOA models.COA
	query := s.DB.Where("code LIKE ?", prefix+"%")
	if parentIDStr != "" && parentIDStr != "null" {
		query = query.Where("code <> ?", prefix)
	}

	if err := query.Order("code desc").First(&lastCOA).Error; err != nil {
		if parentIDStr != "" && parentIDStr != "null" {
			return prefix + "01", nil
		}
		return prefix + "001", nil
	}

	if lastCOA.Code == prefix {
		return prefix + "01", nil
	}

	// Increment Logic
	var codeInt int64
	fmt.Sscanf(lastCOA.Code, "%d", &codeInt)
	format := fmt.Sprintf("%%0%dd", len(lastCOA.Code))
	nextCode := fmt.Sprintf(format, codeInt+1)

	// Collision check
	for {
		var collision models.COA
		if err := s.DB.Where("code = ?", nextCode).First(&collision).Error; err != nil {
			break
		}
		codeInt++
		nextCode = fmt.Sprintf(format, codeInt)
	}

	return nextCode, nil
}

// ---------------------------------------------------------
// JOURNAL ENTRIES
// ---------------------------------------------------------

type JournalInput struct {
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
	Items       []struct {
		COAID  uint    `json:"coa_id"`
		Debit  float64 `json:"debit"`
		Credit float64 `json:"credit"`
	} `json:"items"`
}

// CreateManualJournal handles logic for manual journal entries
func (s *FinanceService) CreateManualJournal(input JournalInput) (*models.JournalEntry, error) {
	// Validate Balance
	var totalDebit, totalCredit float64
	for _, item := range input.Items {
		totalDebit += item.Debit
		totalCredit += item.Credit
	}

	epsilon := 0.000001
	if math.Abs(totalDebit-totalCredit) > epsilon {
		return nil, fmt.Errorf("journal is not balanced (Diff: %.6f)", math.Abs(totalDebit-totalCredit))
	}

	var entry models.JournalEntry
	err := s.DB.Transaction(func(tx *gorm.DB) error {
		entry = models.JournalEntry{
			Description:   input.Description,
			Date:          input.Date,
			ReferenceID:   fmt.Sprintf("MAN-%d", time.Now().Unix()),
			ReferenceType: "MANUAL",
		}

		if err := tx.Create(&entry).Error; err != nil {
			return err
		}

		for _, item := range input.Items {
			journalItem := models.JournalItem{
				JournalEntryID: entry.ID,
				COAID:          item.COAID,
				Debit:          item.Debit,
				Credit:         item.Credit,
			}
			if err := tx.Create(&journalItem).Error; err != nil {
				return err
			}

			// Update COA Balance
			if err := s.updateCOABalance(tx, item.COAID, item.Debit, item.Credit); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	helpers.LogAuditSimple(0, "finance", "CREATE", entry.ID, "Manual Journal: "+input.Description)
	return &entry, nil
}

// ---------------------------------------------------------
// EXPENSES
// ---------------------------------------------------------

type ExpenseInput struct {
	COAID       uint
	Amount      float64
	Description string
	Vendor      string
	Date        time.Time
	Attachment  string
	UserID      uint
}

// CreateExpense handles expense creation and auto-journal
func (s *FinanceService) CreateExpense(input ExpenseInput) (*models.Expense, error) {
	var expense models.Expense

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create Expense
		expense = models.Expense{
			COAID:       input.COAID,
			Amount:      input.Amount,
			Description: input.Description,
			Vendor:      input.Vendor,
			Date:        input.Date,
			CreatedBy:   input.UserID,
			Attachment:  input.Attachment,
		}

		if err := tx.Create(&expense).Error; err != nil {
			return err
		}

		// 2. Auto Journal (Credit Bank, Debit Expense)
		coaBankID, err := helpers.GetPrimaryBankCOA(tx)
		if err != nil {
			return fmt.Errorf("no Bank/Cash mapping found")
		}

		journalEntry := models.JournalEntry{
			Description:   "Expense: " + input.Description,
			Date:          input.Date,
			ReferenceID:   fmt.Sprintf("EXP-%d", expense.ID),
			ReferenceType: "EXPENSE",
		}

		if err := tx.Create(&journalEntry).Error; err != nil {
			return err
		}

		// Items
		items := []models.JournalItem{
			{JournalEntryID: journalEntry.ID, COAID: input.COAID, Debit: input.Amount, Credit: 0}, // Debit Expense
			{JournalEntryID: journalEntry.ID, COAID: coaBankID, Debit: 0, Credit: input.Amount},   // Credit Bank
		}

		for _, item := range items {
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
			if err := s.updateCOABalance(tx, item.COAID, item.Debit, item.Credit); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	helpers.LogAuditSimple(input.UserID, "finance", "CREATE", expense.ID, "Created expense: "+input.Description)
	return &expense, nil
}

// DeleteExpense handles expense deletion and journal reversal
func (s *FinanceService) DeleteExpense(id uint, userID uint) error {
	var expense models.Expense
	if err := s.DB.Preload("COA").First(&expense, id).Error; err != nil {
		return fmt.Errorf("expense not found")
	}

	err := s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Reversal Journal
		coaBankID, err := helpers.GetPrimaryBankCOA(tx)
		if err != nil {
			return fmt.Errorf("failed to determine bank account for reversal")
		}

		if coaBankID != 0 {
			journalEntry := models.JournalEntry{
				Description:   "Reversal: " + expense.Description,
				Date:          time.Now(),
				ReferenceID:   fmt.Sprintf("REV-EXP-%d", expense.ID),
				ReferenceType: "REVERSAL",
			}
			if err := tx.Create(&journalEntry).Error; err != nil {
				return err
			}

			// Items (Swapped Debit/Credit)
			items := []models.JournalItem{
				{JournalEntryID: journalEntry.ID, COAID: coaBankID, Debit: expense.Amount, Credit: 0},
				{JournalEntryID: journalEntry.ID, COAID: expense.COAID, Debit: 0, Credit: expense.Amount},
			}

			for _, item := range items {
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
				if err := s.updateCOABalance(tx, item.COAID, item.Debit, item.Credit); err != nil {
					return err
				}
			}
		}

		// 2. Delete Expense
		if err := tx.Delete(&expense).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return err
	}

	helpers.LogAuditSimple(userID, "finance", "DELETE", expense.ID, "Deleted expense and reversed journal: "+expense.Description)
	return nil
}

// Helper: Update COA Balance
func (s *FinanceService) updateCOABalance(tx *gorm.DB, coaID uint, debit, credit float64) error {
	var coa models.COA
	if err := tx.First(&coa, coaID).Error; err != nil {
		return err
	}

	if coa.Type == "ASSET" || coa.Type == "EXPENSE" || coa.Type == "COGS" {
		coa.Balance += debit - credit
	} else {
		coa.Balance += credit - debit
	}
	return tx.Save(&coa).Error
}

// GetFinanceStats calculates dashboard stats
func (s *FinanceService) GetFinanceStats(period string) (map[string]interface{}, error) {
	var sinceTime time.Time
	isFiltered := false

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	switch period {
	case "1m":
		sinceTime = today.AddDate(0, -1, 0)
		isFiltered = true
	case "6m":
		sinceTime = today.AddDate(0, -6, 0)
		isFiltered = true
	case "1y":
		sinceTime = today.AddDate(-1, 0, 0)
		isFiltered = true
	case "all":
		isFiltered = false
	default:
		sinceTime = today.AddDate(0, -6, 0)
		isFiltered = true
	}

	var revenue, expense, cogs float64

	// Queries
	s.sumJournalType("REVENUE", sinceTime, isFiltered, &revenue)
	s.sumJournalType("EXPENSE", sinceTime, isFiltered, &expense)
	s.sumJournalType("COGS", sinceTime, isFiltered, &cogs)

	// Pending Payments
	var pendingPayments float64
	s.DB.Model(&models.Invoice{}).Where("status IN ?", []string{"unpaid", "pending", "overdue", "balance_due"}).Select("COALESCE(sum(amount), 0)").Scan(&pendingPayments)

	// Recent Expenses
	var recentExpensesTotal float64
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	s.DB.Model(&models.Expense{}).Where("date >= ?", thirtyDaysAgo).Select("COALESCE(sum(amount), 0)").Scan(&recentExpensesTotal)

	// Expense Breakdown
	type ExpenseBreakdown struct {
		Name  string  `json:"name"`
		Value float64 `json:"value"`
	}
	var expenseBreakdown []ExpenseBreakdown

	breakdownQuery := s.DB.Table("journal_items ji").
		Select("c.name, COALESCE(SUM(ji.debit - ji.credit), 0) as value").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("(c.type = ? OR c.type = ?)", "EXPENSE", "COGS")

	if isFiltered {
		breakdownQuery = breakdownQuery.Where("je.date >= ?", sinceTime)
	}
	breakdownQuery.Group("c.name").Order("value desc").Scan(&expenseBreakdown)

	return map[string]interface{}{
		"total_revenue":     revenue,
		"total_expense":     expense + cogs,
		"total_cogs":        cogs,
		"net_profit":        revenue - expense - cogs,
		"pending_payments":  pendingPayments,
		"recent_expenses":   recentExpensesTotal,
		"period":            period,
		"expense_breakdown": expenseBreakdown,
	}, nil
}

func (s *FinanceService) sumJournalType(coaType string, since time.Time, isFiltered bool, dest *float64) {
	query := s.DB.Table("journal_items ji").
		Joins("JOIN coas c ON ji.coa_id = c.id").
		Joins("JOIN journal_entries je ON ji.journal_entry_id = je.id").
		Where("c.type = ?", coaType)
	if isFiltered {
		query = query.Where("je.date >= ?", since)
	}

	if coaType == "REVENUE" || coaType == "LIABILITY" || coaType == "EQUITY" {
		query.Select("COALESCE(SUM(ji.credit - ji.debit), 0)").Scan(dest)
	} else {
		query.Select("COALESCE(SUM(ji.debit - ji.credit), 0)").Scan(dest)
	}
}
