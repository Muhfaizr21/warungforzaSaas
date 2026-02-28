package models

import (
	"time"

	"gorm.io/datatypes"
)

// PrismalinkMerchant - Merchant credentials and config
type PrismalinkMerchant struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	MerchantID          string    `gorm:"size:40;unique;not null" json:"merchant_id"`
	MerchantKeyID       string    `gorm:"size:40;not null" json:"merchant_key_id"`
	MerchantSecretKey   string    `gorm:"size:255;not null" json:"merchant_secret_key"`
	Environment         string    `gorm:"size:20;default:'sandbox'" json:"environment"` // sandbox, production
	BackendCallbackURL  string    `gorm:"size:200" json:"backend_callback_url"`
	FrontendCallbackURL string    `gorm:"size:200" json:"frontend_callback_url"`
	IsActive            bool      `gorm:"default:true" json:"is_active"`
	CreatedAt           time.Time `json:"created_at"`
}

// PrismalinkTransaction - Detailed transaction record
type PrismalinkTransaction struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	MerchantRefNo        string         `gorm:"size:24;unique;not null" json:"merchant_ref_no"`
	PlinkRefNo           string         `gorm:"size:20" json:"plink_ref_no"`
	MerchantID           string         `gorm:"size:40;not null" json:"merchant_id"`
	UserID               string         `gorm:"size:40;not null" json:"user_id"`
	UserEmail            string         `gorm:"size:40" json:"user_email"`
	UserPhone            string         `gorm:"size:13" json:"user_phone"`
	UserName             string         `gorm:"size:40" json:"user_name"`
	TransactionAmount    float64        `gorm:"type:decimal(18,2);not null" json:"transaction_amount"`
	TransactionCurrency  string         `gorm:"size:3;default:'IDR'" json:"transaction_currency"`
	PaymentMethod        string         `gorm:"size:10;not null" json:"payment_method"`  // VA, DD, CC, QR
	IntegrationType      string         `gorm:"size:2;not null" json:"integration_type"` // 02=Full API, 03=Payment Page
	ReservedVaID         int            `json:"reserved_va_id"`
	VaNumberList         string         `gorm:"type:text" json:"va_number_list"`
	VaName               string         `gorm:"size:255" json:"va_name"`
	ActionID             string         `gorm:"size:2" json:"action_id"`
	BankID               string         `gorm:"size:10" json:"bank_id"`
	CardToken            string         `gorm:"size:255" json:"card_token"`
	CardDigit            string         `gorm:"size:4" json:"card_digit"`
	CustomerLimit        float64        `gorm:"type:decimal(18,2)" json:"customer_limit"`
	QrisData             string         `gorm:"type:text" json:"qris_data"`
	PaymentPageURL       string         `gorm:"type:text" json:"payment_page_url"`
	CreditcardFormURL    string         `gorm:"type:text" json:"creditcard_form_url"`
	DebitinFormURL       string         `gorm:"type:text" json:"debitin_form_url"`
	PaylaterPageURL      string         `gorm:"type:text" json:"paylater_page_url"`
	TransactionStatus    string         `gorm:"size:10;default:'PENDG'" json:"transaction_status"` // SETLD, PENDG, REJEC
	ResponseCode         string         `gorm:"size:6" json:"response_code"`
	ResponseMessage      string         `gorm:"size:255" json:"response_message"`
	InvoiceNumber        string         `gorm:"size:50;not null" json:"invoice_number"`
	Remarks              string         `gorm:"size:100" json:"remarks"`
	ProductDetails       datatypes.JSON `json:"product_details"`
	OtherBills           datatypes.JSON `json:"other_bills"`
	ShippingDetails      datatypes.JSON `json:"shipping_details"`
	TransmissionDateTime time.Time      `json:"transmission_date_time"`
	TransactionDateTime  time.Time      `json:"transaction_date_time"`
	PaymentDate          *time.Time     `json:"payment_date"`
	Validity             *time.Time     `json:"validity"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

// PrismalinkNotification - Log of callbacks from Prismalink
type PrismalinkNotification struct {
	ID                      uint           `gorm:"primaryKey" json:"id"`
	PrismalinkTransactionID uint           `json:"prismalink_transaction_id"`
	MerchantRefNo           string         `gorm:"size:24;not null" json:"merchant_ref_no"`
	PlinkRefNo              string         `gorm:"size:20;not null" json:"plink_ref_no"`
	BankRefNo               string         `gorm:"size:255" json:"bank_ref_no"`
	BankID                  string         `gorm:"size:10" json:"bank_id"`
	BankResponseCode        string         `gorm:"size:255" json:"bank_response_code"`
	PaymentStatus           string         `gorm:"size:10;not null" json:"payment_status"` // SETLD, PENDG, REJEC
	CardToken               string         `gorm:"size:255" json:"card_token"`
	CardDigit               string         `gorm:"size:4" json:"card_digit"`
	BindingCardStatus       string         `gorm:"size:1" json:"binding_card_status"` // Y, N
	EventCode               string         `gorm:"size:50" json:"event_code"`
	ActionID                string         `gorm:"size:2" json:"action_id"`
	UserEmail               string         `gorm:"size:40" json:"user_email"`
	TransactionAmount       float64        `gorm:"type:decimal(18,2)" json:"transaction_amount"`
	PaymentDate             *time.Time     `json:"payment_date"`
	Validity                *time.Time     `json:"validity"`
	RawNotification         datatypes.JSON `json:"raw_notification"`
	MacHeader               string         `gorm:"size:200" json:"mac_header"`
	IsVerified              bool           `gorm:"default:false" json:"is_verified"`
	IsProcessed             bool           `gorm:"default:false" json:"is_processed"`
	ProcessingNotes         string         `gorm:"type:text" json:"processing_notes"`
	TransmissionDateTime    time.Time      `json:"transmission_date_time"`
	ReceivedAt              time.Time      `json:"received_at"`
}

// PrismalinkCard - Stored tokens
type PrismalinkCard struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	UserID        string     `gorm:"size:40;not null" json:"user_id"`
	MerchantID    string     `gorm:"size:40;not null" json:"merchant_id"`
	CardToken     string     `gorm:"size:255;unique;not null" json:"card_token"`
	CardDigit     string     `gorm:"size:4;not null" json:"card_digit"`
	PaymentMethod string     `gorm:"size:2;not null" json:"payment_method"` // CC, DD
	BankID        string     `gorm:"size:10" json:"bank_id"`
	BankAccountNo string     `gorm:"size:50" json:"bank_account_no"`
	IdCardNo      string     `gorm:"size:16" json:"id_card_no"`
	CustomerLimit float64    `gorm:"type:decimal(18,2)" json:"customer_limit"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	BindStatus    string     `gorm:"size:20;default:'PENDING'" json:"bind_status"` // PENDING, ACTIVE, UNBOUND
	LastUsed      *time.Time `json:"last_used"`
	UsageCount    int        `gorm:"default:0" json:"usage_count"`
	ExpiresAt     *time.Time `json:"expires_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// PrismalinkSession - Session management for DD/CC
type PrismalinkSession struct {
	ID                      uint      `gorm:"primaryKey" json:"id"`
	PrismalinkTransactionID uint      `json:"prismalink_transaction_id"`
	SessionToken            string    `gorm:"size:255;unique;not null" json:"session_token"`
	SessionType             string    `gorm:"size:2;not null" json:"session_type"` // CC, DD
	IsUsed                  bool      `gorm:"default:false" json:"is_used"`
	ExpiresAt               time.Time `json:"expires_at"`
	IPAddress               string    `gorm:"size:45" json:"ip_address"`
	UserAgent               string    `gorm:"type:text" json:"user_agent"`
	CreatedAt               time.Time `json:"created_at"`
}

// PrismalinkAPILog - Technical logs
type PrismalinkAPILog struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	MerchantID     string         `gorm:"size:40" json:"merchant_id"`
	Endpoint       string         `gorm:"size:255;not null" json:"endpoint"`
	HTTPMethod     string         `gorm:"size:10;not null" json:"http_method"`
	RequestHeaders datatypes.JSON `json:"request_headers"`
	RequestBody    string         `gorm:"type:text" json:"request_body"`
	RequestMac     string         `gorm:"size:255" json:"request_mac"`
	ResponseCode   string         `gorm:"size:10" json:"response_code"`
	ResponseBody   string         `gorm:"type:text" json:"response_body"`
	ResponseTimeMs int            `json:"response_time_ms"`
	IsSuccess      bool           `gorm:"default:false" json:"is_success"`
	ErrorMessage   string         `gorm:"type:text" json:"error_message"`
	IPAddress      string         `gorm:"size:45" json:"ip_address"`
	UserAgent      string         `gorm:"type:text" json:"user_agent"`
	CreatedAt      time.Time      `json:"created_at"`
}

// PrismalinkBank - Bank reference
type PrismalinkBank struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	BankID         string  `gorm:"size:10;unique;not null" json:"bank_id"`
	BankName       string  `gorm:"size:100;not null" json:"bank_name"`
	BankCode       string  `gorm:"size:10" json:"bank_code"`
	SupportsVA     bool    `gorm:"default:false" json:"supports_va"`
	SupportsDD     bool    `gorm:"default:false" json:"supports_dd"`
	SupportsCC     bool    `gorm:"default:false" json:"supports_cc"`
	SupportsQR     bool    `gorm:"default:false" json:"supports_qr"`
	VaDigitLength  int     `gorm:"default:16" json:"va_digit_length"`
	DdDailyLimit   float64 `gorm:"type:decimal(18,2)" json:"dd_daily_limit"`
	DdMonthlyLimit float64 `gorm:"type:decimal(18,2)" json:"dd_monthly_limit"`
	IsActive       bool    `gorm:"default:true" json:"is_active"`
}

// PrismalinkErrorCode - Response code referrence
type PrismalinkErrorCode struct {
	ResponseCode    string `gorm:"size:6;primaryKey" json:"response_code"`
	ResponseMessage string `gorm:"size:100;not null" json:"response_message"`
	DescriptionID   string `gorm:"type:text" json:"description_id"`
	DescriptionEN   string `gorm:"type:text" json:"description_en"`
	Category        string `gorm:"size:20;not null" json:"category"` // SUCCESS, VALIDATION, AUTH, PAYMENT, SYSTEM
	IsRetryable     bool   `gorm:"default:false" json:"is_retryable"`
}
