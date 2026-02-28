package helpers

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"
)

// ===============================================
// PRISMALINK PAYMENT GATEWAY INTEGRATION
// ===============================================

// PrismalinkConfig holds the gateway configuration
type PrismalinkConfig struct {
	MerchantID     string
	KeyID          string
	SecretKey      string
	BaseURL        string
	CallbackURL    string
	ReturnURL      string
	PaymentPageURL string // Separate URL for payment page (may differ from API)
}

// GetPrismalinkConfig loads config from environment
func GetPrismalinkConfig() PrismalinkConfig {
	baseURL := GetSetting("prismalink_url", os.Getenv("PRISMALINK_URL")) // Primary
	if baseURL == "" {
		baseURL = os.Getenv("PRISMALINK_BASE_URL") // Fallback
	}

	if baseURL == "" {
		baseURL = "https://api-staging.plink.co.id/gateway/v2"
	}

	appURL := GetAppURL()

	merchantID := GetSetting("prismalink_merchant_id", os.Getenv("PRISMALINK_MERCHANT_ID"))
	keyID := GetSetting("prismalink_key_id", os.Getenv("PRISMALINK_KEY_ID"))
	secretKey := GetSetting("prismalink_secret_key", os.Getenv("PRISMALINK_SECRET_KEY"))

	callbackURL := os.Getenv("PLINK_BACKEND_CALLBACK")
	if callbackURL == "" {
		callbackURL = appURL + "/api/webhooks/prismalink"
	}

	frontendReturnURL := GetFrontendURL() + "/payment/callback"

	// Payment page uses different domain than API
	// From Prismalink Docs:
	// - Sandbox Web: https://secure2-staging.plink.co.id
	// - Production Web: https://secure3.plink.co.id
	paymentPageURL := os.Getenv("PRISMALINK_PAYMENT_PAGE_URL")
	if paymentPageURL == "" {
		// Default to staging payment page domain
		paymentPageURL = "https://secure2-staging.plink.co.id"
	}

	return PrismalinkConfig{
		MerchantID:     merchantID,
		KeyID:          keyID,
		SecretKey:      secretKey,
		BaseURL:        baseURL,
		CallbackURL:    callbackURL,
		ReturnURL:      frontendReturnURL,
		PaymentPageURL: paymentPageURL,
	}
}

// CreatePaymentRequest for standard V2
type CreatePaymentRequest struct {
	MerchantID      string `json:"merchant_id"`
	MerchantTradeNo string `json:"merchant_trade_no"`
	Amount          int64  `json:"amount"`
	Currency        string `json:"currency"`
	ProductName     string `json:"product_name"`
	CustomerName    string `json:"customer_name"`
	CustomerEmail   string `json:"customer_email"`
	CustomerPhone   string `json:"customer_phone"`
	NotifyURL       string `json:"notify_url"`
	ReturnURL       string `json:"return_url"`
	Signature       string `json:"signature"`
	Timestamp       string `json:"timestamp"`
}

// CreatePaymentResponse is the response from Prismalink
type CreatePaymentResponse struct {
	Status      string `json:"status"`
	Code        string `json:"code"`
	Message     string `json:"message"`
	PaymentURL  string `json:"payment_url"`
	RedirectURL string `json:"redirect_url"`
	Token       string `json:"token"`
	TrxID       string `json:"trx_id"`
}

// GenerateSignatureV2 creates SHA256 signature for Prismalink V2 (Legacy/Concatenation)
// Formula: merchant_id + key_id + trade_no + amount + timestamp + secret_key
func GenerateSignatureV2(config PrismalinkConfig, tradeNo string, amount int64, timestamp string) string {
	stringToSign := config.MerchantID + config.KeyID + tradeNo + strconv.FormatInt(amount, 10) + timestamp + config.SecretKey
	hash := sha256.Sum256([]byte(stringToSign))
	return strings.ToUpper(hex.EncodeToString(hash[:]))
}

// GenerateHMACSignature creates HMAC-SHA256 signature of the body
func GenerateHMACSignature(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

// pkcs5Padding adds PKCS5 padding to the plaintext
func pkcs5Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

// encryptAES256CBC encrypts plaintext using AES-256 CBC mode with zero IV
func encryptAES256CBC(plaintext []byte, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	blockSize := block.BlockSize()
	plaintext = pkcs5Padding(plaintext, blockSize)

	// Prismalink requires a static zero IV (16 bytes of 0x00)
	iv := make([]byte, blockSize)

	ciphertext := make([]byte, len(plaintext))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, plaintext)

	return ciphertext, nil
}

// PaymentData holds structured payment information for frontend rendering
type PaymentData struct {
	Type          string                   `json:"type"`           // "va", "qris", "redirect", "cc_form"
	PaymentMethod string                   `json:"payment_method"` // "VA", "QR", "CC", etc.
	MerchantRefNo string                   `json:"merchant_ref_no"`
	VANumberList  []map[string]interface{} `json:"va_number_list,omitempty"`
	QRISData      string                   `json:"qris_data,omitempty"`
	QRISImageURL  string                   `json:"qris_image_url,omitempty"`
	RedirectURL   string                   `json:"redirect_url,omitempty"`
	SessionToken  string                   `json:"session_token,omitempty"`
	Amount        float64                  `json:"amount"`
	InvoiceNumber string                   `json:"invoice_number"`
	Validity      string                   `json:"validity,omitempty"`
	PlinkRefNo    string                   `json:"plink_ref_no,omitempty"`
	RawResponse   map[string]interface{}   `json:"raw_response,omitempty"`
}

// SubmitCreditCard sends credit card details to Prismalink's submit-card endpoint
// This function requires sessionToken from submit-trx and AES encrypted card_data per Prismalink docs
func SubmitCreditCard(configData PrismalinkConfig, merchantRefNo string, sessionToken string, invoice models.Invoice, user models.User, cardData map[string]string, clientIP string) (*PaymentData, error) {
	// Sanitize client IP for Prismalink validation
	if clientIP == "" || clientIP == "::1" || clientIP == "127.0.0.1" || strings.HasPrefix(clientIP, "192.168.") || strings.HasPrefix(clientIP, "10.") {
		clientIP = "114.114.114.114" // Default valid public IP for sandbox/localhost
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05.000 -0700")
	validity := time.Now().Add(24 * time.Hour).Format("2006-01-02 15:04:05.000 -0700")

	// Format Phone - Ensure valid phone number (min 10 digits for Prismalink)
	formattedPhone := formatPhoneNumber(user.Phone)
	// Prismalink requires a valid phone number - use fallback if too short
	cleanPhone := strings.ReplaceAll(strings.ReplaceAll(formattedPhone, "+", ""), "-", "")
	if len(cleanPhone) < 10 {
		formattedPhone = "+6281234567890" // Default fallback
		log.Printf("⚠️ User phone '%s' too short, using fallback", user.Phone)
	}

	// Detect card type from card number
	cardNumber := cardData["card_number"]
	cardType := "VISA" // default
	if len(cardNumber) > 0 {
		switch {
		case cardNumber[0] == '4':
			cardType = "VISA"
		case cardNumber[0] == '5':
			cardType = "MASTERCARD"
		case len(cardNumber) >= 2 && cardNumber[:2] == "35":
			cardType = "JCB"
		case len(cardNumber) >= 2 && (cardNumber[:2] == "34" || cardNumber[:2] == "37"):
			cardType = "AMEX"
		}
	}

	// Prepare Product Details (required by Prismalink)
	type ItemDetail struct {
		ItemCode  int    `json:"item_code"`
		ItemTitle string `json:"item_title"`
		Quantity  int    `json:"quantity"`
		Total     int64  `json:"total"`
		Currency  string `json:"currency"`
	}
	var items []ItemDetail
	if len(invoice.Order.Items) > 0 {
		for _, it := range invoice.Order.Items {
			items = append(items, ItemDetail{
				ItemCode:  int(it.ProductID),
				ItemTitle: it.Product.Name,
				Quantity:  it.Quantity,
				Total:     int64(it.Total),
				Currency:  "IDR",
			})
		}
	}
	if len(items) == 0 {
		items = append(items, ItemDetail{
			ItemCode:  1,
			ItemTitle: "Payment for Invoice " + invoice.InvoiceNumber,
			Quantity:  1,
			Total:     int64(invoice.Amount),
			Currency:  "IDR",
		})
	}
	productDetailsJSON, _ := json.Marshal(items)

	// Normalize expiry year: Prismalink requires 2-digit year (e.g. '25' not '2025')
	expYear := cardData["exp_year"]
	if len(expYear) == 4 {
		expYear = expYear[2:] // '2025' -> '25'
	}
	expMonth := cardData["exp_month"]
	// Ensure month is 2 digits: '1' -> '01'
	if len(expMonth) == 1 {
		expMonth = "0" + expMonth
	}

	// Create plain card JSON — ONLY card fields per Prismalink docs Sec 5.3
	// DO NOT add callback URLs here, those go in the request body separately
	plainCardObj := map[string]interface{}{
		"cardNo":           cardNumber,
		"cardExpiryMonth":  expMonth,
		"cardExpiryYear":   expYear,
		"cardSecurityCode": cardData["cvv"],
		"cardType":         cardType,
	}
	plainCardJSON, err := json.Marshal(plainCardObj)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal card details: %w", err)
	}

	// Encrypt card_data JSON using AES-256 CBC
	// Prismalink likely uses PHP's openssl_encrypt. If the SecretKey is < 32 bytes (AES-256 requires 32),
	// PHP pads it with null bytes. We must do the same in Go.
	encryptionKey := make([]byte, 32)
	copy(encryptionKey, []byte(configData.SecretKey))

	encryptedCardData, err := encryptAES256CBC(plainCardJSON, encryptionKey)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt card data: %w", err)
	}
	encryptedCardDataBase64 := base64.StdEncoding.EncodeToString(encryptedCardData)

	// Build request body per Prismalink submit-card spec (Section 5.3)
	// Both card_data (encrypted) AND individual card fields are MANDATORY
	// CRITICAL: transaction_amount must be Number (int64), NOT string
	requestBodyMap := map[string]interface{}{
		"merchant_key_id":        configData.KeyID,
		"merchant_id":            configData.MerchantID,
		"merchant_ref_no":        merchantRefNo,
		"backend_callback_url":   configData.CallbackURL,
		"frontend_callback_url":  configData.ReturnURL,
		"transaction_date_time":  timestamp,
		"transmission_date_time": timestamp,
		"transaction_currency":   "IDR",
		"transaction_amount":     int64(invoice.Amount),
		"product_details":        string(productDetailsJSON),
		"user_id":                fmt.Sprintf("%d", user.ID),
		"user_name":              user.FullName,
		"user_email":             user.Email,
		"user_phone_number":      formattedPhone,
		"user_device_id":         "WEB",
		"user_ip_address":        clientIP,
		"invoice_number":         invoice.InvoiceNumber,
		"validity":               validity,
		"bind_card_status":       "N",
		// Encrypted card_data + plain card fields (both required per docs)
		"card_data":        encryptedCardDataBase64,
		"cardNo":           cardNumber,
		"cardExpiryMonth":  expMonth,
		"cardExpiryYear":   expYear,
		"cardSecurityCode": cardData["cvv"],
		"cardType":         cardType,
	}

	jsonBody, err := json.Marshal(requestBodyMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	log.Printf("Payload to Prismalink: %s", string(jsonBody))

	// HMAC-SHA256 Signature
	macHash := hmac.New(sha256.New, []byte(configData.SecretKey))
	macHash.Write(jsonBody)
	signature := hex.EncodeToString(macHash.Sum(nil))

	// CORRECT endpoint path per Prismalink docs Section 5.3
	targetPath := "/payment/integration/creditcard/submit-card"
	apiURL := configData.BaseURL + targetPath

	log.Printf("--------------------------------------------------")
	log.Printf("🚀 PRISMALINK CC SUBMIT-CARD (Path: %s)", targetPath)
	log.Printf("RefNo: %s | CardType: %s", merchantRefNo, cardType)
	log.Printf("URL: %s", apiURL)
	log.Printf("--------------------------------------------------")

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("mac", signature)
	if sessionToken != "" {
		req.Header.Set("sessiontoken", sessionToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("📥 RESPONSE [%d]: %s", resp.StatusCode, string(bodyBytes))

	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("parse error: %s", string(bodyBytes))
	}

	// Check for API error — Prismalink CC returns various success codes
	respCode, _ := result["response_code"].(string)
	respMsg, _ := result["response_message"].(string)
	respDesc, _ := result["response_description"].(string)
	errDetail := respDesc
	if errDetail == "" {
		errDetail = respMsg
	}
	log.Printf("📋 CC submit-card response_code=%s msg=%s description=%s", respCode, respMsg, respDesc)

	// Also check nested 'data' for response_code
	if respCode == "" {
		if data, ok := result["data"].(map[string]interface{}); ok {
			respCode, _ = data["response_code"].(string)
		}
	}

	// Success codes: PL000, 00, 200, MBDD00 — anything else is an error
	if respCode != "" && respCode != "00" && respCode != "PL000" && respCode != "200" && respCode != "MBDD00" {
		return nil, fmt.Errorf("[%s] %s", respCode, errDetail)
	}

	plinkRefNo, _ := result["plink_ref_no"].(string)
	validityResp, _ := result["validity"].(string)
	if validityResp == "" {
		validityResp = validity
	}

	// Check if response contains a new session token, otherwise use existing one
	newSessionToken, ok := result["session_token"].(string)
	if ok && newSessionToken != "" {
		sessionToken = newSessionToken
	}

	// Extract 3DS redirect URL — can be in 'form_url' OR 'redirect_url_3d' per Prismalink docs
	formURL, _ := result["form_url"].(string)
	if formURL == "" {
		formURL, _ = result["redirect_url_3d"].(string)
	}
	if formURL == "" {
		formURL, _ = result["redirect_url"].(string)
	}
	// Also check nested data object
	if formURL == "" {
		if data, ok := result["data"].(map[string]interface{}); ok {
			if u, ok := data["form_url"].(string); ok {
				formURL = u
			} else if u, ok := data["redirect_url_3d"].(string); ok {
				formURL = u
			}
		}
	}
	txStatus, _ := result["transaction_status"].(string)
	paymentDate, _ := result["payment_date"].(string)

	log.Printf("📋 CC submit-card: form_url=%s, transaction_status=%s, payment_date=%s, plink_ref_no=%s", formURL, txStatus, paymentDate, plinkRefNo)

	// Update PaymentTransaction with the new plink_ref_no from submit-card
	if plinkRefNo != "" {
		config.DB.Model(&models.PaymentTransaction{}).
			Where("merchant_ref_no = ?", merchantRefNo).
			Updates(map[string]interface{}{
				"gateway_tx_id":  plinkRefNo,
				"payment_method": "CC",
			})
	}

	paymentData := &PaymentData{
		PaymentMethod: "CC",
		MerchantRefNo: merchantRefNo,
		Amount:        invoice.Amount,
		InvoiceNumber: invoice.InvoiceNumber,
		PlinkRefNo:    plinkRefNo,
		Validity:      validityResp,
		SessionToken:  sessionToken,
		RawResponse:   result,
	}

	// If 3DS form_url exists → redirect user there for OTP/3DS verification
	if formURL != "" {
		paymentData.Type = "redirect"
		paymentData.RedirectURL = formURL
		log.Printf("✅ CC 3DS redirect URL obtained: %s", formURL)
	} else if txStatus == "SETLD" {
		// Direct settlement without 3DS (e.g. recurring/tokenized payment)
		paymentData.Type = "cc_settled"
		log.Printf("✅ CC payment settled directly without 3DS")
	} else {
		// Fallback: return as cc_form for waiting state
		paymentData.Type = "cc_form"
	}

	return paymentData, nil
}

func GeneratePaymentDirect(order models.Order, invoice models.Invoice, user models.User, clientIP string) (*PaymentData, error) {
	// Sanitize client IP for Prismalink validation
	if clientIP == "" || clientIP == "::1" || clientIP == "127.0.0.1" || strings.HasPrefix(clientIP, "192.168.") || strings.HasPrefix(clientIP, "10.") {
		clientIP = "114.114.114.114" // Default valid public IP for sandbox/localhost
	}

	configData := GetPrismalinkConfig()

	timestamp := time.Now().Format("2006-01-02 15:04:05.000 -0700")
	validity := time.Now().Add(24 * time.Hour).Format("2006-01-02 15:04:05.000 -0700")

	// Generate Unique Merchant Ref No
	uniqueRefNo := fmt.Sprintf("%s-%s", invoice.InvoiceNumber, time.Now().Format("150405"))
	if len(uniqueRefNo) > 25 {
		uniqueRefNo = invoice.InvoiceNumber[len(invoice.InvoiceNumber)-6:] + "-" + time.Now().Format("150405")
	}

	// Create Payment Transaction Record
	if err := config.DB.Create(&models.PaymentTransaction{
		OrderID:       order.ID,
		InvoiceID:     invoice.ID,
		MerchantRefNo: uniqueRefNo,
		ExternalID:    fmt.Sprintf("%d", invoice.ID),
		Type:          invoice.Type,
		Amount:        invoice.Amount,
		Status:        "pending",
		Gateway:       "prismalink",
	}).Error; err != nil {
		log.Printf("⚠️ DB Create Error (Non-Fatal): %v", err)
	}

	// Prepare Product Details
	type ItemDetail struct {
		ItemCode  int    `json:"item_code"`
		ItemTitle string `json:"item_title"`
		Quantity  int    `json:"quantity"`
		Total     int64  `json:"total"`
		Currency  string `json:"currency"`
	}

	var items []ItemDetail
	if len(order.Items) > 0 {
		for _, it := range order.Items {
			items = append(items, ItemDetail{
				ItemCode:  int(it.ProductID),
				ItemTitle: it.Product.Name,
				Quantity:  it.Quantity,
				Total:     int64(it.Total),
				Currency:  "IDR",
			})
		}
	} else {
		items = append(items, ItemDetail{
			ItemCode:  1,
			ItemTitle: "Payment for Invoice " + invoice.InvoiceNumber,
			Quantity:  1,
			Total:     int64(invoice.Amount),
			Currency:  "IDR",
		})
	}

	productDetailsJSON, _ := json.Marshal(items)

	// Format Phone
	formattedPhone := formatPhoneNumber(user.Phone)

	// Map Payment Method
	pmValue := order.PaymentMethod
	if order.PaymentMethod == "QRIS" {
		pmValue = "QR"
	}

	// ALWAYS use integration_type = "02" (Full API) for native UI
	integrationType := "02"

	requestBodyMap := map[string]interface{}{
		"merchant_key_id":        configData.KeyID,
		"merchant_id":            configData.MerchantID,
		"merchant_ref_no":        uniqueRefNo,
		"backend_callback_url":   configData.CallbackURL,
		"frontend_callback_url":  configData.ReturnURL,
		"transaction_date_time":  timestamp,
		"transmission_date_time": timestamp,
		"transaction_currency":   "IDR",
		"transaction_amount":     int64(invoice.Amount),
		"product_details":        string(productDetailsJSON),
		"user_id":                fmt.Sprintf("%d", user.ID),
		"user_name": func() string {
			if order.BillingFirstName != "" {
				return order.BillingFirstName
			}
			return user.FullName
		}(),
		"user_email": func() string {
			if order.BillingEmail != "" {
				return order.BillingEmail
			}
			return user.Email
		}(),
		"user_phone_number": formattedPhone,
		"user_device_id":    "WEB",
		"user_ip_address":   clientIP,
		"payment_method":    pmValue,
		"invoice_number":    invoice.InvoiceNumber,
		"integration_type":  integrationType,
		"validity":          validity,
		"external_id":       fmt.Sprintf("%d", order.ID),
		"bank_id":           "",
	}

	// Add va_name for VA payments
	if pmValue == "VA" {
		requestBodyMap["va_name"] = order.BillingFirstName + " " + order.BillingLastName
	}

	jsonBody, err := json.Marshal(requestBodyMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// HMAC-SHA256 Signature
	macHash := hmac.New(sha256.New, []byte(configData.SecretKey))
	macHash.Write(jsonBody)
	signature := hex.EncodeToString(macHash.Sum(nil))

	targetPath := "/payment/integration/transaction/api/submit-trx"
	apiURL := configData.BaseURL + targetPath

	log.Printf("--------------------------------------------------")
	log.Printf("🚀 PRISMALINK FULL API (Integration: %s, Method: %s)", integrationType, pmValue)
	log.Printf("RefNo: %s", uniqueRefNo)
	log.Printf("URL: %s", apiURL)
	log.Printf("--------------------------------------------------")

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("mac", signature)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("📥 RESPONSE [%d]: %s", resp.StatusCode, string(bodyBytes))

	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("parse error: %s", string(bodyBytes))
	}

	// Check for API error
	respCode, _ := result["response_code"].(string)
	respDesc, _ := result["response_description"].(string)
	if respCode != "" && respCode != "00" && respCode != "PL000" && respCode != "200" {
		return nil, fmt.Errorf("[%s] %s", respCode, respDesc)
	}

	plinkRefNo, _ := result["plink_ref_no"].(string)
	validityResp, _ := result["validity"].(string)
	if validityResp == "" {
		validityResp = validity
	}

	// CRITICAL: Save plink_ref_no back to PaymentTransaction so inquiry works
	if plinkRefNo != "" {
		config.DB.Model(&models.PaymentTransaction{}).
			Where("merchant_ref_no = ?", uniqueRefNo).
			Updates(map[string]interface{}{
				"gateway_tx_id":  plinkRefNo,
				"payment_method": pmValue,
			})
		log.Printf("✅ Saved plink_ref_no=%s for merchant_ref=%s", plinkRefNo, uniqueRefNo)
	}

	paymentData := &PaymentData{
		MerchantRefNo: uniqueRefNo,
		Amount:        invoice.Amount,
		InvoiceNumber: invoice.InvoiceNumber,
		PlinkRefNo:    plinkRefNo,
		Validity:      validityResp,
		PaymentMethod: pmValue,
		RawResponse:   result,
	}

	// === PARSE RESPONSE BY PAYMENT METHOD ===

	// 1. QRIS: Extract qris_data
	if pmValue == "QR" {
		paymentData.Type = "qris"
		var qrString string

		if qrisDataStr, ok := result["qris_data"].(string); ok && qrisDataStr != "" && qrisDataStr != "null" {
			if strings.HasPrefix(strings.TrimSpace(qrisDataStr), "{") {
				var qrisObj struct {
					QRString string `json:"qr_string"`
					QRImage  string `json:"qr_image"`
				}
				if err := json.Unmarshal([]byte(qrisDataStr), &qrisObj); err == nil {
					qrString = qrisObj.QRString
				}
			} else {
				qrString = qrisDataStr
			}
		} else if qrisDataMap, ok := result["qris_data"].(map[string]interface{}); ok {
			if s, ok := qrisDataMap["qr_string"].(string); ok {
				qrString = s
			}
		}

		if qrString != "" {
			paymentData.QRISData = qrString
			paymentData.QRISImageURL = fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=%s", qrString)
			log.Printf("✅ QRIS Data extracted successfully")
		}
		return paymentData, nil
	}

	// 2. VA: Extract va_number_list
	if pmValue == "VA" || pmValue == "" {
		paymentData.Type = "va"
		if vaListRaw, ok := result["va_number_list"]; ok {
			switch v := vaListRaw.(type) {
			case string:
				// va_number_list is a JSON string
				var vaList []map[string]interface{}
				if err := json.Unmarshal([]byte(v), &vaList); err == nil {
					paymentData.VANumberList = vaList
				}
			case []interface{}:
				// va_number_list is already an array
				for _, item := range v {
					if m, ok := item.(map[string]interface{}); ok {
						paymentData.VANumberList = append(paymentData.VANumberList, m)
					}
				}
			}
		}

		if len(paymentData.VANumberList) > 0 {
			log.Printf("✅ VA Numbers extracted: %d banks", len(paymentData.VANumberList))
			return paymentData, nil
		}
	}

	// 3. CC: Extract session_token for 2-step flow
	if pmValue == "CC" {
		// New: Extract creditcard_session_token for submit-card step
		if sessionToken, ok := result["creditcard_session_token"].(string); ok && sessionToken != "" {
			paymentData.Type = "cc_form"
			paymentData.SessionToken = sessionToken
			log.Printf("✅ CC Session Token extracted for 2-step flow")
			return paymentData, nil
		}
		// Fallback: creditcard_form_url (hosted form)
		if ccURL, ok := result["creditcard_form_url"].(string); ok && ccURL != "" {
			paymentData.Type = "redirect"
			paymentData.RedirectURL = ccURL
			return paymentData, nil
		}
	}

	// 4. Fallback: Payment Page URL
	if u, ok := result["payment_page_url"].(string); ok && u != "" {
		paymentData.Type = "redirect"
		if strings.HasPrefix(u, "/") {
			u = configData.PaymentPageURL + u
		}
		paymentData.RedirectURL = u
		return paymentData, nil
	}
	if u, ok := result["payment_url"].(string); ok && u != "" {
		paymentData.Type = "redirect"
		if strings.HasPrefix(u, "/") {
			u = configData.PaymentPageURL + u
		}
		paymentData.RedirectURL = u
		return paymentData, nil
	}

	// Check nested data object
	if data, ok := result["data"].(map[string]interface{}); ok {
		if u, ok := data["payment_page_url"].(string); ok && u != "" {
			paymentData.Type = "redirect"
			paymentData.RedirectURL = u
			return paymentData, nil
		}
	}

	return paymentData, nil
}

// GeneratePaymentLink remains as a backward-compatible wrapper
// Returns the payment URL string for legacy callers
func GeneratePaymentLink(order models.Order, invoice models.Invoice, user models.User, clientIP string) (string, error) {
	paymentData, err := GeneratePaymentDirect(order, invoice, user, clientIP)
	if err != nil {
		return "", err
	}

	// For backward compat: return a URL string
	switch paymentData.Type {
	case "qris":
		if paymentData.QRISImageURL != "" {
			return paymentData.QRISImageURL, nil
		}
	case "va":
		// Encode VA data as a JSON string in a special scheme
		if len(paymentData.VANumberList) > 0 {
			vaJSON, _ := json.Marshal(paymentData)
			return "PAYMENT_DATA:" + string(vaJSON), nil
		}
	case "redirect":
		if paymentData.RedirectURL != "" {
			return paymentData.RedirectURL, nil
		}
	}

	return "", fmt.Errorf("no payment data available")
}

// formatPhoneNumber formats phone to international +62 format
func formatPhoneNumber(phone string) string {
	if strings.HasPrefix(phone, "+") {
		return phone
	} else if strings.HasPrefix(phone, "08") {
		return "+62" + phone[1:]
	} else if strings.HasPrefix(phone, "8") && len(phone) >= 9 {
		return "+62" + phone
	} else if phone != "" {
		if strings.HasPrefix(phone, "62") {
			return "+" + phone
		}
		return "+" + phone
	}
	return phone
}

// GenerateSimulationPaymentURL is now only for explicit internal testing if called manually
func GenerateSimulationPaymentURL(order models.Order, invoice models.Invoice) string {
	// Use the frontend simulator route
	return fmt.Sprintf(
		"%s/payment/simulate?order=%s&invoice=%s&amount=%.0f",
		GetFrontendURL(),
		order.OrderNumber,
		invoice.InvoiceNumber,
		invoice.Amount,
	)
}

// SubmitTRXRequest is the payload for submit-trx API
type SubmitTRXRequest struct {
	TransmissionDateTime string      `json:"transmission_date_time"`
	TransactionCurrency  string      `json:"transaction_currency"`
	MerchantKeyID        string      `json:"merchant_key_id"`
	MerchantID           string      `json:"merchant_id"`
	MerchantRefNo        string      `json:"merchant_ref_no"`
	BackendCallbackURL   string      `json:"backend_callback_url"`
	FrontendCallbackURL  string      `json:"frontend_callback_url"`
	UserID               string      `json:"user_id"`
	UserEmail            string      `json:"user_email"`
	UserPhone            string      `json:"user_phone"`
	UserName             string      `json:"user_name"`
	UserDeviceID         string      `json:"user_device_id"`
	UserIPAddress        string      `json:"user_ip_address"`
	ProductDetails       interface{} `json:"product_details"`
	InvoiceNumber        string      `json:"invoice_number"`
	TransactionAmount    float64     `json:"transaction_amount"`
	TransactionDateTime  string      `json:"transaction_date_time"`
	PaymentMethod        string      `json:"payment_method"`
	IntegrationType      string      `json:"integration_type"`
}

// SubmitPrismalinkTRX initiates a transaction via the new submit-trx API
func SubmitPrismalinkTRX(reqData SubmitTRXRequest) (map[string]interface{}, error) {
	configData := GetPrismalinkConfig()
	url := configData.BaseURL + "/payment/submit-trx"

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return nil, err
	}

	// Sign body using Merchant Secret Key
	signature := GenerateHMACSignature(jsonData, configData.SecretKey)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("mac", signature)

	startTime := time.Now()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %s", string(bodyBytes))
	}

	// Log technical API log
	logEntry := models.PrismalinkAPILog{
		MerchantID:     reqData.MerchantID,
		Endpoint:       "/payment/submit-trx",
		HTTPMethod:     "POST",
		RequestBody:    string(jsonData),
		RequestMac:     signature,
		ResponseBody:   string(bodyBytes),
		ResponseCode:   fmt.Sprintf("%v", result["response_code"]),
		ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		IsSuccess:      result["response_code"] == "PL000",
	}
	config.DB.Create(&logEntry)

	return result, nil
}

// GetPrismalinkVA initiates a VA transaction
func GetPrismalinkVA(order models.Order, invoice models.Invoice, user models.User, clientIP string) (map[string]interface{}, error) {
	configData := GetPrismalinkConfig()
	now := time.Now()
	timestampStr := now.Format("2006-01-02 15:04:05.000 -0700")

	// Product Details
	type pdItem struct {
		ItemCode  string `json:"item_code"`
		ItemTitle string `json:"item_title"`
		Quantity  int    `json:"quantity"`
		Total     string `json:"total"`
		Currency  string `json:"currency"`
	}
	var items []pdItem
	for _, it := range order.Items {
		items = append(items, pdItem{
			ItemCode:  fmt.Sprintf("%d", it.ProductID),
			ItemTitle: it.Product.Name,
			Quantity:  it.Quantity,
			Total:     fmt.Sprintf("%.0f", it.Total),
			Currency:  "IDR",
		})
	}
	// Fallback if no items (e.g. topup)
	if len(items) == 0 {
		items = append(items, pdItem{
			ItemCode:  "TOPUP",
			ItemTitle: "Wallet Topup",
			Quantity:  1,
			Total:     fmt.Sprintf("%.0f", invoice.Amount),
			Currency:  "IDR",
		})
	}

	cleanRef := strings.ReplaceAll(invoice.InvoiceNumber, "-", "")
	if len(cleanRef) > 24 {
		cleanRef = cleanRef[:24]
	}

	// Format phone number to international format
	formattedPhone := user.Phone
	if strings.HasPrefix(user.Phone, "+") {
		formattedPhone = user.Phone
	} else if strings.HasPrefix(user.Phone, "08") {
		formattedPhone = "+62" + user.Phone[1:]
	} else if strings.HasPrefix(user.Phone, "8") && len(user.Phone) >= 9 {
		formattedPhone = "+62" + user.Phone
	} else if user.Phone != "" {
		if strings.HasPrefix(user.Phone, "62") {
			formattedPhone = "+" + user.Phone
		} else {
			formattedPhone = "+" + user.Phone
		}
	}

	req := SubmitTRXRequest{
		TransmissionDateTime: timestampStr,
		TransactionCurrency:  "IDR",
		MerchantKeyID:        configData.KeyID,
		MerchantID:           configData.MerchantID,
		MerchantRefNo:        cleanRef,
		BackendCallbackURL:   configData.CallbackURL,
		FrontendCallbackURL:  configData.ReturnURL,
		UserID:               fmt.Sprintf("%d", user.ID),
		UserEmail:            user.Email,
		UserPhone:            formattedPhone, // NOW WITH +62 FORMAT!
		UserName:             user.FullName,
		UserDeviceID:         "WEB",
		UserIPAddress:        clientIP,
		ProductDetails:       items, // Sending slice directly as JSON array
		InvoiceNumber:        invoice.InvoiceNumber,
		TransactionAmount:    invoice.Amount,
		TransactionDateTime:  timestampStr,
		PaymentMethod:        "VA",
		IntegrationType:      "03", // Payment Page
	}

	// Create transaction record
	pdRaw, _ := json.Marshal(items)
	txRecord := models.PrismalinkTransaction{
		MerchantRefNo:       req.MerchantRefNo,
		MerchantID:          req.MerchantID,
		UserID:              req.UserID,
		UserEmail:           user.Email,
		UserPhone:           user.Phone,
		UserName:            user.FullName,
		TransactionAmount:   req.TransactionAmount,
		TransactionCurrency: req.TransactionCurrency,
		PaymentMethod:       req.PaymentMethod,
		IntegrationType:     req.IntegrationType,
		InvoiceNumber:       req.InvoiceNumber,
		ProductDetails:      pdRaw,
		TransactionDateTime: now,
		TransactionStatus:   "PENDG",
	}
	config.DB.Create(&txRecord)

	return SubmitPrismalinkTRX(req)
}
