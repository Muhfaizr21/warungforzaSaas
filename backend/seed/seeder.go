package seed

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"forzashop/backend/config"
	"forzashop/backend/models"
	"log"
	mathrand "math/rand"
	"strings"
	"time"

	"forzashop/backend/helpers"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
)

func SeedDatabase() {
	log.Println("🪒 BOTAKIN DATABASE - Full Reset & Re-seed...")

	// 0. Cleanup - Order matters due to FKs
	config.DB.Exec("TRUNCATE TABLE order_logs RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE order_items RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE orders RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE invoices RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE blog_posts RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE product_series RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE product_characters RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE product_genres RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE products RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE purchase_order_items RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE purchase_orders RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE customer_profiles RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE wallets RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE wallet_transactions RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE roles RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE permissions RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE categories RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE brands RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE series RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE characters RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE genres RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE coas RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE carrier_templates RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE prismalink_merchants RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE wishlists RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE cart_items RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE shipping_zones RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE shipping_methods RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE characters RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE genres RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE coas RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE carrier_templates RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE prismalink_merchants RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE notifications RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE wishlists RESTART IDENTITY CASCADE")
	config.DB.Exec("TRUNCATE TABLE cart_items RESTART IDENTITY CASCADE")

	// 1. Roles & Permissions
	seedRoles()
	SeedPermissions()
	seedSuperAdmin()
	seedAdmin()

	// 2. Taxonomy
	SeedPremiumCategories()
	SeedPremiumBrands()
	SeedAdvancedTaxonomy()

	// 3. Products with QR Codes + Valid Images
	seedProductsWithQR()

	// 4. Blog
	seedBlog()

	// 5. Procurement
	seedSuppliers()
	seedPurchaseOrders()

	// 6. Utils
	seedCOA()
	seedCarriers()
	seedShippingZones()
	seedPrismalink()

	// 7. Customers & Orders (Sales Data)
	seedSampleCustomers()
	seedSampleOrders()

	// 8. Finance - Sample Expenses
	seedInitialExpenses()

	log.Println("🎉 DATABASE SEEDED SUCCESSFULLY! Data bersih, Produk ada QR + Gambar, Customer & Order Sample sudah masuk!")
}

func seedRoles() {
	roles := []models.Role{
		{Name: "Super Admin", Slug: "super_admin"},
		{Name: "Admin", Slug: "admin"},
		{Name: "Staff", Slug: "staff"},
		{Name: "Reseller", Slug: "reseller"},
		{Name: "User", Slug: "user"},
	}
	for i := range roles {
		config.DB.Create(&roles[i])
	}
}

func SeedPermissions() {
	permissions := []models.Permission{
		{Name: "Lihat Dashboard", Slug: "dashboard.view"},

		// PRODUCT
		{Name: "Lihat Produk", Slug: "product.view"},
		{Name: "Tambah Produk", Slug: "product.create"},
		{Name: "Edit Produk", Slug: "product.edit"},
		{Name: "Hapus Produk", Slug: "product.delete"},

		// ORDER
		{Name: "Lihat Pesanan", Slug: "order.view"},
		{Name: "Penuhi Pesanan (Operasional)", Slug: "order.fulfill"},
		{Name: "Proses Pesanan", Slug: "order.edit"},
		{Name: "Kelola Pembayaran Pesanan", Slug: "order.payment"},
		{Name: "Batal & Refund Pesanan", Slug: "order.cancel_refund"},
		{Name: "Kelola Pesanan Global", Slug: "order.manage"},
		{Name: "Eksekusi Ghost Protocol", Slug: "order.ghost_protocol"},

		// USER (Pemisahan Customer vs Staff)
		{Name: "Lihat Pelanggan", Slug: "customer.view"},
		{Name: "Kelola Pelanggan", Slug: "customer.manage"},
		{Name: "Edit Pelanggan", Slug: "customer.edit"},
		{Name: "Hapus Pelanggan", Slug: "customer.delete"},

		{Name: "Lihat Staff", Slug: "staff.view"},
		{Name: "Kelola Staff", Slug: "staff.manage"},

		// FINANCE
		{Name: "Lihat Keuangan", Slug: "finance.view"},
		{Name: "Kelola Keuangan", Slug: "finance.manage"},
		{Name: "Lihat Kartu Tersimpan", Slug: "finance.card.view"},
		{Name: "Kelola Cicilan", Slug: "finance.installment.manage"},
		{Name: "Proses Refund", Slug: "finance.refund.execute"},
		{Name: "Setujui Topup", Slug: "finance.topup.approve"},
		{Name: "Sesuaikan Saldo Dompet", Slug: "finance.wallet.adjust"},

		// POS
		{Name: "Lihat POS", Slug: "pos.view"},
		{Name: "Buat Transaksi", Slug: "pos.create"},
		{Name: "Void Item", Slug: "pos.void"},
		{Name: "Kelola Diskon", Slug: "pos.discount"},
		{Name: "Tutup Shift", Slug: "pos.close_shift"},

		// ROLE
		{Name: "Kelola Peran & Izin", Slug: "role.manage"},
		{Name: "Lihat Peran & Izin", Slug: "role.view"},

		// BLOG
		{Name: "Lihat Blog", Slug: "blog.view"},
		{Name: "Tambah Blog", Slug: "blog.create"},
		{Name: "Edit Blog", Slug: "blog.edit"},
		{Name: "Hapus Blog", Slug: "blog.delete"},

		// AUDIT
		{Name: "Lihat Log Audit", Slug: "audit.view"},

		// MARKETING (Dipecah)
		{Name: "Lihat Pemasaran", Slug: "marketing.view"},
		{Name: "Kelola Voucher & Diskon", Slug: "marketing.voucher.manage"},
		{Name: "Kelola Newsletter & Campaign", Slug: "marketing.campaign.manage"},
		{Name: "Kelola Pengumuman", Slug: "marketing.announcement.manage"},

		// SETTINGS (Dipecah)
		{Name: "Lihat Pengaturan", Slug: "settings.view"},
		{Name: "Kelola Integrasi & Sistem", Slug: "settings.system.manage"},
		{Name: "Kelola Ongkir & Kurir", Slug: "settings.shipping.manage"},

		// PROCUREMENT
		{Name: "Lihat Pengadaan (PO)", Slug: "procurement.view"},
		{Name: "Kelola Pengadaan (PO)", Slug: "procurement.manage"},

		// TAXONOMY
		{Name: "Lihat Taksonomi", Slug: "taxonomy.view"},
		{Name: "Kelola Taksonomi", Slug: "taxonomy.manage"},

		// CRM / MESSAGES (Baru)
		{Name: "Lihat Tiket & Pesan CS", Slug: "crm.view"},
		{Name: "Kelola Tiket & Pesan CS", Slug: "crm.manage"},
	}

	for i := range permissions {
		config.DB.Where(models.Permission{Slug: permissions[i].Slug}).
			Assign(models.Permission{Name: permissions[i].Name}).
			FirstOrCreate(&permissions[i])
	}

	// ---- Assign ALL permissions to Super Admin ----
	var saRole models.Role
	config.DB.Where("slug = ?", "super_admin").First(&saRole)
	var allPerms []models.Permission
	config.DB.Find(&allPerms)
	config.DB.Model(&saRole).Association("Permissions").Replace(allPerms)

	// ---- Assign ALL permissions to Admin ----
	var adminRole models.Role
	config.DB.Where("slug = ?", "admin").First(&adminRole)
	config.DB.Model(&adminRole).Association("Permissions").Replace(allPerms)
}

func seedSuperAdmin() {
	var saRole models.Role
	config.DB.Where("slug = ?", "super_admin").First(&saRole)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("root123"), bcrypt.DefaultCost)
	root := models.User{
		Username: "root",
		Email:    "root@forzashop.com",
		Password: string(hashedPassword),
		RoleID:   saRole.ID,
		FullName: "Root Administrator",
		Status:   "active",
	}
	config.DB.Create(&root)
}

func seedAdmin() {
	var saRole models.Role
	config.DB.Where("slug = ?", "super_admin").First(&saRole)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := models.User{
		Username: "admin",
		Email:    "admin@forzashop.com",
		Password: string(hashedPassword),
		RoleID:   saRole.ID,
		FullName: "Admin Forza",
		Status:   "active",
	}
	config.DB.Create(&admin)
}

func SeedPremiumCategories() {
	// Top Level Categories (Types)
	types := []models.Category{
		{Name: "STATUE (GENERAL)", Slug: "statue-general", Description: "Premium museum-quality statues"},
		{Name: "ACTION FIGURE (GENERAL)", Slug: "action-figure-general", Description: "Highly detailed articulated figures"},
		{Name: "DINOSAUR & ANIMAL MODEL", Slug: "dino-animal-model", Description: "Prehistoric creature models"},
		{Name: "MILITARY", Slug: "military-general", Description: "Tactical military figures"},
	}

	for i := range types {
		var existing models.Category
		if err := config.DB.Where("slug = ?", types[i].Slug).First(&existing).Error; err != nil {
			config.DB.Create(&types[i])
		} else {
			types[i] = existing
		}
	}

	// Sub-Categories (Brand-based Categories)
	brandCats := []struct {
		Name       string
		Slug       string
		ParentSlug string
	}{
		{"Prime 1 Studio", "p1-cat", "statue-general"},
		{"Sideshow Collectibles", "ss-cat", "statue-general"},
		{"Elite Creature Collectibles", "ecc-cat", "statue-general"},
		{"Chronicle Collectibles", "chronicle-cat", "statue-general"},
		{"Hot Toys", "ht-cat", "action-figure-general"},
		{"Threezero", "tz-cat", "action-figure-general"},
		{"Damtoys", "damtoys-cat", "action-figure-general"},
		{"Dino Dream", "dino-dream-cat", "dino-animal-model"},
		{"Deep Tale Studio", "deep-tale-cat", "statue-general"},
	}

	for _, bc := range brandCats {
		var parent models.Category
		config.DB.Where("slug = ?", bc.ParentSlug).First(&parent)
		if parent.ID != 0 {
			var existing models.Category
			if err := config.DB.Where("slug = ?", bc.Slug).First(&existing).Error; err != nil {
				config.DB.Create(&models.Category{
					Name:     bc.Name,
					Slug:     bc.Slug,
					ParentID: &parent.ID,
				})
			}
		}
	}
}

func SeedPremiumBrands() {
	brands := []models.Brand{
		{Name: "Prime 1 Studio", Slug: "prime-1-studio"},
		{Name: "Hot Toys", Slug: "hot-toys"},
		{Name: "Threezero", Slug: "threezero"},
		{Name: "Sideshow Collectibles", Slug: "sideshow"},
		{Name: "Elite Creature Collectibles", Slug: "elite-creature"},
		{Name: "Chronicle Collectibles", Slug: "chronicle"},
		{Name: "Damtoys", Slug: "damtoys"},
		{Name: "Deep Tale Studio", Slug: "deep-tale"},
		{Name: "Dino Dream", Slug: "dino-dream"},
		{Name: "W-Dragon", Slug: "w-dragon"},
		{Name: "Nanmu Studio", Slug: "nanmu-studio"},
		{Name: "Iron Studios", Slug: "iron-studios"},
		{Name: "HCMY", Slug: "hcmy"},
	}
	for _, b := range brands {
		var existing models.Brand
		if err := config.DB.Where("slug = ?", b.Slug).First(&existing).Error; err != nil {
			config.DB.Create(&b)
		}
	}
}

func SeedAdvancedTaxonomy() {
	series := []models.Series{
		{Name: "Marvel Universe", Slug: "marvel-series"},
		{Name: "DC Universe", Slug: "dc-series"},
		{Name: "Star Wars", Slug: "star-wars"},
		{Name: "Jurassic Series", Slug: "jurassic-series"},
		{Name: "Alien & Predator", Slug: "alien-predator"},
		{Name: "Batman Arkham", Slug: "batman-universe"},
	}
	for _, s := range series {
		var existing models.Series
		if err := config.DB.Where("slug = ?", s.Slug).First(&existing).Error; err != nil {
			config.DB.Create(&s)
		}
	}
}

// generateQR creates a unique QR code string
func generateQR(sku string) string {
	qrBytes := make([]byte, 4)
	rand.Read(qrBytes)
	return fmt.Sprintf("FZ-%s-%s", strings.ToUpper(sku), hex.EncodeToString(qrBytes))
}

func seedProductsWithQR() {
	log.Println("📦 Seeding 50 Products with QR Codes + Valid Images...")

	// Map product names to thematically matching images that ACTUALLY EXIST
	// Available: batman.jpg, batman.png, dino.jpg, goku.jpg, horror-hero.jpg,
	//            joker.png, jurassic-bg.jpg, optimus.png, predator.jpg, trex.png, xeno.jpg
	type productSeed struct {
		Name       string
		BrandSlug  string
		CatSlug    string
		SeriesSlug string
		Image      string // Matched image for this product
	}

	products := []productSeed{

		// W-DRAGON
		{"Jurassic Park 3 Deinonychus Female Velociraptor 1/8 Scale", "w-dragon", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/02/FB_IMG_1708859946195.jpg"},
		{"Jurassic World Licensed Indominus Rex 1/35 Scale Statue", "w-dragon", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1710082805926.jpg"},
		{"Jurassic World Licensed Mosasaurus 1/35 Scale Statue", "w-dragon", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/02/FB_IMG_1628076695270.jpg"},
		{"Monsterverse King Ghidorah Licensed PVC Statue", "w-dragon", "dino-animal-model", "", "https://warungforzashop.com/wp-content/uploads/2024/02/FB_IMG_1708499458827.jpg"},

		// PRIME 1 STUDIO
		{"Jurassic Park Tyrannosaurus Rex 1/15 Scale Exclusive Version", "prime-1-studio", "statue-general", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2023/11/lmcjp-01_a01.jpg"},
		{"The Dark Knight Rises Catwoman on Batpod 1/3 Scale Statue", "prime-1-studio", "statue-general", "batman-universe", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1711091673944.jpg"},
		{"Batman Arkham Knight 1/3 Scale Statue", "prime-1-studio", "statue-general", "batman-universe", "/images/batman.png"}, // Legacy image fallback

		// HCMY
		{"God of War Blade of Chaos Full Metal Life Size Replica", "hcmy", "action-figure-general", "", "https://warungforzashop.com/wp-content/uploads/2024/03/IMG-20240111-WA0013.jpg"},

		// IRON STUDIOS
		{"Justice League Black Superman 1/4 Scale Statue", "iron-studios", "statue-general", "dc-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1710996500792.jpg"},

		// NANMU STUDIO
		{"Soul of Dragon Limited Vastatosaurus Rex 1/35 Scale Figure", "nanmu-studio", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1710085543118.jpg"},

		// DINO DREAM
		{"Jurassic Park Licensed Velociraptor 1/5 Scale Faux Bronze", "dino-dream", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1709951797356.jpg"},
		{"Jurassic Park Licensed Triceratops 1/30 Scale Statue", "dino-dream", "dino-animal-model", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1709951797356.jpg"}, // Reused image as placeholder for similar item

		// SIDESHOW
		{"Dinosauria Ceratosaurus Statue", "sideshow", "statue-general", "jurassic-series", "https://warungforzashop.com/wp-content/uploads/2024/03/FB_IMG_1710226531619.jpg"},
		{"Scream Scene Diorama Freddy vs Jason 1/4 Statue", "sideshow", "statue-general", "alien-predator", "https://warungforzashop.com/wp-content/uploads/2024/02/FB_IMG_1701823678989.jpg"},
		{"Superman vs Doomsday Premium Diorama", "sideshow", "statue-general", "dc-series", "/images/goku.jpg"},

		// ELITE CREATURE COLLECTIBLES (ECC)
		{"Akihito Xenomorph Elite 1/2 Scale Bust", "elite-creature", "statue-general", "alien-predator", "/images/xeno.jpg"},
		{"Blade 2 Reaper 1/3 Scale Statue", "elite-creature", "statue-general", "marvel-series", "/images/batman.png"},

		// DAMTOYS
		{"Terminator 2 Judgment Day T-800 1/4 Scale Statue", "damtoys", "action-figure-general", "", "/images/optimus.png"},

		// CHRONICLE
		{"Jurassic Park Faux Bronze T-Rex 1/20 Scale", "chronicle", "dino-animal-model", "jurassic-series", "/images/trex.png"},
	}

	for i, rp := range products {
		var cat models.Category
		var brand models.Brand
		config.DB.Where("slug = ?", rp.CatSlug).First(&cat)
		config.DB.Where("slug = ?", rp.BrandSlug).First(&brand)

		if cat.ID == 0 {
			config.DB.Preload("Parent").First(&cat)
		}
		if brand.ID == 0 {
			config.DB.First(&brand)
		}

		sku := fmt.Sprintf("FORZA-%04d", i+1)
		price := float64(2000000 + (mathrand.Intn(20) * 500000))
		stock := mathrand.Intn(15) + 1

		// Determine product type (80% ready, 20% PO)
		pType := "ready"
		var poConfig datatypes.JSON
		if i%5 == 0 && i > 0 {
			pType = "po"
			poConfig = datatypes.JSON(`{"deposit_type":"percent","deposit_value":"50","estimated_arrival":"2026-04-01"}`)
		}

		prod := models.Product{
			Name:         rp.Name,
			Slug:         fmt.Sprintf("prod-%d-%s", i+1, strings.ReplaceAll(strings.ToLower(rp.BrandSlug), " ", "-")),
			SKU:          sku,
			QRCode:       generateQR(sku),
			Description:  fmt.Sprintf("Premium collectible %s by %s. Museum quality detail, hand-painted and expertly sculpted. Comes with deluxe packaging and certificate of authenticity.", rp.Name, rp.BrandSlug),
			Price:        price,
			SupplierCost: price * 0.6,
			Stock:        stock,
			CategoryID:   &cat.ID,
			BrandID:      &brand.ID,
			Status:       "active",
			ProductType:  pType,
			POConfig:     poConfig,
			Images:       datatypes.JSON(fmt.Sprintf(`["%s"]`, rp.Image)),
			IsFeatured:   i%4 == 0,
			Weight:       float64(mathrand.Intn(10)+2) + 0.5,
			AllowAir:     true,
			AllowSea:     true,
		}

		if rp.SeriesSlug != "" {
			var series models.Series
			config.DB.Where("slug = ?", rp.SeriesSlug).First(&series)
			if series.ID != 0 {
				prod.Series = []models.Series{series}
			}
		}

		config.DB.Create(&prod)
	}

	log.Printf("✅ %d Products seeded with QR Codes & Valid Images!", len(products))
}

func seedBlog() {
	log.Println("📝 Seeding 10 Blog Posts...")
	var admin models.User
	config.DB.Where("username = ?", "admin").First(&admin)

	blogImages := []string{
		"/images/batman.jpg",
		"/images/trex.png",
		"/images/dino.jpg",
		"/images/horror-hero.jpg",
		"/images/predator.jpg",
		"/images/optimus.png",
		"/images/goku.jpg",
		"/images/xeno.jpg",
		"/images/joker.png",
		"/images/batman.png",
	}

	for i := 1; i <= 10; i++ {
		blog := models.BlogPost{
			Title:         fmt.Sprintf("Review: Koleksi Terbaru Item #%d", i),
			Slug:          fmt.Sprintf("review-koleksi-%d", i),
			Content:       "Kami baru saja menerima stok terbaru untuk kategori collectible. Tekstur dan detail cat pada item ini sangat luar biasa. Simak ulasan lengkap kami di bawah ini.",
			Excerpt:       fmt.Sprintf("Ulasan singkat mengenai item koleksi premium terbaru nomor %d.", i),
			FeaturedImage: blogImages[(i-1)%len(blogImages)],
			Status:        "published",
			AuthorID:      admin.ID,
		}
		config.DB.Create(&blog)
	}
}

func seedSuppliers() {
	log.Println("🚚 Seeding Suppliers...")
	suppliers := []models.Supplier{
		{Name: "Iron Studios Brazil", Contact: "Fabio", Email: "fabio@ironstudios.br", Phone: "+55110000000"},
		{Name: "Prime 1 Studio Japan", Contact: "Kenji", Email: "kenji@prime1.jp", Phone: "+8130000000"},
		{Name: "Hot Toys Hong Kong", Contact: "Howard", Email: "howard@hottoys.hk", Phone: "+852000000"},
	}
	for i := range suppliers {
		config.DB.Create(&suppliers[i])
	}
}

func seedPurchaseOrders() {
	log.Println("📦 Seeding Purchase Orders (Procurement)...")
	var suppliers []models.Supplier
	config.DB.Find(&suppliers)
	var products []models.Product
	config.DB.Limit(10).Find(&products)

	if len(suppliers) == 0 || len(products) == 0 {
		return
	}

	for i := 1; i <= 5; i++ {
		sup := suppliers[mathrand.Intn(len(suppliers))]
		date := time.Now().AddDate(0, 0, -i*2)

		po := models.PurchaseOrder{
			PONumber:    fmt.Sprintf("PO-%s-%03d", date.Format("20060102"), i),
			SupplierID:  sup.ID,
			Status:      "received",
			TotalAmount: 0,
			CreatedAt:   date,
			OrderedAt:   &date,
			ReceivedAt:  &date,
		}
		config.DB.Create(&po)

		var total float64
		for j := 0; j < 2; j++ {
			p := products[mathrand.Intn(len(products))]
			cost := p.Price * 0.7
			qty := 10
			itemTotal := cost * float64(qty)
			total += itemTotal

			item := models.PurchaseOrderItem{
				PurchaseOrderID: po.ID,
				ProductID:       p.ID,
				Quantity:        qty,
				UnitCost:        cost,
				TotalCost:       itemTotal,
				ReceivedQty:     qty,
			}
			config.DB.Create(&item)
		}
		po.TotalAmount = total
		config.DB.Save(&po)
	}
}

func seedCOA() {
	accounts := []models.COA{
		// ASSETS (1xxx)
		{Code: "1001", Name: "Kas Utama", Type: "ASSET", MappingKey: strPtr("CASH"), CanPost: true},
		{Code: "1002", Name: "Bank BCA", Type: "ASSET", MappingKey: strPtr("PRIMARY_BANK"), CanPost: true},
		{Code: "1003", Name: "Persediaan Barang", Type: "ASSET", MappingKey: strPtr("INVENTORY_ASSET"), CanPost: true},

		// LIABILITIES (2xxx)
		{Code: "2001", Name: "Hutang Usaha", Type: "LIABILITY", CanPost: true},
		{Code: "2002", Name: "Titipan Pelanggan (PO)", Type: "LIABILITY", MappingKey: strPtr("CUSTOMER_DEPOSIT"), CanPost: true},
		{Code: "2003", Name: "Saldo Dompet Pelanggan", Type: "LIABILITY", MappingKey: strPtr("WALLET_LIABILITY"), CanPost: true},

		// EQUITY (3xxx)
		{Code: "3001", Name: "Modal Pemilik", Type: "EQUITY", CanPost: true},
		{Code: "3002", Name: "Laba Ditahan", Type: "EQUITY", CanPost: true},

		// REVENUE (4xxx)
		{Code: "4001", Name: "Pendapatan Penjualan Retail", Type: "REVENUE", MappingKey: strPtr("RETAIL_REVENUE"), CanPost: true},
		{Code: "4002", Name: "Pendapatan Penjualan PO", Type: "REVENUE", MappingKey: strPtr("PO_REVENUE"), CanPost: true},
		{Code: "4003", Name: "Pendapatan Lain-lain", Type: "REVENUE", MappingKey: strPtr("OTHER_INCOME"), CanPost: true},

		// COGS (5xxx)
		{Code: "5001", Name: "Harga Pokok Penjualan (HPP)", Type: "COGS", MappingKey: strPtr("COGS_EXPENSE"), CanPost: true},

		// EXPENSES (6xxx)
		{Code: "6001", Name: "Biaya Gaji & Tunjangan", Type: "EXPENSE", CanPost: true},
		{Code: "6002", Name: "Biaya Sewa Kantor", Type: "EXPENSE", CanPost: true},
		{Code: "6003", Name: "Biaya Listrik, Air & Internet", Type: "EXPENSE", CanPost: true},
		{Code: "6004", Name: "Biaya Pemasaran & Iklan", Type: "EXPENSE", CanPost: true},
		{Code: "6005", Name: "Biaya Perlengkapan Packing", Type: "EXPENSE", CanPost: true},
		{Code: "6006", Name: "Biaya Pengiriman (Ongkir Toko)", Type: "EXPENSE", CanPost: true},
		{Code: "6007", Name: "Biaya Operasional Lainnya", Type: "EXPENSE", CanPost: true},
	}
	for _, acc := range accounts {
		config.DB.Create(&acc)
	}
}

func strPtr(s string) *string {
	return &s
}

func seedCarriers() {
	carriers := []models.CarrierTemplate{
		{Name: "JNE", BiteshipCode: "jne", TrackingURLTemplate: "https://jne.co.id/{tracking}", FallbackRate: 19000, Active: true},
		{Name: "SiCepat", BiteshipCode: "sicepat", TrackingURLTemplate: "https://sicepat.id/{tracking}", FallbackRate: 18500, Active: true},
		{Name: "J&T", BiteshipCode: "jnt", TrackingURLTemplate: "https://jet.co.id/{tracking}", FallbackRate: 20000, Active: true},
		{Name: "Gojek", BiteshipCode: "gojek", TrackingURLTemplate: "https://www.gojek.com/", FallbackRate: 15000, Active: true},
		{Name: "Grab", BiteshipCode: "grab", TrackingURLTemplate: "https://www.grab.com/", FallbackRate: 15000, Active: true},
		{Name: "TIKI", BiteshipCode: "tiki", TrackingURLTemplate: "https://www.tiki.id/id/tracking/{tracking}", FallbackRate: 18000, Active: true},
		{Name: "Ninja Express", BiteshipCode: "ninja", TrackingURLTemplate: "https://www.ninjaxpress.co/id-id/tracking?tracking_id={tracking}", FallbackRate: 19500, Active: true},
		{Name: "Lion Parcel", BiteshipCode: "lion", TrackingURLTemplate: "https://lionparcel.com/track/search?number={tracking}", FallbackRate: 17000, Active: true},
		{Name: "Sentral Cargo", BiteshipCode: "sentral", TrackingURLTemplate: "https://sentralcargo.co.id/cek-resi?resi={tracking}", FallbackRate: 16000, Active: true},
	}
	for _, c := range carriers {
		config.DB.Where(models.CarrierTemplate{Name: c.Name}).FirstOrCreate(&c)
	}

	// Seed bank & company settings (so they're editable from Admin > Settings)
	bankCompanySettings := []models.Setting{
		{Key: "company_name", Value: "WARUNG FORZA SHOP", Group: "company"},
		{Key: "company_tagline", Value: "Premium Collectibles Indonesia", Group: "company"},
		{Key: "company_address", Value: "Jakarta, Indonesia", Group: "company"},
		{Key: "company_email", Value: "info@warungforza.com", Group: "company"},
		{Key: "company_phone", Value: "+62 812-XXXX-XXXX", Group: "company"},
		{Key: "bank_name", Value: "Bank Central Asia (BCA)", Group: "payment"},
		{Key: "bank_account_number", Value: "123-456-7890", Group: "payment"},
		{Key: "bank_account_name", Value: "PT Warung Forza Indonesia", Group: "payment"},
		{Key: "store_url", Value: "http://localhost:5173", Group: "system"},
	}
	for _, s := range bankCompanySettings {
		config.DB.Where(models.Setting{Key: s.Key}).FirstOrCreate(&s)
	}
}

func seedPrismalink() {
	merchant := models.PrismalinkMerchant{
		MerchantID:        "MID_FORZA_001",
		MerchantKeyID:     "KEY_FORZA_001",
		MerchantSecretKey: "SECRET_FORZA_001",
		IsActive:          true,
		Environment:       "sandbox",
	}
	config.DB.Create(&merchant)
}

func seedShippingZones() {
	log.Println("✈️ Seeding International Shipping Zones & Methods...")

	zones := []models.ShippingZone{
		{
			Name:        "Asia Tenggara (ASEAN)",
			Countries:   `["SG","MY","BN","TH","PH","VN","LA","MM","KH","TL"]`,
			PostalCodes: "",
			IsActive:    true,
		},
		{
			Name:        "Eropa & Amerika Utara",
			Countries:   `["US","CA","GB","FR","DE","IT","ES","NL","BE","SE","CH","AT"]`,
			PostalCodes: "",
			IsActive:    true,
		},
		{
			Name:        "Rest of World",
			Countries:   "", // Fallback empty
			PostalCodes: "",
			IsActive:    true,
		},
	}

	for i := range zones {
		config.DB.Create(&zones[i])

		// Generate dynamic rates based on the zone
		airRate := 350000.0
		shipRate := 150000.0
		etaAir := "2-5 Business Days"
		etaShip := "14-30 Business Days"

		if zones[i].Name == "Eropa & Amerika Utara" {
			airRate = 750000.0
			shipRate = 300000.0
			etaAir = "4-7 Business Days"
			etaShip = "30-45 Business Days"
		} else if zones[i].Name == "Rest of World" {
			airRate = 850000.0
			shipRate = 350000.0
			etaAir = "7-14 Business Days"
			etaShip = "30-60 Business Days"
		}

		methods := []models.ShippingMethod{
			{
				ZoneID:      zones[i].ID,
				Name:        "DHL Express / FedEx Air",
				CourierType: "AIR",
				CalcType:    "per_kg",
				Rate:        airRate,
				MinWeight:   1.0,
				EtaText:     etaAir,
				IsActive:    true,
			},
			{
				ZoneID:      zones[i].ID,
				Name:        "Standard Cargo Sea Freight",
				CourierType: "SHIP",
				CalcType:    "per_kg",
				Rate:        shipRate,
				MinWeight:   3.0,
				EtaText:     etaShip,
				IsActive:    true,
			},
		}

		for _, m := range methods {
			config.DB.Create(&m)
		}
	}
}

func seedSampleCustomers() {
	log.Println("👥 Seeding Sample Customers...")
	var userRole models.Role
	config.DB.Where("slug = ?", "user").First(&userRole)

	customers := []models.User{
		{Username: "customer1", Email: "customer1@gmail.com", FullName: "Budi Santoso", Phone: "+628123456789", RoleID: userRole.ID, Status: "active"},
		{Username: "customer2", Email: "customer2@yahoo.com", FullName: "Siti Aminah", Phone: "+628777666555", RoleID: userRole.ID, Status: "active"},
		{Username: "customer3", Email: "customer3@hotmail.com", FullName: "John Doe", Phone: "+12025550101", RoleID: userRole.ID, Status: "active"},
	}

	for i := range customers {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		customers[i].Password = string(hashedPassword)
		config.DB.Create(&customers[i])
	}
}

func seedSampleOrders() {
	log.Println("💰 Seeding Sample Orders...")
	var users []models.User
	config.DB.Joins("JOIN roles ON roles.id = users.role_id").Where("roles.slug = ?", "user").Find(&users)
	var products []models.Product
	config.DB.Limit(5).Find(&products)

	if len(users) == 0 || len(products) == 0 {
		return
	}

	for i := 1; i <= 10; i++ {
		u := users[mathrand.Intn(len(users))]

		// Weighted distribution: 5 recent orders (last 2 weeks) and 5 historical
		var orderDate time.Time
		if i <= 5 {
			orderDate = time.Now().AddDate(0, 0, -mathrand.Intn(14))
		} else {
			orderDate = time.Now().AddDate(0, -mathrand.Intn(12), -mathrand.Intn(28))
		}

		status := "completed"
		pStatus := "paid"
		if i == 1 {
			status = "pending"
			pStatus = "unpaid"
		}

		order := models.Order{
			OrderNumber:   fmt.Sprintf("INV-%s-%03d", orderDate.Format("20060102"), i),
			UserID:        u.ID,
			TotalAmount:   0,
			Status:        status,
			PaymentStatus: pStatus,
			CreatedAt:     orderDate,
		}
		config.DB.Create(&order)

		var total float64
		p := products[mathrand.Intn(len(products))]
		qty := mathrand.Intn(2) + 1
		itemTotal := p.Price * float64(qty)
		total = itemTotal

		item := models.OrderItem{
			OrderID:   order.ID,
			ProductID: p.ID,
			Quantity:  qty,
			Price:     p.Price,
			Total:     itemTotal,
		}
		config.DB.Create(&item)

		order.TotalAmount = total
		config.DB.Save(&order)

		// Create a paid invoice for revenue
		if pStatus == "paid" {
			invoice := models.Invoice{
				InvoiceNumber: "INV-REF-" + order.OrderNumber,
				OrderID:       &order.ID,
				Amount:        total,
				Status:        "paid",
				Type:          "full",
				CreatedAt:     orderDate,
			}
			config.DB.Create(&invoice)

			// Record Journal to Sync with Finance Dashboard & COA
			helpers.RecordPaymentJournal(config.DB, &invoice, "SEED-TX-"+order.OrderNumber)
		}
	}
}

func seedInitialExpenses() {
	log.Println("💸 Seeding Initial Expenses...")
	var coas []models.COA
	config.DB.Where("type = ? OR type = ?", "EXPENSE", "COGS").Find(&coas)

	var admin models.User
	config.DB.Where("username = ?", "admin").First(&admin)

	if len(coas) == 0 || admin.ID == 0 {
		return
	}

	vendors := []string{"PLN", "Telkom", "Gaji Staff", "Sewa Kantor", "Tokopedia", "Shopee"}
	descriptions := []string{"Listrik Kantor", "Internet & Telepon", "Pembayaran Gaji Bulanan", "Sewa Gedung", "Pembelian Plastik Packing", "Kebutuhan ATK"}

	for i := 0; i < 5; i++ {
		coa := coas[mathrand.Intn(len(coas))]
		expenseDate := time.Now().AddDate(0, 0, -mathrand.Intn(30))
		amount := float64((mathrand.Intn(10) + 1) * 100000)

		expense := models.Expense{
			COAID:       coa.ID,
			Amount:      amount,
			Description: descriptions[mathrand.Intn(len(descriptions))],
			Vendor:      vendors[mathrand.Intn(len(vendors))],
			Date:        expenseDate,
			CreatedBy:   admin.ID,
		}
		config.DB.Create(&expense)

		// Record Journal for Expense
		coaBankID, _ := helpers.GetCOAByMappingKey("PRIMARY_BANK")
		if coaBankID != 0 {
			journalEntry := models.JournalEntry{
				Date:          expenseDate,
				Description:   "Expense: " + expense.Description,
				ReferenceID:   fmt.Sprintf("SEED-EXP-%d", i),
				ReferenceType: "EXPENSE",
			}
			config.DB.Create(&journalEntry)

			items := []models.JournalItem{
				{JournalEntryID: journalEntry.ID, COAID: coa.ID, Debit: amount, Credit: 0},
				{JournalEntryID: journalEntry.ID, COAID: coaBankID, Debit: 0, Credit: amount},
			}
			for _, item := range items {
				config.DB.Create(&item)
				// Update COA Balance
				var targetCOA models.COA
				config.DB.First(&targetCOA, item.COAID)
				if targetCOA.Type == "ASSET" || targetCOA.Type == "EXPENSE" || targetCOA.Type == "COGS" {
					targetCOA.Balance += item.Debit - item.Credit
				} else {
					targetCOA.Balance += item.Credit - item.Debit
				}
				config.DB.Save(&targetCOA)
			}
		}
	}
}
