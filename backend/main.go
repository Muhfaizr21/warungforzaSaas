package main

import (
	"log"
	"os"

	"forzashop/backend/config"
	"forzashop/backend/controllers"
	"forzashop/backend/cron"
	"forzashop/backend/models"
	"forzashop/backend/routes"
	"forzashop/backend/seed"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// ✅ SECURITY VALIDATION: Refuse to start with an empty JWT_SECRET
	if os.Getenv("JWT_SECRET") == "" {
		log.Fatal("🔴 FATAL: JWT_SECRET environment variable is not set! Set a strong random secret before starting the server.")
	}

	// 0. Check CLI Arguments for Seeding
	args := os.Args[1:]
	isSeed := false
	isPresentation := false
	for _, arg := range args {
		if arg == "--seed" {
			isSeed = true
		}
		if arg == "--presentation" {
			isPresentation = true
		}
	}

	// 1. Connect to Database
	config.ConnectDB()

	// 2. Auto Migrate Models
	log.Println("🔄 MIGRATING DATABASE...")
	err := config.DB.AutoMigrate(
		// Core
		&models.Role{},
		&models.Permission{},
		&models.User{},

		// Products & Taxonomy
		&models.Category{},
		&models.Brand{},
		&models.Product{},
		&models.CustomFieldTemplate{},

		// Advanced Taxonomy (Warung Forza Inspired)
		&models.Series{},
		&models.Character{},
		&models.Genre{},
		&models.Scale{},
		&models.Material{},
		&models.EditionType{},

		// Orders
		&models.Order{},
		&models.OrderItem{},
		&models.OrderLog{},
		&models.Invoice{},

		// Finance
		&models.AuditLog{},
		&models.COA{},
		&models.JournalEntry{},
		&models.JournalItem{},
		&models.Expense{},

		// Marketing
		&models.Wishlist{},
		&models.NotificationLog{},
		&models.Announcement{},
		&models.AnnouncementBroadcast{},
		&models.NewsletterSubscriber{},
		&models.NewsletterCampaign{},
		&models.NewsletterLog{},

		// Payments
		&models.PaymentTransaction{},

		// Suppliers
		&models.Supplier{},
		&models.ProductSupplier{},

		// Restock
		&models.RestockEvent{},
		&models.RestockNotification{},
		&models.StockMovement{},

		// Customer
		&models.CustomerProfile{},

		// Settings
		&models.Setting{},
		&models.ShippingRate{},
		&models.CarrierTemplate{},
		&models.CarrierService{},
		&models.ShippingZone{},
		&models.ShippingMethod{},

		// Stock Reservation (Anti-Overselling)
		&models.StockReservation{},
		&models.PasswordReset{},
		&models.VerificationCode{},
		&models.WalletTransaction{},

		// Procurement
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},

		// Multi-Currency
		&models.Currency{},

		// Marketing - Cart
		&models.AbandonedCart{},

		// Contact
		&models.ContactMessage{},

		// Blog
		&models.BlogPost{},

		// Prismalink Integration
		&models.PrismalinkMerchant{},
		&models.PrismalinkTransaction{},
		&models.PrismalinkNotification{},
		&models.PrismalinkCard{},
		&models.PrismalinkSession{},
		&models.PrismalinkAPILog{},
		&models.PrismalinkBank{},
		&models.PrismalinkErrorCode{},

		// Vouchers
		&models.Voucher{},
		&models.VoucherUsage{},
		&models.VoucherProduct{},
		&models.VoucherCategory{},

		// Upsell / Cross-sell
		&models.ProductUpsell{},
	)
	if err != nil {
		log.Fatal("❌ MIGRATION FAILED: ", err)
	}
	log.Println("✅ MIGRATION SUCCESSFUL")

	// 3. Handle Seeding Logic
	if isPresentation {
		log.Println("🎭 STARTING PRESENTATION MODE SEED...")
		seed.SeedPresentation()
		log.Println("✅ PRESENTATION SEED COMPLETE. EXITING.")
		return
	}

	if isSeed {
		log.Println("🌱 SEEDING DATA...")
		seed.SeedDatabase()
		log.Println("✅ SEED COMPLETE. EXITING.")
		return
	}

	// Normal Startup: Update permissions automatically to ensure sync
	seed.SeedPermissions()
	// seed.SeedDatabase() // Disable auto-seed on start to prevent overwrites, use CLI args instead

	// 4. Setup Router
	gin.SetMode(gin.ReleaseMode)
	if os.Getenv("GIN_MODE") == "debug" {
		gin.SetMode(gin.DebugMode)
	}

	r := routes.SetupRouter()

	// 5. Start Background Workers
	log.Println("💱 Syncing Currency Rates...")
	go controllers.SyncCurrenciesWithExternalAPI() // Async Sync

	log.Println("🔄 Starting Stock Reservation Cleanup Worker...")
	controllers.StartReservationCleanupWorker()
	log.Println("🔄 Starting Payment Reminder Worker...")
	controllers.StartPaymentReminderWorker()

	log.Println("🕰️  Initializing System Cron Scheduler...")
	cron.InitCron()
	defer cron.StopCron()

	// 6. Run Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("🚀 FORZA SHOP ENGINE (MODULAR) LISTENING ON PORT %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Unable to start server: ", err)
	}
}
