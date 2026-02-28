package routes

import (
	"net/http"

	"forzashop/backend/controllers"
	"forzashop/backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// 🛡️ SECURITY HEADERS & RATE LIMIT
	r.Use(middleware.SecureHeadersMiddleware())
	r.Use(middleware.RateLimitMiddleware())

	// 🌐 STRICT CORS (Replaces basic inline CORS)
	// See middleware/securityMiddleware.go for configuration
	r.Use(middleware.CORSMiddleware())

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "WARUNG FORZA API - ADMIN BACKEND V2"})
	})

	// 🔍 SEO & SITEMAP
	r.GET("/sitemap.xml", controllers.GetSitemap)

	// Serve Static Files
	r.StaticFile("/forza.png", "./public/forza.png")
	r.StaticFile("/robots.txt", "./public/robots.txt")
	r.StaticFS("/images", http.Dir("public/images"))
	r.StaticFS("/uploads", http.Dir("public/uploads"))

	api := r.Group("/api")
	{
		// Public Routes - PROTECTED BY STRICT RATE LIMIT
		api.POST("/login", middleware.StrictRateLimitMiddleware(), controllers.Login)
		api.POST("/register", middleware.StrictRateLimitMiddleware(), controllers.Register)

		// Auth V2 - PROTECTED BY STRICT RATE LIMIT
		api.POST("/auth/google", middleware.StrictRateLimitMiddleware(), controllers.GoogleLogin)
		api.POST("/auth/forgot-password", middleware.StrictRateLimitMiddleware(), controllers.ForgotPassword)
		api.POST("/auth/reset-password", middleware.StrictRateLimitMiddleware(), controllers.ResetPassword)
		api.POST("/auth/verify-registration", middleware.StrictRateLimitMiddleware(), controllers.VerifyRegistration)
		api.POST("/auth/resend-verification", middleware.StrictRateLimitMiddleware(), controllers.ResendVerification)

		// Webhooks & Callbacks
		// Use a single standardized webhook endpoint
		api.POST("/webhooks/prismalink", controllers.HandlePrismalinkWebhook)

		// Public Products
		api.GET("/products", controllers.GetProducts)
		api.GET("/products/:id", controllers.GetProduct)
		api.GET("/currencies", controllers.GetCurrencies)
		api.GET("/products/:id/related", controllers.GetRelatedProducts)
		api.GET("/products/:id/upsells", controllers.GetUpsells) // Upsell / Cross-sell
		api.GET("/products/slug/:slug", controllers.GetProductBySlug)
		api.GET("/announcements", controllers.GetAnnouncements)
		api.GET("/settings/public", controllers.GetPublicSettings)
		api.GET("/shipping/intl-options", controllers.GetIntlShippingOptions)

		// Public Taxonomy (For Filters)
		api.GET("/categories/public", controllers.GetPublicCategories)
		api.GET("/brands/public", controllers.GetPublicBrands)
		api.GET("/series/public", controllers.GetSeries)
		api.GET("/characters/public", controllers.GetCharacters)
		api.GET("/genres/public", controllers.GetGenres)
		api.GET("/scales/public", controllers.GetPublicScales)
		api.GET("/materials/public", controllers.GetPublicMaterials)
		api.GET("/edition-types/public", controllers.GetPublicEditionTypes)

		// Public Blog
		api.GET("/blog", controllers.GetAllBlogPosts)
		api.GET("/blog/slug/:slug", controllers.GetBlogPostBySlug)
		api.GET("/blog/latest", controllers.GetLatestBlogPosts)

		// Public Contact
		api.POST("/contact", controllers.SubmitContactMessage)

		// Analytics - Cart Sync
		api.POST("/sync-cart", controllers.SyncCart)

		// ============================================
		// ADMIN PROTECTED ROUTES
		// All routes require authentication + admin role
		// ============================================
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.AdminOnly())
		{
			// Dashboard
			admin.GET("/dashboard/stats", controllers.GetDashboardStats)
			admin.GET("/dashboard/sales-trend", controllers.GetSalesTrend)
			admin.GET("/dashboard/monthly-sales", controllers.GetMonthlySalesTrend)
			admin.GET("/dashboard/top-products", controllers.GetTopProducts)
			admin.GET("/dashboard/order-distribution", controllers.GetOrderStatusDistribution)
			admin.GET("/dashboard/customer-demographics", controllers.GetCustomerDemographics)

			// Uploads
			admin.POST("/upload", controllers.UploadFile)

			// ============================================
			// ROLE MANAGEMENT (RBAC)
			// ============================================
			roles := admin.Group("/roles")
			{
				roles.GET("", middleware.CheckPermission("role.view"), controllers.GetRoles)
				roles.POST("", middleware.CheckPermission("role.manage"), controllers.CreateRole)
				roles.PUT("/:id", middleware.CheckPermission("role.manage"), controllers.UpdateRole)
				roles.DELETE("/:id", middleware.CheckPermission("role.manage"), controllers.DeleteRole)
				roles.GET("/permissions", middleware.CheckPermission("role.view"), controllers.GetPermissions)
				roles.PUT("/:id/permissions", middleware.CheckPermission("role.manage"), controllers.UpdateRolePermissions)
			}

			// ============================================
			// PRODUCTS MODULE
			// ============================================
			products := admin.Group("/products")
			{
				products.GET("/stats", middleware.CheckPermission("product.view"), controllers.GetProductStats)
				products.GET("/low-stock", middleware.CheckPermission("product.view"), controllers.GetLowStockProducts)
				products.POST("/low-stock/alert", middleware.CheckPermission("product.view"), controllers.SendLowStockAlertEmail)
				products.GET("", middleware.CheckPermission("product.view"), controllers.GetProducts)
				products.GET("/:id", middleware.CheckPermission("product.view"), controllers.GetProduct)
				products.POST("", middleware.CheckPermission("product.create"), controllers.CreateProduct)
				products.PUT("/:id", middleware.CheckPermission("product.edit"), controllers.UpdateProduct)
				products.POST("/:id/arrive", middleware.CheckPermission("product.edit"), controllers.MarkPOArrived)
				products.DELETE("/:id", middleware.CheckPermission("product.delete"), controllers.DeleteProduct)
				// Upsell Management
				products.GET("/:id/upsells", middleware.CheckPermission("product.view"), controllers.GetUpsells)
				products.PUT("/:id/upsells", middleware.CheckPermission("product.edit"), controllers.SetUpsells)
			}

			// ============================================
			// CATALOG MODULE (Categories, Brands, Custom Fields)
			// ============================================
			categories := admin.Group("/categories")
			{
				categories.GET("", middleware.CheckPermission("taxonomy.view"), controllers.GetCategories)
				categories.GET("/:id", middleware.CheckPermission("taxonomy.view"), controllers.GetCategory)
				categories.POST("", middleware.CheckPermission("taxonomy.manage"), controllers.CreateCategory)
				categories.PUT("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.UpdateCategory)
				categories.DELETE("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.DeleteCategory)
			}

			brands := admin.Group("/brands")
			{
				brands.GET("", middleware.CheckPermission("taxonomy.view"), controllers.GetBrands)
				brands.GET("/:id", middleware.CheckPermission("taxonomy.view"), controllers.GetBrand)
				brands.POST("", middleware.CheckPermission("taxonomy.manage"), controllers.CreateBrand)
				brands.PUT("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.UpdateBrand)
				brands.DELETE("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.DeleteBrand)
			}

			// ============================================
			// TAXONOMY MODULE (Series, Characters, Genres)
			// ============================================
			series := admin.Group("/series")
			{
				series.GET("", middleware.CheckPermission("taxonomy.view"), controllers.GetAdminSeries)
				series.POST("", middleware.CheckPermission("taxonomy.manage"), controllers.CreateSeries)
				series.PUT("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.UpdateSeries)
				series.DELETE("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.DeleteSeries)
			}

			characters := admin.Group("/characters")
			{
				characters.GET("", middleware.CheckPermission("taxonomy.view"), controllers.GetAdminCharacters)
				characters.POST("", middleware.CheckPermission("taxonomy.manage"), controllers.CreateCharacter)
				characters.PUT("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.UpdateCharacter)
				characters.DELETE("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.DeleteCharacter)
			}

			genres := admin.Group("/genres")
			{
				genres.GET("", middleware.CheckPermission("taxonomy.view"), controllers.GetAdminGenres)
				genres.POST("", middleware.CheckPermission("taxonomy.manage"), controllers.CreateGenre)
				genres.PUT("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.UpdateGenre)
				genres.DELETE("/:id", middleware.CheckPermission("taxonomy.manage"), controllers.DeleteGenre)
			}

			customFields := admin.Group("/custom-fields")
			{
				customFields.GET("", middleware.CheckPermission("product.view"), controllers.GetCustomFields)
				customFields.POST("", middleware.CheckPermission("product.create"), controllers.CreateCustomField)
				customFields.PUT("/:id", middleware.CheckPermission("product.edit"), controllers.UpdateCustomField)
				customFields.DELETE("/:id", middleware.CheckPermission("product.delete"), controllers.DeleteCustomField)
			}

			// NEW TAXONOMY (Scale, Material, Edition)
			scales := admin.Group("/scales")
			{
				scales.GET("", middleware.CheckPermission("product.view"), controllers.GetAdminScales)
				scales.POST("", middleware.CheckPermission("product.create"), controllers.CreateScale)
				scales.PUT("/:id", middleware.CheckPermission("product.edit"), controllers.UpdateScale)
				scales.DELETE("/:id", middleware.CheckPermission("product.delete"), controllers.DeleteScale)
			}

			materials := admin.Group("/materials")
			{
				materials.GET("", middleware.CheckPermission("product.view"), controllers.GetAdminMaterials)
				materials.POST("", middleware.CheckPermission("product.create"), controllers.CreateMaterial)
				materials.PUT("/:id", middleware.CheckPermission("product.edit"), controllers.UpdateMaterial)
				materials.DELETE("/:id", middleware.CheckPermission("product.delete"), controllers.DeleteMaterial)
			}

			editionTypes := admin.Group("/edition-types")
			{
				editionTypes.GET("", middleware.CheckPermission("product.view"), controllers.GetAdminEditionTypes)
				editionTypes.POST("", middleware.CheckPermission("product.create"), controllers.CreateEditionType)
				editionTypes.PUT("/:id", middleware.CheckPermission("product.edit"), controllers.UpdateEditionType)
				editionTypes.DELETE("/:id", middleware.CheckPermission("product.delete"), controllers.DeleteEditionType)
			}

			// ============================================
			// ORDERS MODULE
			// ============================================
			orders := admin.Group("/orders")
			{
				orders.POST("/quick-ship", middleware.CheckPermission("order.fulfill"), controllers.QuickShipByQR)              // NEW: Warehouse Scan Ship
				orders.GET("/couriers-active", middleware.CheckPermission("order.view"), controllers.GetActiveCouriers)         // NEW: Get Active Couriers
				orders.POST("/ghost-protocol", middleware.CheckPermission("order.ghost_protocol"), controllers.CheckExpiredPOs) // NEW: Ghost Protocol

				orders.GET("/stats", middleware.CheckPermission("order.view"), controllers.GetOrderStats) // NEW: Stats
				orders.GET("", middleware.CheckPermission("order.view"), controllers.GetOrders)
				orders.POST("", middleware.CheckPermission("order.manage"), controllers.CreateAdminOrder) // New POS/Manual Order
				orders.GET("/:id", middleware.CheckPermission("order.view"), controllers.GetOrder)
				orders.PUT("/:id/status", middleware.CheckPermission("order.edit"), controllers.UpdateOrderStatus)
				orders.POST("/:id/ship", middleware.CheckPermission("order.fulfill"), controllers.ShipOrder)
				orders.POST("/:id/cancel", middleware.CheckPermission("order.cancel_refund"), controllers.CancelOrder)
				orders.POST("/:id/mark-arrived", middleware.CheckPermission("order.edit"), controllers.MarkOrderArrived)       // Renamed from MarkPOArrived
				orders.POST("/:id/force-cancel", middleware.CheckPermission("order.cancel_refund"), controllers.ForceCancelPO) // NEW: Force Cancel
				orders.POST("/:id/refund", middleware.CheckPermission("order.cancel_refund"), controllers.RefundOrder)
				orders.POST("/:id/open-balance", middleware.CheckPermission("order.payment"), controllers.OpenBalanceDue)
				orders.POST("/:id/note", middleware.CheckPermission("order.edit"), controllers.AddOrderNote)
				orders.GET("/:id/invoices", middleware.CheckPermission("order.view"), controllers.GetOrderInvoices)
				orders.GET("/:id/biteship", middleware.CheckPermission("order.view"), controllers.GetBiteshipOrderInfo)
			}

			// ============================================
			// POS MODULE (Point of Sale)
			// ============================================
			pos := admin.Group("/pos")
			{
				pos.GET("/products", middleware.CheckPermission("pos.view"), controllers.SearchPOSProducts)
				pos.POST("/orders", middleware.CheckPermission("pos.create"), controllers.CreatePOSOrder)
				pos.POST("/generate-qr", middleware.CheckPermission("pos.create"), controllers.GenerateProductQRCodes)
			}

			// ============================================
			// INVOICES MODULE (Admin Actions)
			// ============================================
			invoices := admin.Group("/invoices")
			{
				invoices.POST("/:id/pay", middleware.CheckPermission("finance.manage"), controllers.MarkInvoicePaid)
				invoices.GET("/:id/pdf", middleware.CheckPermission("finance.view"), controllers.DownloadInvoicePDF)
			}

			// ============================================
			// FINANCE MODULE
			// ============================================
			finance := admin.Group("/finance")
			{
				// COA - Chart of Accounts (Full CRUD)
				finance.GET("/coa", middleware.CheckPermission("finance.view"), controllers.GetCOAs)
				// ✅ FIX: Literal routes MUST be registered before parameterized ones (:id).
				// Previously "/coa/:id" was first, causing Gin to match "/coa/next-code" as id="next-code".
				finance.GET("/coa/next-code", middleware.CheckPermission("finance.manage"), controllers.GetNextCOACode)
				finance.GET("/coa/:id", middleware.CheckPermission("finance.view"), controllers.GetCOA)
				finance.POST("/coa", middleware.CheckPermission("finance.manage"), controllers.CreateCOA)
				finance.PUT("/coa/:id", middleware.CheckPermission("finance.manage"), controllers.UpdateCOA)
				finance.DELETE("/coa/:id", middleware.CheckPermission("finance.manage"), controllers.DeleteCOA)

				// Journal Entries (Read + Create)
				finance.GET("/journals", middleware.CheckPermission("finance.view"), controllers.GetJournalEntries)
				finance.GET("/journals/:id", middleware.CheckPermission("finance.view"), controllers.GetJournalEntry)
				finance.POST("/journals", middleware.CheckPermission("finance.manage"), controllers.CreateJournalEntry)

				// Expenses (Full CRUD)
				finance.GET("/expenses", middleware.CheckPermission("finance.view"), controllers.GetExpenses)
				finance.GET("/expenses/:id", middleware.CheckPermission("finance.view"), controllers.GetExpense)
				finance.POST("/expenses", middleware.CheckPermission("finance.manage"), controllers.CreateExpense)
				finance.PUT("/expenses/:id", middleware.CheckPermission("finance.manage"), controllers.UpdateExpense)
				finance.DELETE("/expenses/:id", middleware.CheckPermission("finance.manage"), controllers.DeleteExpense)

				// Stats & Reports
				finance.GET("/stats", middleware.CheckPermission("finance.view"), controllers.GetFinanceStats)
				finance.GET("/trend", middleware.CheckPermission("finance.view"), controllers.GetCashFlowTrend) // Added Trend Route
				finance.GET("/reports/pnl", middleware.CheckPermission("finance.view"), controllers.GetProfitLossReport)
			}

			// ============================================
			// SYSTEM USERS (Staff Management)
			// ============================================
			systemUsers := admin.Group("/system-users")
			{
				systemUsers.GET("", middleware.CheckPermission("staff.view"), controllers.GetSystemUsers)
				systemUsers.POST("", middleware.CheckPermission("staff.manage"), controllers.CreateSystemUser)
				systemUsers.PUT("/:id", middleware.CheckPermission("staff.manage"), controllers.UpdateSystemUser)
				systemUsers.PUT("/:id/role", middleware.CheckPermission("staff.manage"), controllers.UpdateSystemUserRole)
				systemUsers.DELETE("/:id", middleware.CheckPermission("staff.manage"), controllers.DeleteSystemUser)
			}

			// ============================================
			// CUSTOMERS MODULE
			// ============================================
			customers := admin.Group("/customers")
			{
				customers.GET("/stats", middleware.CheckPermission("customer.view"), controllers.GetCustomerStats) // NEW: Stats
				customers.GET("", middleware.CheckPermission("customer.view"), controllers.GetCustomers)
				customers.GET("/:id", middleware.CheckPermission("customer.view"), controllers.GetCustomer)

				customers.PUT("/:id/notes", middleware.CheckPermission("customer.edit"), controllers.UpdateCustomerNotes)
			}

			// ============================================
			// MARKETING MODULE
			// ============================================
			// Announcements
			announcements := admin.Group("/announcements")
			{
				announcements.GET("", middleware.CheckPermission("marketing.view"), controllers.GetAnnouncements)
				announcements.GET("/:id", middleware.CheckPermission("marketing.view"), controllers.GetAnnouncement)
				announcements.POST("", middleware.CheckPermission("marketing.announcement.manage"), controllers.CreateAnnouncement)
				announcements.PUT("/:id", middleware.CheckPermission("marketing.announcement.manage"), controllers.UpdateAnnouncement)
				announcements.DELETE("/:id", middleware.CheckPermission("marketing.announcement.manage"), controllers.DeleteAnnouncement)
				announcements.POST("/:id/publish", middleware.CheckPermission("marketing.announcement.manage"), controllers.PublishAnnouncement)
				announcements.POST("/:id/broadcast", middleware.CheckPermission("marketing.announcement.manage"), controllers.BroadcastAnnouncement)
			}

			// Newsletter
			newsletter := admin.Group("/newsletter")
			{
				newsletter.POST("/sync", middleware.CheckPermission("marketing.campaign.manage"), controllers.SyncNewsletterSubscribers) // Added Sync Route
				newsletter.GET("/subscribers", middleware.CheckPermission("marketing.view"), controllers.GetNewsletterSubscribers)
				newsletter.GET("/campaigns", middleware.CheckPermission("marketing.view"), controllers.GetNewsletterCampaigns)
				newsletter.GET("/campaigns/:id", middleware.CheckPermission("marketing.view"), controllers.GetNewsletterCampaign)
				newsletter.POST("/campaigns", middleware.CheckPermission("marketing.campaign.manage"), controllers.CreateNewsletterCampaign)
				newsletter.POST("/campaigns/:id/send", middleware.CheckPermission("marketing.campaign.manage"), controllers.SendNewsletterCampaign)
			}

			// Wishlist
			wishlist := admin.Group("/wishlist")
			{
				wishlist.GET("/overview", middleware.CheckPermission("marketing.view"), controllers.GetWishlistOverview)
				wishlist.POST("/:product_id/notify", middleware.CheckPermission("marketing.campaign.manage"), controllers.TriggerRestockNotification)
			}

			// ============================================
			// STOCK RESERVATIONS (Anti-Overselling Monitor)
			// ============================================
			reservations := admin.Group("/reservations")
			{
				// ✅ FIX: Added CheckPermission — previously any logged-in staff could view
				reservations.GET("", middleware.CheckPermission("order.view"), controllers.GetReservationStatus)
			}

			// ============================================
			// SUPPLIERS MODULE
			// ============================================
			suppliers := admin.Group("/suppliers")
			{
				suppliers.GET("", middleware.CheckPermission("procurement.view"), controllers.GetSuppliers)
				suppliers.GET("/:id", middleware.CheckPermission("procurement.view"), controllers.GetSupplier)
				suppliers.POST("", middleware.CheckPermission("procurement.manage"), controllers.CreateSupplier)
				suppliers.PUT("/:id", middleware.CheckPermission("procurement.manage"), controllers.UpdateSupplier)
				suppliers.DELETE("/:id", middleware.CheckPermission("procurement.manage"), controllers.DeleteSupplier)
			}

			// ============================================
			// PROCUREMENT MODULE (Purchase Orders)
			// ============================================
			procurement := admin.Group("/procurement")
			{
				procurement.GET("/orders/stats", middleware.CheckPermission("procurement.view"), controllers.GetPurchaseOrderStats) // NEW: Stats
				procurement.GET("/orders", middleware.CheckPermission("procurement.view"), controllers.GetPurchaseOrders)
				procurement.GET("/orders/:id", middleware.CheckPermission("procurement.view"), controllers.GetPurchaseOrder)
				procurement.POST("/orders", middleware.CheckPermission("procurement.manage"), controllers.CreatePurchaseOrder)
				procurement.PUT("/orders/:id", middleware.CheckPermission("procurement.manage"), controllers.UpdatePurchaseOrder)
				procurement.DELETE("/orders/:id", middleware.CheckPermission("procurement.manage"), controllers.DeletePurchaseOrder)
				procurement.POST("/orders/:id/receive", middleware.CheckPermission("procurement.manage"), controllers.ReceivePurchaseOrder)
			}

			// ============================================
			// CURRENCY MODULE
			// ============================================
			currencies := admin.Group("/currencies")
			{
				// ✅ FIX: Added CheckPermission — previously any logged-in staff could mutate currencies
				currencies.GET("", middleware.CheckPermission("finance.view"), controllers.GetCurrencies)
				currencies.POST("", middleware.CheckPermission("finance.manage"), controllers.CreateCurrency)
				currencies.PUT("/:code", middleware.CheckPermission("finance.manage"), controllers.UpdateCurrency)
				currencies.DELETE("/:code", middleware.CheckPermission("finance.manage"), controllers.DeleteCurrency)
			}

			// ============================================
			// SETTINGS MODULE
			// ============================================
			settings := admin.Group("/settings")
			{
				settings.GET("", middleware.CheckPermission("settings.view"), controllers.GetSettings)
				settings.POST("", middleware.CheckPermission("settings.system.manage"), controllers.UpdateSetting)
				settings.POST("/bulk", middleware.CheckPermission("settings.system.manage"), controllers.BulkUpdateSettings)
				settings.POST("/email-preview", middleware.CheckPermission("settings.view"), controllers.EmailPreview)
				settings.GET("/shipping", middleware.CheckPermission("settings.view"), controllers.GetShippingRates)
				settings.POST("/shipping", middleware.CheckPermission("settings.shipping.manage"), controllers.CreateShippingRate)
				settings.PUT("/shipping/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.UpdateShippingRate)
				settings.DELETE("/shipping/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.DeleteShippingRate)
				settings.GET("/carriers", middleware.CheckPermission("settings.view"), controllers.GetCarriers)
				settings.POST("/carriers/sync", middleware.CheckPermission("settings.shipping.manage"), controllers.SyncBiteshipCouriers)
				settings.POST("/carriers", middleware.CheckPermission("settings.shipping.manage"), controllers.CreateCarrier)
				settings.PUT("/carriers/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.UpdateCarrier)
				settings.PUT("/carriers/:id/services/:service_id", middleware.CheckPermission("settings.shipping.manage"), controllers.UpdateCarrierService)

				// INTL SHIPPING (WooCommerce style)
				shippingIntl := settings.Group("/intl")
				{
					shippingIntl.GET("/zones", middleware.CheckPermission("settings.view"), controllers.GetShippingZones)
					shippingIntl.POST("/zones", middleware.CheckPermission("settings.shipping.manage"), controllers.CreateShippingZone)
					shippingIntl.PUT("/zones/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.UpdateShippingZone)
					shippingIntl.DELETE("/zones/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.DeleteShippingZone)

					shippingIntl.POST("/methods", middleware.CheckPermission("settings.shipping.manage"), controllers.CreateShippingMethod)
					shippingIntl.PUT("/methods/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.UpdateShippingMethod)
					shippingIntl.DELETE("/methods/:id", middleware.CheckPermission("settings.shipping.manage"), controllers.DeleteShippingMethod)
				}
			}

			// ============================================
			// AUDIT LOGS MODULE
			// ============================================
			audit := admin.Group("/audit")
			{
				audit.GET("", middleware.CheckPermission("audit.view"), controllers.GetAuditLogs)
				audit.GET("/modules", middleware.CheckPermission("audit.view"), controllers.GetAuditLogModules)
			}
			// ============================================
			// WISHLIST MODULE (Admin)
			// ============================================
			wishlistAdmin := admin.Group("/wishlists")
			{
				wishlistAdmin.GET("", middleware.CheckPermission("marketing.view"), controllers.GetAllWishlists)
				wishlistAdmin.POST("/notify/:product_id", middleware.CheckPermission("marketing.campaign.manage"), controllers.NotifyWishlistUsers)
			}

			// ============================================
			// WALLET ADJUSTMENT MODULE
			// ============================================
			admin.POST("/wallet/adjust", middleware.CheckPermission("finance.wallet.adjust"), controllers.AdminAdjustBalance)

			// ============================================
			// BLOG MODULE
			// ============================================
			blog := admin.Group("/blog")
			{
				blog.GET("", middleware.CheckPermission("blog.view"), controllers.AdminGetAllBlogPosts)
				blog.GET("/:id", middleware.CheckPermission("blog.view"), controllers.GetBlogPostByID)
				blog.POST("", middleware.CheckPermission("blog.create"), controllers.CreateBlogPost)
				blog.PUT("/:id", middleware.CheckPermission("blog.edit"), controllers.UpdateBlogPost)
				blog.DELETE("/:id", middleware.CheckPermission("blog.delete"), controllers.DeleteBlogPost)
			}
			// ============================================
			// MESSAGES MODULE
			// ============================================
			messages := admin.Group("/messages")
			{
				// ✅ FIX: Added CheckPermission — previously any logged-in staff could read/delete messages
				messages.GET("", middleware.CheckPermission("crm.view"), controllers.GetContactMessages)
				messages.PUT("/:id/read", middleware.CheckPermission("crm.view"), controllers.MarkMessageAsRead)
				messages.DELETE("/:id", middleware.CheckPermission("crm.manage"), controllers.DeleteContactMessage)
			}

			// ============================================
			// NOTIFICATIONS MODULE (Admin)
			// ============================================
			notifications := admin.Group("/notifications")
			{
				notifications.GET("", controllers.GetAdminNotifications)
				notifications.PUT("/:id/read", controllers.MarkNotificationAsRead)
			}

			// ============================================
			// VOUCHER MODULE
			// ============================================
			vouchers := admin.Group("/vouchers")
			{
				vouchers.GET("/stats", middleware.CheckPermission("marketing.view"), controllers.GetVoucherStats)
				vouchers.GET("", middleware.CheckPermission("marketing.view"), controllers.GetVouchers)
				vouchers.GET("/:id", middleware.CheckPermission("marketing.view"), controllers.GetVoucher)
				vouchers.POST("", middleware.CheckPermission("marketing.voucher.manage"), controllers.CreateVoucher)
				vouchers.PUT("/:id", middleware.CheckPermission("marketing.voucher.manage"), controllers.UpdateVoucher)
				vouchers.DELETE("/:id", middleware.CheckPermission("marketing.voucher.manage"), controllers.DeleteVoucher)
				vouchers.PUT("/:id/enable", middleware.CheckPermission("marketing.voucher.manage"), controllers.EnableVoucher)
				vouchers.POST("/:id/duplicate", middleware.CheckPermission("marketing.voucher.manage"), controllers.DuplicateVoucher)
				vouchers.GET("/:id/usages", middleware.CheckPermission("marketing.view"), controllers.GetVoucherUsages)
			}
		}

		// ============================================
		// CUSTOMER PROTECTED ROUTES
		// Requires authentication only
		// ============================================
		customer := api.Group("/customer")
		customer.Use(middleware.AuthMiddleware())
		{
			// Wishlist & Waitlist
			customer.POST("/wishlist", controllers.AddToWishlist)
			customer.GET("/wishlist", controllers.GetUserWishlist)
			customer.DELETE("/wishlist/:id", controllers.RemoveFromWishlist)
			customer.POST("/waitlist/:id", controllers.JoinWaitlist)

			// Orders (Checkout Protected)
			customer.GET("/orders", controllers.GetCustomerOrders)
			customer.GET("/orders/:id", controllers.GetCustomerOrderDetail)
			customer.GET("/orders/:id/tracking", controllers.GetOrderTracking)
			customer.POST("/orders/:id/confirm", controllers.ConfirmOrderReceived)
			customer.POST("/orders/:id/confirm-delivery", controllers.ConfirmDelivery)
			customer.POST("/checkout", middleware.StrictRateLimitMiddleware(), controllers.Checkout)
			customer.POST("/checkout/shipping-options", controllers.GetShippingOptions)

			// Invoices & Payments (Strict Limit)
			customer.GET("/orders/:id/invoices", controllers.GetCustomerOrderInvoices)
			customer.GET("/orders/:id/invoices/:invoice_id/pdf", controllers.GetOrderInvoiceForDownload)
			customer.POST("/invoices/:id/pay", middleware.StrictRateLimitMiddleware(), controllers.SubmitPaymentProof)
			customer.POST("/invoices/:id/pay-wallet", middleware.StrictRateLimitMiddleware(), controllers.PayInvoiceWithWallet)

			// Custom Payment Page (Direct API) - using /payment prefix to avoid conflicts
			customer.GET("/payment/cards", controllers.GetSavedCards) // NEW: Saved Cards
			customer.GET("/payment/:id/details", controllers.GetInvoiceDetails)
			customer.POST("/payment/:id/generate", controllers.GeneratePaymentCode)
			customer.POST("/payment/:id/submit-card", controllers.SubmitCreditCard) // CC Direct API Step 2
			customer.GET("/payment/:id/status", controllers.CheckPaymentStatus)
			customer.GET("/payment/:id/link", controllers.GetInvoicePaymentLink)

			// Stock Reservation (Anti-Overselling)
			customer.POST("/checkout/check-availability", controllers.CheckStockAvailability)
			customer.POST("/checkout/reserve", controllers.ReserveStock)
			customer.GET("/checkout/reservation-status", controllers.GetReservationStatus)

			// Profile
			customer.GET("/profile", controllers.GetCustomerProfile)
			customer.PUT("/profile", controllers.UpdateCustomerProfile)
			customer.PUT("/profile/password", controllers.ChangePassword)
			customer.DELETE("/profile", controllers.DeactivateAccount)

			// Notifications
			customer.GET("/notifications", controllers.GetMyNotifications)
			customer.PUT("/notifications/read/:id", controllers.MarkNotificationAsRead)

			// ============================================
			// WALLET MODULE
			// ============================================
			wallet := customer.Group("/wallet")
			{
				wallet.GET("", controllers.GetWalletBalance)
				wallet.POST("/topup", controllers.TopUpWallet)
			}

			// Voucher validation for checkout
			customer.POST("/vouchers/validate", controllers.ValidateVoucherForCart)
		}
	}
	// Payment callback route (without /api prefix for PrismaLink compatibility)
	// This route handles the frontend return from PrismaLink payment page
	r.GET("/payment/callback", controllers.HandlePrismalinkReturn)
	// Biteship Webhook (Real-time Shipping Updates)
	r.POST("/api/webhooks/biteship", controllers.BiteshipWebhook)

	return r
}
