package helpers

import (
	"os"
	"regexp"
	"strings"

	"forzashop/backend/config"

	"golang.org/x/text/language"
	"golang.org/x/text/message"
)

// GetSetting reads a setting value from the database by key.
// Returns the fallback value if the key doesn't exist or is empty.
func GetSetting(key string, fallback string) string {
	type settingRow struct {
		Value string
	}
	var row settingRow
	// Use Find instead of First to avoid "record not found" error logs for optional settings
	if err := config.DB.Table("settings").Select("value").Where("key = ?", key).Limit(1).Find(&row).Error; err == nil && row.Value != "" {
		return row.Value
	}
	return fallback
}

// GetCompanyInfo returns a map of company info for invoices/emails, all from DB settings
func GetCompanyInfo() map[string]string {
	return map[string]string{
		"name":    GetSetting("company_name", "WARUNG FORZA SHOP"),
		"tagline": GetSetting("company_tagline", "Premium Collectibles Indonesia"),
		"address": GetSetting("company_address", "Jakarta, Indonesia"),
		"email":   GetSetting("company_email", "info@warungforza.com"),
		"phone":   GetSetting("company_phone", "+62 812-XXXX-XXXX"),
	}
}

// GetBankInfo returns a map of bank info for invoices/payment, all from DB settings
func GetBankInfo() map[string]string {
	return map[string]string{
		"bank":           GetSetting("bank_name", "Bank Central Asia (BCA)"),
		"account_number": GetSetting("bank_account_number", "123-456-7890"),
		"account_name":   GetSetting("bank_account_name", "PT Warung Forza Indonesia"),
	}
}

// GenerateSlug converts a string to a URL-friendly slug
func GenerateSlug(s string) string {
	s = strings.ToLower(s)
	// Replace non-alphanumeric with hyphen
	reg, _ := regexp.Compile("[^a-z0-9]+")
	s = reg.ReplaceAllString(s, "-")
	// Trim hyphens
	s = strings.Trim(s, "-")
	return s
}

func FormatPrice(amount float64) string {
	p := message.NewPrinter(language.Indonesian)
	return p.Sprintf("%.0f", amount)
}

func GetAppURL() string {
	url := GetSetting("store_url", os.Getenv("APP_URL"))
	if url == "" {
		url = os.Getenv("BACKEND_URL")
	}
	if url == "" {
		return "http://localhost:5000" // Standard backend port
	}
	return url
}

func GetFrontendURL() string {
	url := GetSetting("store_url", os.Getenv("FRONTEND_URL"))
	if url == "" {
		return "http://localhost:5173" // Vite standard port
	}
	return url
}
