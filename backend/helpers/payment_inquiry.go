package helpers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// CheckPrismalinkStatus inquires the status of a transaction
func CheckPrismalinkStatus(merchantRefNo string, plinkRefNo string, amount float64, paymentMethod string) (map[string]interface{}, error) {
	configData := GetPrismalinkConfig()
	targetPath := "/payment/integration/transaction/api/inquiry-transaction"
	url := configData.BaseURL + targetPath

	now := time.Now()
	timestamp := now.Format("2006-01-02 15:04:05.000 -0700")

	// Same timestamp for both
	requestBodyMap := map[string]interface{}{
		"merchant_key_id":        configData.KeyID,
		"merchant_id":            configData.MerchantID,
		"merchant_ref_no":        merchantRefNo,
		"plink_ref_no":           plinkRefNo, // Usually needed in V2
		"transmission_date_time": timestamp,
		"transaction_date_time":  timestamp, // REQUIRED by Prismalink
		"transaction_amount":     amount,
		"payment_method":         paymentMethod,
	}

	jsonData, err := json.Marshal(requestBodyMap)
	if err != nil {
		return nil, fmt.Errorf("marshal error: %v", err)
	}

	log.Printf("🔍 INQUIRY REQUEST: %s", string(jsonData))

	// Sign
	mac := hmac.New(sha256.New, []byte(configData.SecretKey))
	mac.Write(jsonData)
	signature := hex.EncodeToString(mac.Sum(nil))

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("mac", signature)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("📥 INQUIRY RAW RESPONSE: %s", string(bodyBytes))

	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, fmt.Errorf("parse error: %s", string(bodyBytes))
	}

	// Return full result so controller can check response_code
	return result, nil

}

// SubmitPrismalinkDirect submits a transaction to Prismalink Direct API
func SubmitPrismalinkDirect(requestBody map[string]interface{}) (map[string]interface{}, error) {
	configData := GetPrismalinkConfig()
	url := configData.BaseURL + "/payment/integration/transaction/api/submit-trx"

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	mac := hmac.New(sha256.New, []byte(configData.SecretKey))
	mac.Write(jsonData)
	signature := hex.EncodeToString(mac.Sum(nil))

	log.Printf("🚀 PRISMALINK DIRECT SUBMIT:")
	log.Printf("URL: %s", url)
	log.Printf("MAC: %s", signature)
	log.Printf("Body: %s", string(jsonData))

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("mac", signature)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("❌ PRISMALINK HTTP ERROR: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("📥 PRISMALINK RAW RESPONSE: %s", string(bodyBytes))

	var result map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// FormatPrismalinkPhone ensures phone number is in +62 format (Mandatory for PL)
func FormatPrismalinkPhone(phone string) string {
	if phone == "" {
		return "+628123456789" // Fallback
	}

	if strings.HasPrefix(phone, "08") {
		return "+62" + phone[1:]
	} else if strings.HasPrefix(phone, "8") {
		return "+62" + phone
	} else if !strings.HasPrefix(phone, "+") {
		return "+62" + phone
	}
	return phone
}
