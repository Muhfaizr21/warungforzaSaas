package helpers

import (
	"encoding/json"
	"fmt"
	"forzashop/backend/config"
	"forzashop/backend/models"
)

// NotifyUser creates a notification log for a specific user
func NotifyUser(userID uint, notifType, subject string, metadata map[string]interface{}) {
	metaJSON, _ := json.Marshal(metadata)

	notification := models.NotificationLog{
		UserID:   userID,
		Type:     notifType,
		Subject:  subject,
		Metadata: string(metaJSON),
		Status:   "sent",
		Channel:  "system",
	}

	go func() {
		config.DB.Create(&notification)
		fmt.Printf("🔔 Notification sent to User %d: %s\n", userID, subject)
	}()
}

// NotifyAdmin broadcasts a notification to all administrative users
func NotifyAdmin(notifType, subject string, metadata map[string]interface{}) {
	metaJSON, _ := json.Marshal(metadata)

	// Find all admins
	var admins []models.User
	config.DB.Where("role_id IN (SELECT id FROM roles WHERE slug IN ('super_admin', 'admin'))").Find(&admins)

	go func() {
		for _, admin := range admins {
			notification := models.NotificationLog{
				UserID:   admin.ID,
				Type:     notifType,
				Subject:  subject,
				Metadata: string(metaJSON),
				Status:   "sent",
				Channel:  "system",
			}
			config.DB.Create(&notification)
		}
		fmt.Printf("🔔 Admin Alert Broadcasted: %s to %d admins\n", subject, len(admins))
	}()
}
