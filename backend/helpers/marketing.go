package helpers

import (
	"encoding/json"
	"fmt"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"
)

// ProcessRestockAlerts checks for wishlist subscribers and sends alerts
func ProcessRestockAlerts(productID uint, productName string) {
	// Run in background (goroutine) usually, but inline for now
	go func() {
		var wishlists []models.Wishlist
		if err := config.DB.Preload("User").Where("product_id = ?", productID).Find(&wishlists).Error; err != nil {
			fmt.Println("Error fetching wishlist:", err)
			return
		}

		for _, w := range wishlists {
			// Anti-spam check: Did we send this alert in the last 24 hours?
			var count int64
			meta := fmt.Sprintf(`{"product_id": %d`, productID) // Partial match to avoid complex json parsing in SQL
			config.DB.Model(&models.NotificationLog{}).
				Where("user_id = ? AND type = ? AND created_at > ? AND metadata LIKE ?",
					w.User.ID, "RESTOCK_ALERT", time.Now().Add(-24*time.Hour), "%"+meta+"%").
				Count(&count)

			if count > 0 {
				fmt.Printf("[SKIP EMAIL] Already sent restock alert to %s for %s\n", w.User.Email, productName)
				continue
			}

			// Send Real Email
			subject := "[WARUNG FORZA] 🔥 RESTOCK ALERT: " + productName + " is Back!"
			frontendDetailsLink := fmt.Sprintf("%s/products/%d", GetAppURL(), productID)

			body := fmt.Sprintf(`
			<!DOCTYPE html>
			<html>
			<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
				<div style="max-width: 600px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #1a1a1a; overflow: hidden;">
					
					<!-- Header Image / Logo Area -->
					<div style="background: linear-gradient(180deg, #111 0%%, #0a0a0a 100%%); padding: 40px 0; text-align: center; border-bottom: 1px solid #1a1a1a;">
						<span style="color: #fff; font-size: 24px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; font-style: italic;">
							WARUNG <span style="color: #ec4899;">FORZA</span>
						</span>
					</div>

					<!-- Content -->
					<div style="padding: 40px 30px; text-align: center;">
						
						<!-- Badge -->
						<div style="display: inline-block; padding: 6px 12px; border: 1px solid #10b981; border-radius: 4px; color: #10b981; font-size: 10px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 30px;">
							STOCK AVAILABLE
						</div>

						<h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 15px 0; letter-spacing: -0.5px; text-transform: uppercase; font-style: italic;">
							GOOD NEWS!
						</h1>

						<p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
							The item you've been waiting for is back in our inventory.
							<br/>Secure your order before it sells out again.
						</p>

						<!-- Product Highlight -->
						<div style="background-color: #111; border: 1px solid #222; border-radius: 12px; padding: 25px; margin-bottom: 35px;">
							<h2 style="color: #fff; font-size: 18px; margin: 0 0 5px 0; font-weight: 700;">%s</h2>
							<div style="color: #52525b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Ready for immediate dispatch</div>
						</div>

						<!-- CTA Button -->
						<a href="%s" style="display: inline-block; background-color: #ec4899; color: #ffffff; padding: 16px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; transition: all 0.2s;">
							VIEW PRODUCT &rarr;
						</a>

					</div>

					<!-- Footer -->
					<div style="background-color: #050505; border-top: 1px solid #1a1a1a; padding: 30px; text-align: center;">
						<p style="color: #52525b; font-size: 10px; margin: 0; line-height: 1.5;">
							You received this email because you subscribed to restock notifications.<br/>
							&copy; 2026 Warung Forza Shop. All rights reserved.
						</p>
					</div>

				</div>
			</body>
			</html>
			`, productName, frontendDetailsLink)

			SendEmail(w.User.Email, subject, body)

			// Construct Metadata safely
			metaMap := map[string]interface{}{
				"product_id":   productID,
				"product_name": productName,
			}
			metaJSON, _ := json.Marshal(metaMap)

			// On-Site Notification
			NotifyUser(w.User.ID, "RESTOCK_ALERT", "Item Back in Stock: "+productName, metaMap)

			// Log Notification (Redundant if NotifyUser logs it, but let's keep for explicit email log if needed,
			// OR actually NotifyUser creates a log with channel 'system'. We might want to log channel 'email' specifically.
			log := models.NotificationLog{
				UserID:   w.User.ID,
				Type:     "RESTOCK_ALERT",
				Channel:  "email",
				Subject:  "Item Back in Stock: " + productName,
				Status:   "sent",
				Metadata: string(metaJSON),
			}
			config.DB.Create(&log)

			// Optional: Delete from wishlist? usually yes, or keep until user removes.
			// config.DB.Delete(&w)
		}
	}()
}
