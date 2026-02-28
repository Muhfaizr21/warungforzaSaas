package helpers

import (
	"crypto/rand"
	"fmt"
	"log"
	"os"
	"strconv"

	"gopkg.in/gomail.v2"
)

// SendEmail sends an email using SMTP
func SendEmail(to string, subject string, body string) error {
	host := GetSetting("smtp_host", os.Getenv("SMTP_HOST"))
	port := GetSetting("smtp_port", os.Getenv("SMTP_PORT"))
	user := GetSetting("smtp_username", os.Getenv("SMTP_USER"))
	pass := GetSetting("smtp_password", os.Getenv("SMTP_PASS"))
	from := GetSetting("smtp_from", os.Getenv("SMTP_FROM"))

	if host == "" || user == "" {
		log.Println("⚠️  SMTP Config missing. Skipping email send.")
		log.Printf("📧 To: %s\nSubject: %s\nBody: %s\n", to, subject, body)
		return nil
	}

	portInt, _ := strconv.Atoi(port)
	m := gomail.NewMessage()
	m.SetHeader("From", from)
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	d := gomail.NewDialer(host, portInt, user, pass)

	if err := d.DialAndSend(m); err != nil {
		log.Println("Details:", err)
		return err
	}
	return nil
}

// GenerateOTP generates a n-digit numeric OTP
func GenerateOTP(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	otp := ""
	for _, v := range b {
		otp += strconv.Itoa(int(v % 10))
	}
	return otp
}

// GenerateRandomString generates a secure random string
func GenerateRandomString(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

// getShopMeta returns shop name and accent color from settings
func getShopMeta() (shopName, accentColor string) {
	shopName = GetSetting("shop_name", "Warung Forza")
	accentColor = GetSetting("theme_accent_color", "#e11d48")
	return
}

// ─── PAYMENT SUCCESS ─────────────────────────────────────────────────────────

// SendPaymentSuccessEmail sends notification for successful payment with context-aware message
func SendPaymentSuccessEmail(to string, name string, invoiceNumber string, amount float64, paymentType string) {
	shopName, accentColor := getShopMeta()

	subject := fmt.Sprintf("✅ Payment Confirmed - %s", invoiceNumber)
	message := "Your payment has been received."
	nextStep := "Your order is being processed."

	switch paymentType {
	case "deposit":
		subject = fmt.Sprintf("🔒 Deposit Confirmed - %s", invoiceNumber)
		message = GetEmailTemplate("email_tpl_deposit_message", "Thank you! Your Pre-Order Deposit (DP) has been confirmed.")
		nextStep = GetEmailTemplate("email_tpl_deposit_nextstep", "Your Pre-Order slot is secured. We will notify you when the item arrives for balance payment.")
	case "balance":
		subject = fmt.Sprintf("🚀 Balance Payment Confirmed - %s", invoiceNumber)
		message = GetEmailTemplate("email_tpl_balance_message", "Thank you! Your balance payment has been confirmed.")
		nextStep = GetEmailTemplate("email_tpl_balance_nextstep", "Your item is ready for shipment. We will process the delivery to your address shortly.")
	case "topup":
		subject = fmt.Sprintf("💰 Top Up Successful - %s", invoiceNumber)
		message = GetEmailTemplate("email_tpl_topup_message", "Your Wallet has been successfully topped up.")
		nextStep = GetEmailTemplate("email_tpl_topup_nextstep", "Your balance can now be used to shop at Warung Forza.")
	case "full":
		subject = fmt.Sprintf("✅ Order Paid In Full - %s", invoiceNumber)
		message = GetEmailTemplate("email_tpl_full_message", "Thank you! Full payment for your order has been received.")
		nextStep = GetEmailTemplate("email_tpl_full_nextstep", "Your order is being prepared and will be shipped soon.")
	}

	// Fetch editable subject override
	if paymentType == "deposit" {
		s := GetEmailTemplate("email_tpl_deposit_subject", "")
		if s != "" {
			subject = fmt.Sprintf(s, invoiceNumber)
		}
	}

	vars := map[string]string{
		"customer_name":  name,
		"invoice_number": invoiceNumber,
		"amount":         fmt.Sprintf("Rp %.0f", amount),
		"message":        message,
		"next_step":      nextStep,
		"accent_color":   accentColor,
		"shop_name":      shopName,
	}

	tplBody := GetEmailTemplate("email_tpl_payment_success", DefaultTPL_PaymentSuccess)
	bodyContent := ApplyEmailVars(tplBody, vars)
	finalBody := DefaultEmailLayout(subject, shopName, accentColor, bodyContent)

	go SendEmail(to, subject, finalBody)
}

// ─── PO ARRIVAL (Needs Payment) ──────────────────────────────────────────────

// SendPOArrivalEmail sends notification for PO Arrival
func SendPOArrivalEmail(to string, name string, productName string, balance float64, dueDate string) error {
	shopName, accentColor := getShopMeta()
	subject := GetEmailTemplate("email_tpl_po_arrival_subject", "📦 Your Pre-Order Has Arrived - Please Complete Payment")

	vars := map[string]string{
		"customer_name": name,
		"product_name":  productName,
		"balance":       fmt.Sprintf("Rp %.0f", balance),
		"due_date":      dueDate,
		"shop_name":     shopName,
		"accent_color":  accentColor,
	}

	tplBody := GetEmailTemplate("email_tpl_po_arrival", DefaultTPL_POArrival)
	bodyContent := ApplyEmailVars(tplBody, vars)
	finalBody := DefaultEmailLayout(subject, shopName, accentColor, bodyContent)

	return SendEmail(to, subject, finalBody)
}

// ─── PO ARRIVAL (Fully Paid) ─────────────────────────────────────────────────

// SendPOArrivalInFullEmail sends notification for fully paid PO arrival
func SendPOArrivalInFullEmail(to string, productName string) {
	shopName, accentColor := getShopMeta()
	subject := GetEmailTemplate("email_tpl_po_full_subject", "📦 Great News! Your Pre-Order Has Arrived")

	vars := map[string]string{
		"customer_name": "Customer",
		"product_name":  productName,
		"shop_name":     shopName,
		"accent_color":  accentColor,
	}

	tplBody := GetEmailTemplate("email_tpl_po_arrival_full", DefaultTPL_POArrivalFull)
	bodyContent := ApplyEmailVars(tplBody, vars)
	finalBody := DefaultEmailLayout(subject, shopName, accentColor, bodyContent)

	go SendEmail(to, subject, finalBody)
}

// ─── REFUND ──────────────────────────────────────────────────────────────────

// SendRefundEmail sends notification for processed refund
func SendRefundEmail(to string, orderNumber string, amount float64, refundType string, reason string) {
	shopName, accentColor := getShopMeta()
	subject := GetEmailTemplate("email_tpl_refund_subject", "💸 Refund Processed")

	vars := map[string]string{
		"customer_name": "Customer",
		"order_number":  orderNumber,
		"amount":        fmt.Sprintf("Rp %.0f", amount),
		"refund_type":   refundType,
		"reason":        reason,
		"shop_name":     shopName,
		"accent_color":  accentColor,
	}

	tplBody := GetEmailTemplate("email_tpl_refund", DefaultTPL_Refund)
	bodyContent := ApplyEmailVars(tplBody, vars)
	finalBody := DefaultEmailLayout(subject, shopName, accentColor, bodyContent)

	go SendEmail(to, subject, finalBody)
}
