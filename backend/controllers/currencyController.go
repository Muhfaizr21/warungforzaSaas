package controllers

import (
	"encoding/json"
	"forzashop/backend/config"
	"forzashop/backend/models"
	"log"
	"net/http"

	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	currencyCache       []models.Currency
	currencyCacheExpiry time.Time
	currencyCacheMutex  sync.Mutex
)

// GetCurrencies lists all available currencies
func GetCurrencies(c *gin.Context) {
	currencyCacheMutex.Lock()
	if time.Now().Before(currencyCacheExpiry) && currencyCache != nil {
		data := currencyCache
		currencyCacheMutex.Unlock()
		c.JSON(http.StatusOK, data)
		return
	}
	currencyCacheMutex.Unlock()

	var currencies []models.Currency
	if err := config.DB.Find(&currencies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch currencies"})
		return
	}

	// If empty, seed default
	if len(currencies) == 0 {
		defaultCurrencies := []models.Currency{
			{Code: "IDR", Name: "Indonesian Rupiah", Symbol: "Rp", ExchangeRate: 1, IsBase: true},
			{Code: "USD", Name: "US Dollar", Symbol: "$", ExchangeRate: 15500, IsBase: false},
			{Code: "SGD", Name: "Singapore Dollar", Symbol: "S$", ExchangeRate: 11500, IsBase: false},
		}
		config.DB.CreateInBatches(defaultCurrencies, 3)
		currencies = defaultCurrencies
	}

	// Update Cache
	currencyCacheMutex.Lock()
	currencyCache = currencies
	currencyCacheExpiry = time.Now().Add(5 * time.Minute)
	currencyCacheMutex.Unlock()

	c.JSON(http.StatusOK, currencies)
}

// CreateCurrency adds a new currency
func CreateCurrency(c *gin.Context) {
	var input struct {
		Code         string  `json:"code" binding:"required"`
		Name         string  `json:"name" binding:"required"`
		Symbol       string  `json:"symbol" binding:"required"`
		ExchangeRate float64 `json:"exchange_rate" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if exists
	var existing models.Currency
	if err := config.DB.Where("code = ?", input.Code).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Currency code already exists"})
		return
	}

	currency := models.Currency{
		Code:         input.Code,
		Name:         input.Name,
		Symbol:       input.Symbol,
		ExchangeRate: input.ExchangeRate,
		IsBase:       false,
	}

	if err := config.DB.Create(&currency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create currency"})
		return
	}

	c.JSON(http.StatusCreated, currency)
}

// UpdateCurrency updates exchange rate
func UpdateCurrency(c *gin.Context) {
	code := c.Param("code")
	var input struct {
		ExchangeRate float64 `json:"exchange_rate"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var currency models.Currency
	if err := config.DB.Where("code = ?", code).First(&currency).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Currency not found"})
		return
	}

	if currency.IsBase {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change rate of base currency"})
		return
	}

	currency.ExchangeRate = input.ExchangeRate
	config.DB.Save(&currency)

	// Invalidate cache
	currencyCacheMutex.Lock()
	currencyCache = nil
	currencyCacheExpiry = time.Time{}
	currencyCacheMutex.Unlock()

	c.JSON(http.StatusOK, currency)
}

// DeleteCurrency removes a currency
func DeleteCurrency(c *gin.Context) {
	code := c.Param("code")

	var currency models.Currency
	if err := config.DB.Where("code = ?", code).First(&currency).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Currency not found"})
		return
	}

	if currency.IsBase {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete base currency"})
		return
	}

	if err := config.DB.Delete(&currency).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete currency"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Currency deleted"})
}

// ==========================================
// AUTOMATIC EXCHANGE RATE SYNC (EXTERNAL API)
// ==========================================

type ExchangeRateResponse struct {
	Base  string             `json:"base"`
	Date  string             `json:"date"`
	Rates map[string]float64 `json:"rates"`
}

// SyncCurrenciesWithExternalAPI - Fetches live rates from public API and updates DB
func SyncCurrenciesWithExternalAPI() {
	// Using generic public API (No Key Required for this endpoint usually)
	// Base: IDR
	resp, err := http.Get("https://api.exchangerate-api.com/v4/latest/IDR")
	if err != nil {
		log.Printf("❌ Currency Sync Failed: %v", err)
		return
	}
	defer resp.Body.Close()

	var result ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("❌ Currency Decode Failed: %v", err)
		return
	}

	// Update Database
	var currencies []models.Currency
	config.DB.Find(&currencies)

	for _, curr := range currencies {
		if curr.Code == "IDR" {
			continue // Skip Base
		}

		// API returns: 1 IDR = 0.000064 USD
		// But our logic stores: 1 USD = 15500 IDR (How much IDR to get 1 Unit)
		// So we need: 1 / Rate_From_API
		// Example: API says 1 IDR = 0.0000645 USD
		// We want USD price in IDR: 1 / 0.0000645 = 15503 IDR

		if rate, ok := result.Rates[curr.Code]; ok && rate > 0 {
			marketRate := 1 / rate

			// Update only if difference is significant or just update anyway
			curr.ExchangeRate = marketRate
			config.DB.Save(&curr)
			log.Printf("✅ Updated Rate: 1 %s = %.2f IDR", curr.Code, curr.ExchangeRate)
		}
	}
	log.Println("💰 Currency Rates Synced Successfully!")
}
