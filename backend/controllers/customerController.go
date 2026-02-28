package controllers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// GetCustomerOrders - List orders for the logged-in user
func GetCustomerOrders(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	var orders []models.Order

	if err := config.DB.Preload("Items.Product", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Where("user_id = ?", user.ID).Order("created_at desc").Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch orders"})
		return
	}

	c.JSON(http.StatusOK, orders)
}

// GetCustomerOrderDetail - Get specific order detail for the logged-in user
func GetCustomerOrderDetail(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	id := c.Param("id")
	var order models.Order

	// Support both numeric ID and order_number (e.g. "FORZA-1770794409")
	query := config.DB.Preload("Items.Product", func(db *gorm.DB) *gorm.DB {
		return db.Unscoped()
	}).Preload("Logs", "is_customer_visible = ?", true).Preload("Invoices")
	if strings.HasPrefix(id, "FORZA-") || strings.HasPrefix(id, "forza-") {
		query = query.Where("user_id = ? AND order_number = ?", user.ID, id)
	} else {
		query = query.Where("user_id = ? AND id = ?", user.ID, id)
	}

	if err := query.First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// ---------------------------------------------------------
	// AUTO-CHECK PRISMALINK STATUS (Active Inquiry for Polling)
	// ---------------------------------------------------------
	paymentService := services.NewPaymentService()
	paymentService.CheckAndSyncStatus(&order)

	c.JSON(http.StatusOK, order)
}

// Checkout - Create a new order from cart items
func Checkout(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input services.CheckoutInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderService := services.NewOrderService()
	result, err := orderService.CreateOrder(input, user)
	if err != nil {
		// Differentiate error types if needed (e.g., Sold Out vs Bad Request)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create order: " + err.Error()})
		return
	}

	// Generate structured payment data for frontend native UI
	var paymentData *helpers.PaymentData
	if len(result.Invoices) > 0 {
		pd, pdErr := helpers.GeneratePaymentDirect(result.Order, result.Invoices[0], user, c.ClientIP())
		if pdErr == nil {
			paymentData = pd
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Order created successfully",
		"order":        result.Order,
		"invoices":     result.Invoices,
		"invoice":      result.Invoices[0],
		"payment_link": result.PaymentLink,
		"payment_data": paymentData,
	})
}

// GetCustomerProfile - Get user profile and preferences
func GetCustomerProfile(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var profile models.CustomerProfile
	if err := config.DB.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		// Create empty profile if not exists
		profile = models.CustomerProfile{
			UserID: user.ID,
		}
		config.DB.Create(&profile)
	}

	c.JSON(http.StatusOK, gin.H{
		"user":    user,
		"profile": profile,
	})
}

// UpdateCustomerProfile - Update user profile information
func UpdateCustomerProfile(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		FullName      string `json:"full_name"`
		Phone         string `json:"phone"`
		Address       string `json:"address"` // Legacy/Full address string
		Street        string `json:"street"`
		City          string `json:"city"`
		State         string `json:"state"`
		PostalCode    string `json:"postal_code"`
		Country       string `json:"country"`
		NewsletterSub *bool  `json:"newsletter_sub"`
		RestockNotify *bool  `json:"restock_notify"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := config.DB.Begin()

	// Update User table
	userUpdates := models.User{
		FullName: input.FullName,
		Phone:    input.Phone,
	}
	if err := tx.Model(&models.User{}).Where("id = ?", user.ID).Updates(userUpdates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update internal user registry"})
		return
	}

	// Update Profile table
	var profile models.CustomerProfile
	err := tx.Where("user_id = ?", user.ID).First(&profile).Error
	if err != nil {
		profile = models.CustomerProfile{UserID: user.ID}
		if err := tx.Create(&profile).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize neural profile"})
			return
		}
	}

	if input.Phone != "" {
		profile.Phone = input.Phone
	}
	if input.Address != "" || input.Street != "" {
		addrMap := map[string]string{
			"main":        input.Address,
			"street":      input.Street,
			"city":        input.City,
			"state":       input.State,
			"postal_code": input.PostalCode,
			"country":     input.Country,
		}

		// If granular fields are provided but 'main' is empty, construct 'main'
		if input.Address == "" && input.Street != "" {
			mainAddr := input.Street
			if input.City != "" {
				mainAddr += ", " + input.City
			}
			if input.State != "" {
				mainAddr += ", " + input.State
			}
			if input.Country != "" {
				mainAddr += ", " + input.Country
			}
			if input.PostalCode != "" {
				mainAddr += " " + input.PostalCode
			}
			addrMap["main"] = mainAddr
		}

		addrJSON, _ := json.Marshal(addrMap)
		profile.Address = addrJSON
	}
	if input.NewsletterSub != nil {
		profile.NewsletterSub = *input.NewsletterSub
	}
	if input.RestockNotify != nil {
		profile.RestockNotify = *input.RestockNotify
	}

	if err := tx.Save(&profile).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to synchronize neural preferences"})
		return
	}

	tx.Commit()

	helpers.NotifyUser(user.ID, "PROFILE_UPDATE", "Identity parameters successfully re-calibrated.", nil)

	c.JSON(http.StatusOK, gin.H{"message": "Identity successfully updated in the core database.", "profile": profile})
}

// ChangePassword - Securely update access pin
func ChangePassword(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var input struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify old password
	// Need to fetch user again with password field (GORM might hide it depending on tags)
	var dbUser models.User
	config.DB.First(&dbUser, user.ID)

	if err := bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(input.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current access pin does not match official records"})
		return
	}

	// Hash new password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	if err := config.DB.Model(&dbUser).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update access pin"})
		return
	}

	helpers.NotifyUser(user.ID, "SECURITY_ALERT", "Access PIN (Password) has been modified.", nil)

	c.JSON(http.StatusOK, gin.H{"message": "Access pin successfully neutralized and updated."})
}

// DeactivateAccount - User chooses to disconnect their node
func DeactivateAccount(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	// We'll just set status to inactive instead of hard deleting
	if err := config.DB.Model(&user).Update("status", "inactive").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect node"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Access node deactivated. Transmission terminated."})
}

// ConfirmOrderReceived - User confirms they have received the artifact
func ConfirmOrderReceived(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	orderID := c.Param("id")

	var order models.Order
	if err := config.DB.Where("id = ? AND user_id = ?", orderID, user.ID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	if order.Status != "shipped" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only shipped orders can be confirmed"})
		return
	}

	tx := config.DB.Begin()

	order.Status = "completed"
	if err := tx.Save(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update order status"})
		return
	}

	// Log the event
	log := models.OrderLog{
		OrderID:           order.ID,
		UserID:            user.ID,
		Action:            "order_confirmed",
		Note:              "User confirmed receipt of artifacts. Operational cycle complete.",
		IsCustomerVisible: true,
	}
	tx.Create(&log)

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Manifest successfully closed. Thank you, Hunter.", "order": order})
}

// SubmitPaymentProof - User submits a receipt/proof for an invoice
func SubmitPaymentProof(c *gin.Context) {
	invoiceID := c.Param("id")
	user := c.MustGet("currentUser").(models.User)

	var invoice models.Invoice
	// Find invoice AND verify ownership
	if err := config.DB.Preload("Order").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify ownership logic (Invoice UserID or Order UserID)
	authorized := (invoice.UserID == user.ID) || (invoice.Order.UserID == user.ID)
	if !authorized {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized"})
		return
	}

	if invoice.Status == "paid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invoice is already paid"})
		return
	}

	// 1. Handle File Upload
	fileHeader, err := c.FormFile("proof")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payment proof image is required"})
		return
	}

	// Create directory if not exists
	uploadDir := "./public/uploads/payment_proofs"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	var finalFilename string
	var proofPath string

	// Handle Optimization to WebP
	if ext == ".gif" || ext == ".webp" {
		finalFilename = fmt.Sprintf("%d_%s_%d%s", time.Now().Unix(), invoice.InvoiceNumber, user.ID, ext)
		proofPath = filepath.Join(uploadDir, finalFilename)
		if err := c.SaveUploadedFile(fileHeader, proofPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save proof image"})
			return
		}
	} else {
		// Convert JPG/PNG to WebP
		srcFile, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read uploaded file"})
			return
		}
		defer srcFile.Close()

		img, _, err := image.Decode(srcFile)
		if err != nil {
			// Fallback: Save original
			finalFilename = fmt.Sprintf("%d_%s_%d%s", time.Now().Unix(), invoice.InvoiceNumber, user.ID, ext)
			proofPath = filepath.Join(uploadDir, finalFilename)
			c.SaveUploadedFile(fileHeader, proofPath)
		} else {
			finalFilename = fmt.Sprintf("%d_%s_%d.webp", time.Now().Unix(), invoice.InvoiceNumber, user.ID)
			proofPath = filepath.Join(uploadDir, finalFilename)

			out, err := os.Create(proofPath)
			if err == nil {
				if err := services.EncodeToWebP(out, img, 75); err != nil { // Use helper or direct
					out.Close()
					os.Remove(proofPath)
					// Fallback
					c.SaveUploadedFile(fileHeader, proofPath)
				}
				out.Close()
			} else {
				// Fallback
				c.SaveUploadedFile(fileHeader, proofPath)
			}
		}
	}

	// Public URL for frontend
	proofURL := "/uploads/payment_proofs/" + finalFilename
	note := c.PostForm("note")

	tx := config.DB.Begin()

	// 2. Update Invoice Status
	invoice.PaymentProof = proofURL
	invoice.PaymentNote = note
	invoice.Status = "awaiting_approval"
	invoice.PaymentMethod = "manual_transfer"

	if err := tx.Save(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invoice"})
		return
	}

	// 3. Log Payment Transaction (Manual)
	paymentTx := models.PaymentTransaction{
		InvoiceID:     invoice.ID,
		Amount:        invoice.Amount,
		Status:        "pending_verification",
		Gateway:       "manual",
		PaymentMethod: "manual_transfer",
		Type:          invoice.Type,
		MerchantRefNo: fmt.Sprintf("MANUAL-%s", invoice.InvoiceNumber),
	}

	// Handle optional OrderID
	if invoice.OrderID != nil {
		paymentTx.OrderID = *invoice.OrderID
	}

	tx.Create(&paymentTx)

	// 4. Update Order Log if applicable
	if invoice.OrderID != nil {
		tx.Create(&models.OrderLog{
			OrderID:           *invoice.OrderID,
			UserID:            user.ID,
			Action:            "payment_submitted",
			Note:              "User uploaded payment proof. Awaiting Admin verification.",
			IsCustomerVisible: true,
		})
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message":   "Bukti pembayaran berhasil diunggah. Mohon tunggu verifikasi admin.",
		"proof_url": proofURL,
		"status":    "awaiting_approval",
	})
}

// GetCustomerOrderInvoices - Get all invoices for a specific order with payment URLs
// This allows customer to pay balance directly from order history
func GetCustomerOrderInvoices(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	orderID := c.Param("id")

	// Verify order belongs to user
	var order models.Order
	if err := config.DB.Where("id = ? AND user_id = ?", orderID, user.ID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// Get all invoices for this order
	var invoices []models.Invoice
	if err := config.DB.Where("order_id = ?", orderID).Order("created_at asc").Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invoices"})
		return
	}

	// Build response with payment URLs
	type InvoiceWithPaymentURL struct {
		models.Invoice
		PaymentURL string `json:"payment_url"`
		CanPay     bool   `json:"can_pay"`
	}

	var result []InvoiceWithPaymentURL
	for _, inv := range invoices {
		iwp := InvoiceWithPaymentURL{
			Invoice:    inv,
			CanPay:     inv.Status == "unpaid",
			PaymentURL: "",
		}

		// Generate payment URL for unpaid invoices
		if inv.Status == "unpaid" {
			paymentURL, err := helpers.GeneratePaymentLink(order, inv, user, c.ClientIP())
			if err == nil {
				iwp.PaymentURL = paymentURL
			}
		}

		result = append(result, iwp)
	}

	c.JSON(http.StatusOK, gin.H{
		"order":    order,
		"invoices": result,
	})
}

// GetInvoicePaymentLink - Generates structured payment data for an existing unpaid invoice
func GetInvoicePaymentLink(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	invoiceID := c.Param("invoiceId")

	var invoice models.Invoice
	if err := config.DB.Preload("Order").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Verify ownership
	if invoice.Order.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Unauthorized access to this invoice"})
		return
	}

	if invoice.Status != "unpaid" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only unpaid invoices can be paid"})
		return
	}

	// Generate structured payment data via Full API
	paymentData, err := helpers.GeneratePaymentDirect(invoice.Order, invoice, user, c.ClientIP())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Also return legacy payment_url for backward compat
	paymentURL := ""
	if paymentData != nil {
		switch paymentData.Type {
		case "redirect":
			paymentURL = paymentData.RedirectURL
		case "qris":
			paymentURL = paymentData.QRISImageURL
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"payment_url":  paymentURL,
		"payment_data": paymentData,
	})
}

// getIsland menentukan pulau/zona dari prefix kode pos Indonesia
func getIsland(prefix int) string {
	switch {
	case prefix >= 10 && prefix <= 19:
		return "JAWA" // Jakarta & sekitarnya
	case prefix >= 20 && prefix <= 29:
		return "SUMATERA"
	case prefix >= 30 && prefix <= 39:
		return "JAWA" // Jawa Barat
	case prefix >= 40 && prefix <= 49:
		return "JAWA" // Jawa Tengah
	case prefix >= 50 && prefix <= 59:
		return "JAWA" // Jawa Tengah/DIY
	case prefix >= 60 && prefix <= 65:
		return "JAWA" // Jawa Timur
	case prefix >= 66 && prefix <= 69:
		return "KALIMANTAN" // Kalimantan Selatan
	case prefix >= 70 && prefix <= 76:
		return "KALIMANTAN" // Kalimantan
	case prefix >= 77 && prefix <= 79:
		return "SULAWESI" // Sulawesi (sebagian overlap)
	case prefix >= 80 && prefix <= 84:
		return "BALI_NUSA" // Bali, NTB
	case prefix >= 85 && prefix <= 89:
		return "BALI_NUSA" // NTT
	case prefix >= 90 && prefix <= 92:
		return "SULAWESI"
	case prefix >= 93 && prefix <= 94:
		return "MALUKU"
	case prefix >= 95 && prefix <= 96:
		return "SULAWESI" // Sulawesi Utara/Gorontalo
	case prefix >= 97 && prefix <= 99:
		return "PAPUA"
	default:
		return "JAWA" // Fallback
	}
}

// GetShippingOptions - Returns available shipping methods and costs via Biteship
func GetShippingOptions(c *gin.Context) {
	var input struct {
		TotalWeight float64 `json:"total_weight"`
		Country     string  `json:"country"`
		State       string  `json:"state"`
		City        string  `json:"city"`
		PostalCode  string  `json:"postal_code"`
		Subtotal    float64 `json:"subtotal"` // For free_shipping threshold check
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	type ShippingOption struct {
		ID            string  `json:"id"`
		Method        string  `json:"method"`
		Name          string  `json:"name"` // Display Name
		Cost          float64 `json:"cost"`
		Description   string  `json:"description"`
		EstDays       string  `json:"est_days"`
		FormattedCost string  `json:"formatted_cost"`
	}

	// Default country ke Indonesia jika kosong (mayoritas customer domestik)
	if input.Country == "" {
		input.Country = "ID"
	}

	// --- NORMALIZE COUNTRY to ISO code ---
	// Build a map of common country names → ISO code (handle full name vs ISO code)
	countryNameToISO := map[string]string{
		"indonesia": "ID", "malaysia": "MY", "singapore": "SG", "thailand": "TH",
		"philippines": "PH", "vietnam": "VN", "myanmar": "MM", "cambodia": "KH",
		"laos": "LA", "brunei": "BN", "timor-leste": "TL",
		"australia": "AU", "new zealand": "NZ",
		"united states": "US", "usa": "US", "america": "US",
		"united kingdom": "GB", "uk": "GB", "britain": "GB",
		"germany": "DE", "france": "FR", "italy": "IT", "spain": "ES",
		"netherlands": "NL", "belgium": "BE", "austria": "AT", "switzerland": "CH",
		"japan": "JP", "south korea": "KR", "china": "CN", "hong kong": "HK",
		"taiwan": "TW", "india": "IN", "saudi arabia": "SA", "uae": "AE",
		"united arab emirates": "AE",
	}
	// If input country is already 2-char ISO, use as-is; otherwise look up
	countryISO := strings.ToUpper(strings.TrimSpace(input.Country))
	if len(countryISO) > 2 {
		if iso, found := countryNameToISO[strings.ToLower(strings.TrimSpace(input.Country))]; found {
			countryISO = iso
			log.Printf("Normalized country %s -> ISO code %s", input.Country, countryISO)
		}
	}

	fmt.Printf("📦 Shipping Request: Weight=%.2fkg, Country=%s (ISO: %s), PostalCode=%s, City=%s\n",
		input.TotalWeight, input.Country, countryISO, input.PostalCode, input.City)

	isDomestic := countryISO == "ID" || strings.EqualFold(input.Country, "indonesia")

	if input.PostalCode == "" && isDomestic {
		// Provide empty list if postal code is missing for domestic
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	// --- 1. AMBIL KURIR AKTIF DARI DATABASE ---
	var activeCarriers []models.CarrierTemplate
	config.DB.Preload("Services").Where("active = ?", true).Find(&activeCarriers)
	activeMap := make(map[string]bool)
	activeServicesMap := make(map[string]map[string]bool)

	for _, c := range activeCarriers {
		cName := strings.ToLower(c.Name)
		cCode := strings.ToLower(c.BiteshipCode)
		if cCode == "" {
			cCode = cName
		}
		activeMap[cName] = true
		activeMap[cCode] = true

		activeServicesMap[cCode] = make(map[string]bool)
		for _, s := range c.Services {
			if s.Active {
				activeServicesMap[cCode][strings.ToLower(s.ServiceCode)] = true
			}
		}
	}

	// --- 2. AMBIL TARIF MANUAL DARI DATABASE (TETAP ADA SEBAGAI LEGACY UNTUK DOMESTIC) ---
	var dbRates []models.ShippingRate

	// Ambil tarif manual khusus (Lokal) berdasarkan modul yang aktif
	cargoEnabled := helpers.GetSetting("cargo_logistics_enabled", "true")
	biteshipEnabled := helpers.GetSetting("biteship_enabled", "true")

	if isDomestic {
		query := config.DB.Where("active = ?", true)

		if cargoEnabled == "true" && biteshipEnabled == "true" {
			// Keduanya aktif: Ambil semua yang relevan untuk domestic
			query.Where("(country = ? OR country = 'ID' OR zone = 'CARGO' OR zone = 'ALL' OR zone = 'DOMESTIC')", input.Country).Find(&dbRates)
		} else if cargoEnabled == "true" {
			// Hanya Cargo aktif: Ambil AIR/SHIP/SEA atau CARGO zone
			query.Where("(zone = 'CARGO' OR method IN ('AIR', 'SHIP', 'SEA'))").
				Where("(country = ? OR country = 'ID' OR zone = 'CARGO' OR zone = 'ALL' OR zone = 'DOMESTIC')", input.Country).
				Find(&dbRates)
		} else if biteshipEnabled == "true" {
			// Hanya Biteship aktif: Ambil standard manual/fallback (Exclude manual cargo)
			query.Where("zone != 'CARGO' AND method NOT IN ('AIR', 'SHIP', 'SEA')").
				Where("(country = ? OR country = 'ID' OR zone = 'DOMESTIC' OR zone = 'ALL')", input.Country).
				Find(&dbRates)
		}
		// Jika keduanya OFF, dbRates tetap kosong
	}

	// --- 3. LOGIKA PENGIRIMAN INTERNASIONAL (NEW ZONES) ---
	var intlOptions []ShippingOption
	if !isDomestic {
		var allZones []models.ShippingZone
		config.DB.Preload("Methods", "is_active = ?", true).Where("is_active = ?", true).Find(&allZones)

		var matchedZone *models.ShippingZone

		for i, zone := range allZones {
			if zone.PostalCodes != "" && isZipMatch(input.PostalCode, zone.PostalCodes) {
				matchedZone = &allZones[i]
				break
			}
		}

		if matchedZone == nil {
			for i, zone := range allZones {
				if zone.Countries != "" {
					var countries []string
					json.Unmarshal([]byte(zone.Countries), &countries)
					for _, zc := range countries {
						// Match by ISO code OR full name (normalize both sides)
						if strings.ToUpper(zc) == countryISO || strings.EqualFold(zc, input.Country) {
							matchedZone = &allZones[i]
							break
						}
					}
				}
				if matchedZone != nil {
					break
				}
			}
		}

		if matchedZone == nil {
			for i, zone := range allZones {
				if zone.Countries == "" && zone.PostalCodes == "" {
					matchedZone = &allZones[i]
					break
				}
			}
		}

		if matchedZone != nil {
			for _, m := range matchedZone.Methods {
				price := 0.0
				switch m.CalcType {
				case "flat":
					price = m.Rate
				case "per_kg":
					weightKg := input.TotalWeight // Already in KGs
					if weightKg < m.MinWeight && m.MinWeight > 0 {
						weightKg = m.MinWeight
					}
					price = weightKg * m.Rate
				case "free_shipping":
					// FIXED: Only free if subtotal >= minimum threshold
					if m.MinSubtotal > 0 && input.Subtotal < m.MinSubtotal {
						continue // Don't show if not eligible
					}
					price = 0
				case "api":
					biteship := services.NewBiteshipService()
					originZip := helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE"))
					if originZip == "" {
						originZip = "10110"
					}

					rateReq := services.BiteshipRateRequest{
						OriginPostalCode:      originZip,
						DestinationPostalCode: input.PostalCode,
						DestinationCountry:    input.Country,
						Items: []services.BiteshipItem{{
							Name: "Order Items", Quantity: 1, Weight: int(input.TotalWeight), Value: input.Subtotal,
						}},
					}

					if live, err := biteship.GetRates(rateReq); err == nil && live.Success {
						for _, r := range live.Results {
							intlOptions = append(intlOptions, ShippingOption{
								ID:          fmt.Sprintf("api_%s_%s", r.CourierCode, r.ServiceCode),
								Method:      r.CourierCode,
								Name:        fmt.Sprintf("[%s] %s (%s)", strings.ToUpper(m.CourierType), r.CourierName, r.ServiceName),
								Cost:        r.Price,
								Description: matchedZone.Name,
								EstDays:     r.Duration,
							})
						}
						continue
					}
				}

				if m.CalcType != "api" {
					intlOptions = append(intlOptions, ShippingOption{
						ID:          strconv.Itoa(int(m.ID)),
						Method:      m.CourierType,
						Name:        fmt.Sprintf("[%s] %s", strings.ToUpper(m.CourierType), m.Name),
						Cost:        price,
						Description: matchedZone.Name,
						EstDays:     m.EtaText,
					})
				}
			}
		}
	}

	// --- 4. LOGIKA BITESHIP (DOMESTIC) ---
	var biteshipOptions []ShippingOption

	if isDomestic && input.PostalCode != "" && biteshipEnabled == "true" {
		apiKey := helpers.GetSetting("biteship_api_key", os.Getenv("BITESHIP_API_KEY"))
		storePostalCode := helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE"))
		if storePostalCode == "" {
			storePostalCode = "12440"
		}

		// Building courier list dynamically from database
		var activeCodes []string
		for _, ac := range activeCarriers {
			if ac.BiteshipCode != "" {
				activeCodes = append(activeCodes, ac.BiteshipCode)
			}
		}
		courierRequest := strings.Join(activeCodes, ",")
		if courierRequest == "" {
			courierRequest = "jne,sicepat,jnt" // Safety fallback
		}

		weightInGrams := int(input.TotalWeight * 1000)
		if weightInGrams < 100 {
			weightInGrams = 100
		}

		payloadMap := map[string]interface{}{
			"origin_postal_code":      storePostalCode,
			"destination_postal_code": input.PostalCode,
			"couriers":                courierRequest,
			"items": []map[string]interface{}{
				{"name": "Order Items", "value": int(input.Subtotal), "weight": weightInGrams, "quantity": 1},
			},
		}

		jsonData, _ := json.Marshal(payloadMap)
		req, _ := http.NewRequest("POST", "https://api.biteship.com/v1/rates/couriers", bytes.NewBuffer(jsonData))
		req.Header.Set("Authorization", apiKey)
		req.Header.Set("Content-Type", "application/json")

		client := &http.Client{Timeout: 8 * time.Second}
		resp, err := client.Do(req)

		if err == nil {
			defer resp.Body.Close()
			body, _ := io.ReadAll(resp.Body)
			var biteshipRes struct {
				Success bool `json:"success"`
				Pricing []struct {
					Company            string  `json:"company"`
					CourierServiceName string  `json:"courier_service_name"`
					CourierServiceCode string  `json:"courier_service_code"`
					Price              float64 `json:"price"`
					Duration           string  `json:"duration"`
				} `json:"pricing"`
				Error string `json:"error"`
			}
			json.Unmarshal(body, &biteshipRes)
			fmt.Printf("🚚 Biteship API Success: %v, Pricing Count: %d\n", biteshipRes.Success, len(biteshipRes.Pricing))

			if biteshipRes.Success {
				for i, rate := range biteshipRes.Pricing {
					cCompany := strings.ToLower(rate.Company)
					cService := strings.ToLower(rate.CourierServiceCode)

					// SINKRONISASI: Hanya ambil kurir yang HIJAU/AKTIF di Admin
					if !activeMap[cCompany] {
						continue
					}

					// SINKRONISASI: Cek Layanan Spesifik (jika ada data services di db, filter. Jika kosong/kurir baru, loloskan semua sementara untuk safe backward compatibility, atau enforce filter)
					if servMap, exists := activeServicesMap[cCompany]; exists {
						// Jika kurir ini punya daftar layanan di db, pastikan layanannya Aktif
						if len(servMap) > 0 {
							if !servMap[cService] {
								continue
							}
						}
					}

					estDays := rate.Duration
					if estDays == "" {
						estDays = "1 - 3 Days" // Safe fallback
					}
					// Optional: capitalize unit for better UI
					estDays = strings.ReplaceAll(estDays, "days", "DAYS")
					estDays = strings.ReplaceAll(estDays, "hours", "HOURS")
					biteshipOptions = append(biteshipOptions, ShippingOption{
						ID:          fmt.Sprintf("biteship_%s_%d", rate.Company, i),
						Method:      rate.Company,
						Name:        fmt.Sprintf("%s - %s", strings.ToUpper(rate.Company), rate.CourierServiceName),
						Cost:        rate.Price,
						Description: fmt.Sprintf("Weight: %.2f kg", input.TotalWeight),
						EstDays:     estDays,
					})
				}
			}
		}

		// FALLBACK MOCK jika Biteship gagal/kosong tapi data kurir aktif ada
		if len(biteshipOptions) == 0 {
			// Tentukan zona domestik dari kode pos tujuan
			// Prefix kode pos Indonesia:
			// 10-19: Jakarta, 20-29: Sumatera, 30-39: Jawa Barat, 40-49: Jawa Tengah/Timur
			// 50-59: Jawa Tengah/DIY, 60-69: Jawa Timur/Kalimantan, 70-79: Sulawesi
			// 80-89: Bali/NTB/NTT, 90-99: Papua/Maluku
			zoneMultiplier := 1.0
			estDays := "2 - 4 Days"
			zoneName := "JAWA"

			if len(input.PostalCode) >= 2 {
				prefix := input.PostalCode[:2]
				prefixNum := 0
				fmt.Sscanf(prefix, "%d", &prefixNum)

				// Tentukan zona dari kode pos asal toko
				originPrefix := 0
				storePC := helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE"))
				if len(storePC) >= 2 {
					fmt.Sscanf(storePC[:2], "%d", &originPrefix)
				}

				// Cek apakah asal dan tujuan di pulau yang sama
				originIsland := getIsland(originPrefix)
				destIsland := getIsland(prefixNum)

				if originIsland == destIsland {
					// Sama pulau
					zoneMultiplier = 1.0
					estDays = "1 - 3 Days"
					zoneName = destIsland
				} else if destIsland == "SUMATERA" || destIsland == "BALI_NUSA" {
					zoneMultiplier = 1.5
					estDays = "3 - 5 Days"
					zoneName = destIsland
				} else if destIsland == "KALIMANTAN" || destIsland == "SULAWESI" {
					zoneMultiplier = 2.0
					estDays = "4 - 7 Days"
					zoneName = destIsland
				} else if destIsland == "PAPUA" || destIsland == "MALUKU" {
					zoneMultiplier = 3.0
					estDays = "7 - 14 Days"
					zoneName = destIsland
				} else {
					zoneMultiplier = 1.2
					estDays = "2 - 5 Days"
					zoneName = destIsland
				}
			}

			fmt.Printf("📍 Mock Zone: %s (multiplier: %.1fx)\n", zoneName, zoneMultiplier)

			// Dynamic fallback rates from DB (carrier_templates.fallback_rate)
			for _, ac := range activeCarriers {
				code := strings.ToLower(ac.BiteshipCode)
				if code == "" {
					code = strings.ToLower(ac.Name)
				}
				base := ac.FallbackRate
				if base <= 0 {
					base = 20000 // Ultimate safety fallback
				}
				mockPrice := input.TotalWeight * base * zoneMultiplier
				if mockPrice < base {
					mockPrice = base
				}
				biteshipOptions = append(biteshipOptions, ShippingOption{
					ID:          fmt.Sprintf("mock_%s", code),
					Method:      code,
					Name:        fmt.Sprintf("%s REGULAR - %s (SIMULATED)", strings.ToUpper(ac.Name), zoneName),
					Cost:        mockPrice,
					Description: fmt.Sprintf("Weight: %.2f kg | Zone: %s", input.TotalWeight, zoneName),
					EstDays:     estDays,
				})
			}
		}
	}

	// --- 4. GABUNGKAN DENGAN TARIF DATABASE (ASIA/Manual) ---
	var options []ShippingOption
	for _, rate := range dbRates {
		// SINKRONISASI: Cek apakah Nama Kurir (misal JNE) Aktif di Admin
		methodLower := strings.ToLower(rate.Method)
		if strings.Contains(methodLower, "jne") {
			methodLower = "jne"
		}
		if strings.Contains(methodLower, "sicepat") {
			methodLower = "sicepat"
		}
		if strings.Contains(methodLower, "j&t") || strings.Contains(methodLower, "jnt") {
			methodLower = "j&t"
		}

		isManualMethod := methodLower == "air" || methodLower == "sea" || methodLower == "ship" ||
			rate.Zone == "CARGO" || rate.Zone == "DOMESTIC" || rate.Zone == "ALL"

		if exists := activeMap[methodLower]; !exists && !isManualMethod {
			// Skip jika kurir ini tidak terdaftar/aktif di Admin bos
			continue
		}

		isCargoRate := strings.EqualFold(rate.Method, "AIR") || strings.EqualFold(rate.Method, "SHIP") || strings.EqualFold(rate.Method, "SEA") || strings.EqualFold(rate.Zone, "CARGO")

		// FIX 1: Mencegah tarif ganda. Sembunyikan tarif fallback (Non-Cargo) jika API Biteship sudah merespon.
		if len(biteshipOptions) > 0 && !isCargoRate {
			continue
		}

		chargeWeight := input.TotalWeight
		if chargeWeight < rate.MinChargeWeight {
			chargeWeight = rate.MinChargeWeight
		}

		cost := rate.BaseCost + (chargeWeight * rate.CostPerKg)

		displayName := fmt.Sprintf("%s - %s", rate.Zone, rate.Method)
		if strings.EqualFold(rate.Method, "AIR") {
			displayName = "📦 VIA AIR (ON-AIR)"
		} else if strings.EqualFold(rate.Method, "SHIP") || strings.EqualFold(rate.Method, "SEA") {
			displayName = "📦 VIA SHIP (LAUT)"
		}

		desc := fmt.Sprintf("Estimasi: %d-%d Hari", rate.EstDaysMin, rate.EstDaysMax)

		// FIX 3: Tambahkan info minimum berat charge agar user tidak bingung.
		if rate.MinChargeWeight > 0 {
			desc += fmt.Sprintf("\n(Berlaku minimal %v KG)", rate.MinChargeWeight)
		}

		options = append(options, ShippingOption{
			ID:          fmt.Sprintf("db_%d", rate.ID),
			Method:      rate.Method,
			Name:        displayName,
			Cost:        cost,
			Description: desc,
			EstDays:     fmt.Sprintf("%d-%d Hari", rate.EstDaysMin, rate.EstDaysMax),
		})
	}

	// Gabungkan hasil dari Domestic (Biteship + DB Legacy) dan IntlOptions
	options = append(options, biteshipOptions...)
	options = append(options, intlOptions...)

	c.JSON(http.StatusOK, options)
}

// GetSavedCards - List user's saved payment methods
func GetSavedCards(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)

	var cards []models.PrismalinkCard
	// Only return ACTIVE and BOUND cards
	if err := config.DB.Where("user_id = ? AND is_active = ? AND bind_status = ?", user.ID, true, "ACTIVE").Find(&cards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved cards"})
		return
	}

	type CardResponse struct {
		ID        uint   `json:"id"`
		CardDigit string `json:"card_digit"` // Last 4
		BankID    string `json:"bank_id"`    // Visa, Master, Etc
		CardToken string `json:"card_token"`
	}

	var response []CardResponse
	for _, card := range cards {
		response = append(response, CardResponse{
			ID:        card.ID,
			CardDigit: card.CardDigit,
			BankID:    card.BankID,
			CardToken: card.CardToken,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// TrackingEvent represents a single tracking history event
type TrackingEvent struct {
	Status      string `json:"status"`
	Description string `json:"description"`
	Location    string `json:"location"`
	Timestamp   string `json:"timestamp"`
	IsDone      bool   `json:"is_done"`
}

// GetOrderTracking - Returns real-time tracking info from Biteship or simulation
func GetOrderTracking(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	orderID := c.Param("id")

	var order models.Order
	if err := config.DB.Where("user_id = ? AND id = ?", user.ID, orderID).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	type TrackingResponse struct {
		TrackingNumber string          `json:"tracking_number"`
		Carrier        string          `json:"carrier"`
		Status         string          `json:"status"`
		StatusLabel    string          `json:"status_label"`
		Origin         string          `json:"origin"`
		Destination    string          `json:"destination"`
		LastUpdate     string          `json:"last_update"`
		Events         []TrackingEvent `json:"events"`
		SimulationMode bool            `json:"simulation_mode"`
	}

	// If no tracking number yet, return pipeline status
	if order.TrackingNumber == "" {
		events := generateOrderPipelineEvents(order)
		c.JSON(http.StatusOK, TrackingResponse{
			TrackingNumber: "-",
			Carrier:        order.ShippingMethod,
			Status:         order.Status,
			StatusLabel:    getOrderStatusLabel(order.Status),
			Origin:         "Warung Forza HQ",
			Destination:    order.BillingCity,
			LastUpdate:     order.UpdatedAt.Format("02 Jan 2006, 15:04"),
			Events:         events,
			SimulationMode: true,
		})
		return
	}

	// --- CALL BITESHIP TRACKING API ---
	apiKey := helpers.GetSetting("biteship_api_key", os.Getenv("BITESHIP_API_KEY"))
	trackingURL := fmt.Sprintf("https://api.biteship.com/v1/trackings/%s/%s", strings.ToLower(order.Carrier), order.TrackingNumber)

	req, _ := http.NewRequest("GET", trackingURL, nil)
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)

	if err == nil && resp.StatusCode == 200 {
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)

		var biteshipTrack struct {
			Success bool   `json:"success"`
			Message string `json:"message"`
			Object  struct {
				WaybillID string `json:"waybill_id"`
				Courier   struct {
					Company string `json:"company"`
					Name    string `json:"name"`
				} `json:"courier"`
				Origin struct {
					LocationID string `json:"location_id"`
					Address    string `json:"address"`
					Note       string `json:"note"`
				} `json:"origin"`
				Destination struct {
					LocationID string `json:"location_id"`
					Address    string `json:"address"`
					Note       string `json:"note"`
				} `json:"destination"`
				Status  string `json:"status"`
				History []struct {
					Note         string `json:"note"`
					ServiceType  string `json:"service_type"`
					Status       string `json:"status"`
					UpdatedTime  string `json:"updated_time"`
					LocationCity string `json:"location_city"`
				} `json:"history"`
			} `json:"object"`
		}

		if err := json.Unmarshal(body, &biteshipTrack); err == nil && biteshipTrack.Success {
			obj := biteshipTrack.Object
			var events []TrackingEvent
			for i, h := range obj.History {
				ts, _ := time.Parse(time.RFC3339, h.UpdatedTime)
				events = append(events, TrackingEvent{
					Status:      h.Status,
					Description: h.Note,
					Location:    h.LocationCity,
					Timestamp:   ts.Format("02 Jan 2006, 15:04"),
					IsDone:      i < len(obj.History)-1,
				})
			}
			// Latest first
			for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
				events[i], events[j] = events[j], events[i]
			}

			lastUpdate := ""
			if len(obj.History) > 0 {
				ts, _ := time.Parse(time.RFC3339, obj.History[len(obj.History)-1].UpdatedTime)
				lastUpdate = ts.Format("02 Jan 2006, 15:04")
			}

			c.JSON(http.StatusOK, TrackingResponse{
				TrackingNumber: order.TrackingNumber,
				Carrier:        obj.Courier.Company,
				Status:         obj.Status,
				StatusLabel:    translateTrackingStatus(obj.Status),
				Origin:         obj.Origin.Address,
				Destination:    obj.Destination.Address,
				LastUpdate:     lastUpdate,
				Events:         events,
				SimulationMode: false,
			})
			return
		}
	}

	// --- FALLBACK: Simulasi berdasarkan status order ---
	events := generateSimulatedTrackingEvents(order)
	c.JSON(http.StatusOK, TrackingResponse{
		TrackingNumber: order.TrackingNumber,
		Carrier:        order.Carrier,
		Status:         order.Status,
		StatusLabel:    getOrderStatusLabel(order.Status),
		Origin:         "Warung Forza HQ",
		Destination:    order.BillingCity,
		LastUpdate:     order.UpdatedAt.Format("02 Jan 2006, 15:04"),
		Events:         events,
		SimulationMode: true,
	})
}

func getOrderStatusLabel(status string) string {
	labels := map[string]string{
		"pending":    "Awaiting Verification",
		"processing": "Processing",
		"shipped":    "En Route",
		"completed":  "Delivered & Closed",
		"cancelled":  "Terminated",
		"pre_order":  "Active Pre-Order",
	}
	if l, ok := labels[status]; ok {
		return l
	}
	return status
}

func translateTrackingStatus(status string) string {
	labels := map[string]string{
		"PICKING_UP":       "Courier Dispatching",
		"PICKED":           "Cargo Secured",
		"DROPPING_OFF":     "En Route to Facility",
		"IN_TRANSIT":       "In Transit",
		"OUT_FOR_DELIVERY": "Out for Delivery",
		"DELIVERED":        "Cargo Received",
		"REJECTED":         "Cargo Rejected",
		"RETURNED":         "Returned to Sender",
		"LOST":             "Cargo Missing",
	}
	if l, ok := labels[status]; ok {
		return l
	}
	return status
}

func generateOrderPipelineEvents(order models.Order) []TrackingEvent {
	now := order.UpdatedAt
	events := []TrackingEvent{}

	// Selalu ada "Order Dibuat"
	events = append(events, TrackingEvent{
		Status:      "ORDER_CREATED",
		Description: "Order successfully registered within Forza HQ database.",
		Location:    "System",
		Timestamp:   order.CreatedAt.Format("02 Jan 2006, 15:04"),
		IsDone:      true,
	})

	if order.Status == "processing" || order.Status == "shipped" || order.Status == "completed" {
		events = append(events, TrackingEvent{
			Status:      "PAYMENT_CONFIRMED",
			Description: "Payment authenticated. Forza Logistics is currently preparing the payload.",
			Location:    "Warung Forza HQ",
			Timestamp:   now.Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		})
	}

	if order.Status == "shipped" || order.Status == "completed" {
		trackingNo := order.TrackingNumber
		if trackingNo == "" {
			trackingNo = "Awaiting Tracking ID"
		}
		events = append(events, TrackingEvent{
			Status:      "SHIPPED",
			Description: fmt.Sprintf("Cargo dispatched via %s. (ID: %s)", order.Carrier, trackingNo),
			Location:    "Warung Forza HQ",
			Timestamp:   now.Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		})
	}

	if order.Status == "completed" {
		events = append(events, TrackingEvent{
			Status:      "DELIVERED",
			Description: "Cargo has been officially received by the consignee.",
			Location:    order.BillingCity,
			Timestamp:   now.Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		})
	}

	// Reverse untuk latest first
	for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
		events[i], events[j] = events[j], events[i]
	}
	return events
}

func generateSimulatedTrackingEvents(order models.Order) []TrackingEvent {
	baseTime := order.UpdatedAt
	carrier := strings.ToUpper(order.Carrier)
	if carrier == "" {
		carrier = "LOGISTICS"
	}

	events := []TrackingEvent{
		{
			Status:      "PICKED",
			Description: fmt.Sprintf("Cargo secured by %s operatives at Forza HQ.", carrier),
			Location:    "Jakarta Selatan",
			Timestamp:   baseTime.Add(-48 * time.Hour).Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		},
		{
			Status:      "IN_TRANSIT",
			Description: fmt.Sprintf("Cargo departed from %s Jakarta Facility en route to destination area.", carrier),
			Location:    fmt.Sprintf("%s Jakarta Hub", carrier),
			Timestamp:   baseTime.Add(-24 * time.Hour).Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		},
		{
			Status:      "IN_TRANSIT",
			Description: fmt.Sprintf("Cargo arrived at %s Destination Hub.", carrier),
			Location:    order.BillingCity,
			Timestamp:   baseTime.Add(-4 * time.Hour).Format("02 Jan 2006, 15:04"),
			IsDone:      order.Status == "completed",
		},
		{
			Status:      "OUT_FOR_DELIVERY",
			Description: "Cargo is currently out for final delivery to your designated coordinates.",
			Location:    order.BillingCity,
			Timestamp:   baseTime.Format("02 Jan 2006, 15:04"),
			IsDone:      order.Status == "completed",
		},
	}

	if order.Status == "completed" {
		events = append(events, TrackingEvent{
			Status:      "DELIVERED",
			Description: "Cargo delivered successfully. We appreciate your transaction with ForzaHQ.",
			Location:    order.BillingCity,
			Timestamp:   order.UpdatedAt.Format("02 Jan 2006, 15:04"),
			IsDone:      true,
		})
	}

	// Reverse untuk latest first
	for i, j := 0, len(events)-1; i < j; i, j = i+1, j-1 {
		events[i], events[j] = events[j], events[i]
	}
	return events
}

// JoinWaitlist - Add user to product restock notification waitlist
func JoinWaitlist(c *gin.Context) {
	user := c.MustGet("currentUser").(models.User)
	productID := c.Param("id")

	var product models.Product
	if err := config.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check if already in waitlist
	var existing models.RestockNotification
	err := config.DB.Where("user_id = ? AND product_id = ? AND status = ?", user.ID, product.ID, "pending").First(&existing).Error
	if err == nil {
		// Already in waitlist
		c.JSON(http.StatusOK, gin.H{"message": "Anda sudah terdaftar dalam antrean Waitlist. Kami akan kabari jika ready!"})
		return
	}

	// Insert into waitlist
	waitlist := models.RestockNotification{
		UserID:    user.ID,
		ProductID: product.ID,
		Status:    "pending",
	}

	if err := config.DB.Create(&waitlist).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftar Waitlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil! Anda akan diberi notifikasi segera setelah produk ini tersedia kembali."})
}
