package helpers

import (
	"fmt"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"gorm.io/gorm"
)

// GenerateInvoice creates an invoice record for an order
func GenerateInvoice(db *gorm.DB, order models.Order, invType string, amount float64, status string) error {
	var dueDate time.Time
	if invType == "balance" {
		dueDate = time.Now().Add(24 * time.Hour)
	} else {
		dueDate = time.Now().Add(30 * time.Minute)
	}

	invoice := models.Invoice{
		InvoiceNumber: fmt.Sprintf("INV-%d-%s-%d", order.ID, invType, time.Now().Unix()),
		OrderID:       &order.ID,
		UserID:        order.UserID,
		Type:          invType, // 'deposit', 'balance', 'full'
		Amount:        amount,
		Status:        status, // 'unpaid', 'pending_arrival', etc.
		DueDate:       dueDate,
	}

	if err := db.Create(&invoice).Error; err != nil {
		return err
	}
	return nil
}

// GetPrimaryBankCOA retrieves the primary bank account ID with smart fallbacks
func GetPrimaryBankCOA(tx *gorm.DB) (uint, error) {
	// 1. Try Mapping Key
	id, err := GetCOAByMappingKey("PRIMARY_BANK")
	if err == nil {
		return id, nil
	}

	id, err = GetCOAByMappingKey("CASH")
	if err == nil {
		return id, nil
	}

	// 2. Try Fallback Legacy Code (Centralized Hardcode)
	id, err = GetCOAByCode("1002")
	if err == nil {
		return id, nil
	}

	// 3. Try Cash
	id, err = GetCOAByCode("1001")
	if err == nil {
		return id, nil
	}

	// 4. Try searching by Name
	var coa models.COA
	if err := tx.Where("type = ? AND can_post = ? AND (name ILIKE ? OR name ILIKE ? OR name ILIKE ?)", "ASSET", true, "%bank%", "%kas%", "%cash%").First(&coa).Error; err == nil {
		return coa.ID, nil
	}

	return 0, fmt.Errorf("no primary bank or cash asset account found")
}

// CreateAutoJournal records financial transaction
func CreateAutoJournal(referenceID string, refType string, description string, items []models.JournalItem) error {
	entry := models.JournalEntry{
		Date:          time.Now(),
		Description:   description,
		ReferenceID:   referenceID,
		ReferenceType: refType,
		Items:         items,
	}

	if err := config.DB.Create(&entry).Error; err != nil {
		return err
	}
	return nil
}

// GetCOAByCode fetches COA ID by its unique code
func GetCOAByCode(code string) (uint, error) {
	var coa models.COA
	if err := config.DB.Where("code = ?", code).First(&coa).Error; err != nil {
		return 0, err
	}
	return coa.ID, nil
}

// GetCOAByName fetches COA ID by name (helper for flexible mapping)
func GetCOAByName(name string) uint {
	var coa models.COA
	// Try simplistic match
	if err := config.DB.Where("name ILIKE ?", "%"+name+"%").First(&coa).Error; err != nil {
		return 0
	}
	return coa.ID
}

// GetCOAByMappingKey fetches COA ID by its functional mapping key
func GetCOAByMappingKey(key string) (uint, error) {
	var coa models.COA
	if err := config.DB.Where("mapping_key = ?", key).First(&coa).Error; err != nil {
		return 0, err
	}
	return coa.ID, nil
}

// PostJournalEntry records a simple 2-legged transaction
func PostJournalEntry(tx *gorm.DB, orderID uint, desc string, category string, amount float64, debitName string, creditName string) error {
	debitID := GetCOAByName(debitName)
	creditID := GetCOAByName(creditName)

	if debitID == 0 || creditID == 0 {
		return fmt.Errorf("COA not found for %s or %s", debitName, creditName)
	}

	entry := models.JournalEntry{
		Date:          time.Now(),
		Description:   desc,
		ReferenceID:   fmt.Sprintf("ORDER-%d", orderID),
		ReferenceType: "ORDER",
		Items: []models.JournalItem{
			{COAID: debitID, Debit: amount, Credit: 0},
			{COAID: creditID, Debit: 0, Credit: amount},
		},
	}

	if err := tx.Create(&entry).Error; err != nil {
		return err
	}
	return nil
}

// RecordPaymentJournal records a journal entry for an incoming payment and updates COA balances
func RecordPaymentJournal(tx *gorm.DB, invoice *models.Invoice, gatewayTxID string) error {
	// 1. Determine Debit Account (Asset)
	// If the payment is coming from WALLET, debit WALLET_LIABILITY instead of PRIMARY_BANK
	var debitCOAID uint
	var err error

	if strings.HasPrefix(gatewayTxID, "WALLET-") {
		debitCOAID, _ = GetCOAByMappingKey("WALLET_LIABILITY")
	} else {
		// Try PRIMARY_BANK mapping via centralized helper for normal gateway payments
		debitCOAID, err = GetPrimaryBankCOA(tx)
		if err != nil {
			return err
		}
	}

	// 2. Determine Credit Account (Revenue or Liability)
	var mappingKey string
	switch invoice.Type {
	case "topup":
		mappingKey = "CUSTOMER_DEPOSIT"
	case "deposit":
		mappingKey = "CUSTOMER_DEPOSIT"
	case "balance":
		mappingKey = "PO_REVENUE"
	case "full":
		mappingKey = "RETAIL_REVENUE"
	default:
		mappingKey = "GENERIC_REVENUE"
	}

	creditCOAID, _ := GetCOAByMappingKey(mappingKey)
	if creditCOAID == 0 {
		// Fallback to type search
		var coa models.COA
		if invoice.Type == "topup" || invoice.Type == "deposit" {
			tx.Where("type = ? AND can_post = ?", "LIABILITY", true).First(&coa)
		} else {
			tx.Where("type = ? AND can_post = ?", "REVENUE", true).First(&coa)
		}
		creditCOAID = coa.ID
	}

	if creditCOAID == 0 || debitCOAID == 0 {
		return fmt.Errorf("failed to map accounts for journal: debit=%d, credit=%d", debitCOAID, creditCOAID)
	}

	// 3. Create Journal Entry
	desc := fmt.Sprintf("Payment for %s (%s)", invoice.InvoiceNumber, invoice.Type)
	refID := gatewayTxID
	if refID == "" {
		refID = invoice.InvoiceNumber
	}

	entry := models.JournalEntry{
		Date:          time.Now(),
		Description:   desc,
		ReferenceID:   refID,
		ReferenceType: "PAYMENT", // Distinct from MANUAL or EXPENSE
	}

	if err := tx.Create(&entry).Error; err != nil {
		return err
	}

	// 4. Create Journal Items
	items := []models.JournalItem{
		// Debit (Bank Increase)
		{JournalEntryID: entry.ID, COAID: debitCOAID, Debit: invoice.Amount, Credit: 0},
		// Credit (Revenue Increase)
		{JournalEntryID: entry.ID, COAID: creditCOAID, Debit: 0, Credit: invoice.Amount},
	}

	for _, item := range items {
		if err := tx.Create(&item).Error; err != nil {
			return err
		}

		// 5. Update COA Balance
		var coa models.COA
		if err := tx.First(&coa, item.COAID).Error; err != nil {
			return err
		}

		// Balance Logic:
		// Asset/Expense: Debit(+) Credit(-)
		// Liab/Equity/Revenue: Credit(+) Debit(-)
		if coa.Type == "ASSET" || coa.Type == "EXPENSE" || coa.Type == "COGS" {
			coa.Balance += item.Debit - item.Credit
		} else {
			coa.Balance += item.Credit - item.Debit
		}

		if err := tx.Save(&coa).Error; err != nil {
			return err
		}
	}

	return nil
}

// PostJournalWithTX records a multi-item journal entry and updates COA balances within a TX
func PostJournalWithTX(tx *gorm.DB, referenceID string, refType string, description string, items []models.JournalItem) error {
	entry := models.JournalEntry{
		Date:          time.Now(),
		Description:   description,
		ReferenceID:   referenceID,
		ReferenceType: refType,
	}

	if err := tx.Create(&entry).Error; err != nil {
		return err
	}

	for i := range items {
		items[i].JournalEntryID = entry.ID
		if err := tx.Create(&items[i]).Error; err != nil {
			return err
		}

		// Update COA Balance
		var coa models.COA
		if err := tx.First(&coa, items[i].COAID).Error; err != nil {
			return err
		}

		if coa.Type == "ASSET" || coa.Type == "EXPENSE" || coa.Type == "COGS" {
			coa.Balance += items[i].Debit - items[i].Credit
		} else {
			coa.Balance += items[i].Credit - items[i].Debit
		}

		if err := tx.Save(&coa).Error; err != nil {
			return err
		}
	}

	return nil
}
