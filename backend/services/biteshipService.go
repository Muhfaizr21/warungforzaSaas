package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"forzashop/backend/helpers"
)

// BiteshipService handles all Biteship API operations
type BiteshipService struct {
	APIKey  string
	BaseURL string
}

func NewBiteshipService() *BiteshipService {
	return &BiteshipService{
		APIKey:  helpers.GetSetting("biteship_api_key", os.Getenv("BITESHIP_API_KEY")),
		BaseURL: "https://api.biteship.com/v1",
	}
}

// BiteshipCreateRequest - Input untuk membuat order di Biteship
type BiteshipCreateRequest struct {
	// Shipper (Toko)
	ShipperName  string
	ShipperPhone string
	ShipperEmail string
	ShipperOrg   string

	// Origin (Lokasi Pickup)
	OriginName       string
	OriginPhone      string
	OriginAddress    string
	OriginPostalCode string
	OriginNote       string

	// Destination (Customer)
	DestName       string
	DestPhone      string
	DestEmail      string
	DestAddress    string
	DestPostalCode string
	DestNote       string

	// Courier
	CourierCompany string // jne, sicepat, jnt
	CourierType    string // reg, oke, yes, etc.
	Insurance      float64

	// Items
	Items []BiteshipItem

	// Meta
	OrderNote   string
	ReferenceID string // Our internal Order Number
}

type BiteshipItem struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Value       float64 `json:"value"`
	Quantity    int     `json:"quantity"`
	Weight      int     `json:"weight"` // in grams
	Height      int     `json:"height"`
	Length      int     `json:"length"`
	Width       int     `json:"width"`
}

// BiteshipCreateResponse - Response dari Biteship setelah buat order
type BiteshipCreateResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	ID      string `json:"id"` // Biteship Order ID
	Status  string `json:"status"`
	Courier struct {
		TrackingID string `json:"tracking_id"`
		WaybillID  string `json:"waybill_id"`
		Company    string `json:"company"`
		Type       string `json:"type"`
	} `json:"courier"`
	Error string `json:"error"`
}

// CreateOrder - POST /v1/orders - Buat order pengiriman di Biteship
func (s *BiteshipService) CreateOrder(req BiteshipCreateRequest) (*BiteshipCreateResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("BITESHIP_API_KEY not configured")
	}

	// Map ke format Biteship API
	payload := map[string]interface{}{
		"shipper_contact_name":  req.ShipperName,
		"shipper_contact_phone": req.ShipperPhone,
		"shipper_contact_email": req.ShipperEmail,
		"shipper_organization":  req.ShipperOrg,

		"origin_contact_name":  req.OriginName,
		"origin_contact_phone": req.OriginPhone,
		"origin_address":       req.OriginAddress,
		"origin_postal_code":   req.OriginPostalCode,
		"origin_note":          req.OriginNote,

		"destination_contact_name":  req.DestName,
		"destination_contact_phone": req.DestPhone,
		"destination_contact_email": req.DestEmail,
		"destination_address":       req.DestAddress,
		"destination_postal_code":   req.DestPostalCode,
		"destination_note":          req.DestNote,

		"courier_company":   req.CourierCompany,
		"courier_type":      req.CourierType,
		"courier_insurance": req.Insurance,
		"delivery_type":     "now",
		"order_note":        req.OrderNote,
		"reference_id":      req.ReferenceID,

		"items": req.Items,
	}

	jsonData, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", s.BaseURL+"/orders", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Authorization", s.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("biteship API error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("📦 Biteship Create Order Response [%d]: %s\n", resp.StatusCode, string(body))

	var result BiteshipCreateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	if !result.Success && result.Error != "" {
		return nil, fmt.Errorf("biteship error: %s", result.Error)
	}

	return &result, nil
}

// BiteshipCancelResponse - Response dari cancel order
type BiteshipCancelResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	ID      string `json:"id"`
	Status  string `json:"status"`
	Error   string `json:"error"`
}

// CancelOrder - POST /v1/orders/:id/cancel - Batalkan order di Biteship
func (s *BiteshipService) CancelOrder(biteshipOrderID string, reason string) (*BiteshipCancelResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("BITESHIP_API_KEY not configured")
	}

	payload := map[string]interface{}{
		"cancellation_reason": reason,
	}

	jsonData, _ := json.Marshal(payload)
	httpReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/orders/%s/cancel", s.BaseURL, biteshipOrderID), bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Authorization", s.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("biteship API error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("🚫 Biteship Cancel Response [%d]: %s\n", resp.StatusCode, string(body))

	var result BiteshipCancelResponse
	json.Unmarshal(body, &result)

	return &result, nil
}

// BiteshipRetrieveResponse - Response detail lengkap order Biteship
type BiteshipRetrieveResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	ID      string `json:"id"`
	Status  string `json:"status"`
	Courier struct {
		TrackingID        string  `json:"tracking_id"`
		WaybillID         string  `json:"waybill_id"`
		Company           string  `json:"company"`
		DriverName        string  `json:"driver_name"`
		DriverPhone       string  `json:"driver_phone"`
		DriverPhotoURL    string  `json:"driver_photo_url"`
		DriverPlateNumber string  `json:"driver_plate_number"`
		ShipmentFee       float64 `json:"shipment_fee"`
		History           []struct {
			Status      string `json:"status"`
			Note        string `json:"note"`
			UpdatedTime string `json:"updated_at"`
		} `json:"history"`
	} `json:"courier"`
	Error string `json:"error"`
}

// RetrieveOrder - GET /v1/orders/:id - Ambil detail order dari Biteship
func (s *BiteshipService) RetrieveOrder(biteshipOrderID string) (*BiteshipRetrieveResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("BITESHIP_API_KEY not configured")
	}

	httpReq, _ := http.NewRequest("GET", fmt.Sprintf("%s/orders/%s", s.BaseURL, biteshipOrderID), nil)
	httpReq.Header.Set("Authorization", s.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("biteship API error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	fmt.Printf("📋 Biteship Retrieve Response [%d]: %s\n", resp.StatusCode, string(body))

	var result BiteshipRetrieveResponse
	json.Unmarshal(body, &result)

	return &result, nil
}

// BiteshipRateRequest - Input untuk cek ongkir
type BiteshipRateRequest struct {
	OriginPostalCode      string         `json:"origin_postal_code"`
	DestinationPostalCode string         `json:"destination_postal_code"`
	DestinationCountry    string         `json:"destination_country_code"` // e.g., "MY"
	Items                 []BiteshipItem `json:"items"`
}

// BiteshipRateResponse - Response cek ongkir
type BiteshipRateResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Results []struct {
		CourierCode string  `json:"courier_code"` // jne, tlx, dhl
		CourierName string  `json:"courier_name"`
		ServiceCode string  `json:"service_code"`
		ServiceName string  `json:"service_name"`
		Type        string  `json:"type"` // instant, standard
		Duration    string  `json:"duration"`
		Price       float64 `json:"price"`
	} `json:"results"`
	Error string `json:"error"`
}

// GetRates - POST /v1/rates - Cek harga pengiriman (termasuk internasional)
func (s *BiteshipService) GetRates(req BiteshipRateRequest) (*BiteshipRateResponse, error) {
	if s.APIKey == "" {
		return nil, fmt.Errorf("BITESHIP_API_KEY not configured")
	}

	jsonData, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", s.BaseURL+"/rates", bytes.NewBuffer(jsonData))
	httpReq.Header.Set("Authorization", s.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	var result BiteshipRateResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return &result, nil
}
