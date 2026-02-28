package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"
	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// ============================================
// SHIPPING ZONES (CRUD)
// ============================================

func GetShippingZones(c *gin.Context) {
	var zones []models.ShippingZone
	if err := config.DB.Preload("Methods").Find(&zones).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipping zones"})
		return
	}
	c.JSON(http.StatusOK, zones)
}

func CreateShippingZone(c *gin.Context) {
	var zone models.ShippingZone
	if err := c.ShouldBindJSON(&zone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&zone).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipping zone"})
		return
	}
	c.JSON(http.StatusCreated, zone)
}

func UpdateShippingZone(c *gin.Context) {
	id := c.Param("id")
	var zone models.ShippingZone
	if err := config.DB.First(&zone, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipping zone not found"})
		return
	}
	if err := c.ShouldBindJSON(&zone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&zone)
	c.JSON(http.StatusOK, zone)
}

func DeleteShippingZone(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.ShippingZone{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete shipping zone"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shipping zone deleted"})
}

// ============================================
// SHIPPING METHODS (CRUD)
// ============================================

func CreateShippingMethod(c *gin.Context) {
	var method models.ShippingMethod
	if err := c.ShouldBindJSON(&method); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Create(&method).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipping method"})
		return
	}
	c.JSON(http.StatusCreated, method)
}

func UpdateShippingMethod(c *gin.Context) {
	id := c.Param("id")
	var method models.ShippingMethod
	if err := config.DB.First(&method, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipping method not found"})
		return
	}
	if err := c.ShouldBindJSON(&method); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&method)
	c.JSON(http.StatusOK, method)
}

func DeleteShippingMethod(c *gin.Context) {
	id := c.Param("id")
	if err := config.DB.Delete(&models.ShippingMethod{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete shipping method"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Shipping method deleted"})
}

// ============================================
// CALCULATION LOGIC (FRONTEND API)
// ============================================

type ShippingOptionResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Type        string  `json:"type"` // AIR / SHIP
	Eta         string  `json:"eta"`
}

func GetIntlShippingOptions(c *gin.Context) {
	country := c.Query("country") // ISO Code e.g. "MY"
	postalCode := c.Query("zip")
	weightStr := c.Query("weight") // in grams
	subtotalStr := c.Query("subtotal")

	weight, _ := strconv.ParseFloat(weightStr, 64)
	subtotal, _ := strconv.ParseFloat(subtotalStr, 64)

	if country == "" || country == "ID" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "International shipping requires a non-ID country code"})
		return
	}

	var allZones []models.ShippingZone
	config.DB.Preload("Methods", "is_active = ?", true).Where("is_active = ?", true).Find(&allZones)

	var matchedZone *models.ShippingZone

	// 1. Try to match Postal Code (Specific zip or Range)
	for i, zone := range allZones {
		if zone.PostalCodes != "" && isZipMatch(postalCode, zone.PostalCodes) {
			matchedZone = &allZones[i]
			break
		}
	}

	// 2. Try to match Country
	if matchedZone == nil {
		for i, zone := range allZones {
			if zone.Countries != "" {
				var countries []string
				json.Unmarshal([]byte(zone.Countries), &countries)
				for _, c := range countries {
					if strings.EqualFold(c, country) {
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

	// 3. Fallback to "Rest of World" or generic zone if exists
	if matchedZone == nil {
		for i, zone := range allZones {
			if zone.Countries == "" && zone.PostalCodes == "" {
				matchedZone = &allZones[i]
				break
			}
		}
	}

	if matchedZone == nil {
		c.JSON(http.StatusOK, []ShippingOptionResponse{})
		return
	}

	var options []ShippingOptionResponse
	for _, m := range matchedZone.Methods {
		price := 0.0

		switch m.CalcType {
		case "flat":
			price = m.Rate
		case "per_kg":
			weightKg := weight / 1000.0
			minWeight := m.MinWeight
			if minWeight <= 0 {
				minWeight = 1 // Fallback sanity check
			}
			if weightKg < minWeight {
				weightKg = minWeight
			}
			price = weightKg * m.Rate
		case "free_shipping":
			if subtotal >= m.MinSubtotal {
				price = 0
			} else {
				continue // Don't show if not eligible
			}
		case "api":
			// Live calculation via Biteship
			biteship := services.NewBiteshipService()
			originZip := helpers.GetSetting("store_postal_code", os.Getenv("STORE_POSTAL_CODE"))
			if originZip == "" {
				originZip = "10110" // Generic Jakarta fallback
			}

			rateReq := services.BiteshipRateRequest{
				OriginPostalCode:      originZip,
				DestinationPostalCode: postalCode,
				DestinationCountry:    country,
				Items: []services.BiteshipItem{
					{
						Name:     "Shipping Package",
						Quantity: 1,
						Weight:   int(weight),
						Value:    subtotal,
					},
				},
			}

			liveRates, err := biteship.GetRates(rateReq)
			if err == nil && liveRates.Success {
				for _, rate := range liveRates.Results {
					options = append(options, ShippingOptionResponse{
						ID:          fmt.Sprintf("api_%s_%s", rate.CourierCode, rate.ServiceCode),
						Name:        fmt.Sprintf("%s (%s)", rate.CourierName, rate.ServiceName),
						Description: matchedZone.Name,
						Price:       rate.Price,
						Type:        m.CourierType,
						Eta:         rate.Duration,
					})
				}
				continue // API adds its own options
			}
		}

		options = append(options, ShippingOptionResponse{
			ID:          strconv.Itoa(int(m.ID)),
			Name:        m.Name,
			Description: matchedZone.Name,
			Price:       price,
			Type:        m.CourierType,
			Eta:         m.EtaText,
		})
	}

	c.JSON(http.StatusOK, options)
}

func isZipMatch(userZip, zoneZips string) bool {
	// Simple Logic: check if zip code is in comma separated list or range
	parts := strings.Split(zoneZips, ",")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == userZip {
			return true
		}
		// Check Range e.g. 10001-20000
		if strings.Contains(p, "-") {
			rangeParts := strings.Split(p, "-")
			if len(rangeParts) == 2 {
				min, _ := strconv.Atoi(strings.TrimSpace(rangeParts[0]))
				max, _ := strconv.Atoi(strings.TrimSpace(rangeParts[1]))
				target, _ := strconv.Atoi(userZip)
				if target >= min && target <= max {
					return true
				}
			}
		}
	}
	return false
}
