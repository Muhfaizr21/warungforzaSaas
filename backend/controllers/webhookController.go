package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
)

// BiteshipWebhook - Menangani update status dari Biteship secara otomatis
// Mendukung event: order.status, order.waybill_id, order.price
func BiteshipWebhook(c *gin.Context) {
	// 1. Baca isi kiriman dari Biteship
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}

	// Biteship melakukan tes koneksi dengan body kosong
	if len(body) == 0 {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Warung Forza is ready!"})
		return
	}

	// 2. Parse data JSON secara fleksibel
	var payload struct {
		Event     string  `json:"event"`
		Status    string  `json:"status"`
		WaybillID string  `json:"waybill_id"`
		OrderID   string  `json:"order_id"`
		Price     float64 `json:"price"`
		Courier   struct {
			WaybillID string `json:"waybill_id"`
			Company   string `json:"company"`
		} `json:"courier"`
	}

	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("webhook parse error: %v", err)
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
		return
	}

	// Ambil waybill dari root atau dari nested courier
	finalWaybill := payload.WaybillID
	if finalWaybill == "" {
		finalWaybill = payload.Courier.WaybillID
	}

	log.Printf("webhook received: event=%s waybill=%s status=%s orderID=%s", payload.Event, finalWaybill, payload.Status, payload.OrderID)

	// 3. Cari order berdasarkan waybill ATAU biteship_order_id
	var order models.Order
	found := false

	if finalWaybill != "" {
		if err := config.DB.Where("tracking_number = ?", finalWaybill).First(&order).Error; err == nil {
			found = true
		}
	}
	if !found && payload.OrderID != "" {
		if err := config.DB.Where("biteship_order_id = ?", payload.OrderID).First(&order).Error; err == nil {
			found = true
		}
	}

	if !found {
		log.Printf("webhook: no matching order waybill=%s biteship_id=%s", finalWaybill, payload.OrderID)
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "No matching order"})
		return
	}

	// 4. Handle by Event Type
	switch payload.Event {
	case "order.status":
		handleStatusUpdate(order, payload.Status)

	case "order.waybill_id":
		// Biteship memberikan nomor resi yang baru/updated
		if finalWaybill != "" && finalWaybill != order.TrackingNumber {
			log.Printf("waybill updated: %s -> %s", order.TrackingNumber, finalWaybill)
			config.DB.Model(&order).Updates(map[string]interface{}{
				"tracking_number": finalWaybill,
				"carrier":         payload.Courier.Company,
			})
			config.DB.Create(&models.OrderLog{
				OrderID:           order.ID,
				Action:            "waybill_updated",
				Note:              fmt.Sprintf("Nomor resi diperbarui: %s (%s)", finalWaybill, payload.Courier.Company),
				IsCustomerVisible: true,
			})
		}

	case "order.price":
		// Biteship memberikan update harga (berat aktual berbeda)
		if payload.Price > 0 && payload.Price != order.ShippingCost {
			log.Printf("shipping price updated: %.0f -> %.0f", order.ShippingCost, payload.Price)
			config.DB.Model(&order).Update("shipping_cost", payload.Price)
			config.DB.Create(&models.OrderLog{
				OrderID:           order.ID,
				Action:            "shipping_price_updated",
				Note:              fmt.Sprintf("Ongkir diperbarui oleh kurir: Rp %.0f (sebelumnya Rp %.0f)", payload.Price, order.ShippingCost),
				IsCustomerVisible: false,
			})
		}

	default:
		// Event tidak dikenal, tapi tetap coba update status
		if payload.Status != "" {
			handleStatusUpdate(order, payload.Status)
		}
	}

	// 5. Selalu jawab OK ke Biteship
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Update processed successfully",
	})
}

// handleStatusUpdate - Update status order berdasarkan status dari Biteship
func handleStatusUpdate(order models.Order, biteshipStatus string) {
	newStatus := order.Status

	switch biteshipStatus {
	case "delivered":
		newStatus = "completed"
	case "picked", "picking_up", "in_transit", "out_for_delivery", "allocated", "confirmed":
		newStatus = "shipped"
	case "rejected", "returned", "lost", "disposed":
		newStatus = "cancelled"
	case "courier_not_found":
		// Kurir tidak ditemukan, order kembali ke processing
		newStatus = "processing"
	}

	if newStatus != order.Status {
		log.Printf("auto-updating order #%s: %s -> %s (biteship: %s)", order.OrderNumber, order.Status, newStatus, biteshipStatus)

		config.DB.Model(&order).Update("status", newStatus)

		config.DB.Create(&models.OrderLog{
			OrderID:           order.ID,
			Action:            "webhook_status_update",
			Note:              fmt.Sprintf("Status otomatis diperbarui: %s → %s (dari kurir: %s)", order.Status, newStatus, biteshipStatus),
			IsCustomerVisible: true,
		})
	}
}
