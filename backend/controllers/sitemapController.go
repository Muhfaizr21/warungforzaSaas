package controllers

import (
	"encoding/xml"
	"fmt"
	"forzashop/backend/config"
	"forzashop/backend/models"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type XMLURL struct {
	Loc        string  `xml:"loc"`
	LastMod    string  `xml:"lastmod,omitempty"`
	ChangeFreq string  `xml:"changefreq,omitempty"`
	Priority   float32 `xml:"priority,omitempty"`
}

type XMLURLSet struct {
	XMLName xml.Name `xml:"urlset"`
	Xmlns   string   `xml:"xmlns,attr"`
	URLs    []XMLURL `xml:"url"`
}

func GetSitemap(c *gin.Context) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	urlSet := XMLURLSet{
		Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
	}

	// 1. Static Pages
	staticPages := []struct {
		path     string
		priority float32
	}{
		{"", 1.0},
		{"/preorder", 0.9},
		{"/readystock", 0.9},
		{"/contact", 0.5},
		{"/blog", 0.7},
	}
	for _, p := range staticPages {
		urlSet.URLs = append(urlSet.URLs, XMLURL{
			Loc:        frontendURL + p.path,
			LastMod:    time.Now().Format("2006-01-02"),
			ChangeFreq: "daily",
			Priority:   p.priority,
		})
	}

	// 2. Categories (Filter pages)
	var categories []models.Category
	config.DB.Find(&categories)
	for _, cat := range categories {
		urlSet.URLs = append(urlSet.URLs, XMLURL{
			Loc:        fmt.Sprintf("%s/readystock?category=%s", frontendURL, cat.Slug),
			LastMod:    cat.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   0.8,
		})
	}

	// 3. Brands (Filter pages)
	var brands []models.Brand
	config.DB.Find(&brands)
	for _, brand := range brands {
		urlSet.URLs = append(urlSet.URLs, XMLURL{
			Loc:        fmt.Sprintf("%s/readystock?brand=%s", frontendURL, brand.Slug),
			LastMod:    brand.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   0.7,
		})
	}

	// 4. Products
	var products []models.Product
	config.DB.Where("status = ?", "active").Find(&products)
	for _, prod := range products {
		urlSet.URLs = append(urlSet.URLs, XMLURL{
			Loc:        fmt.Sprintf("%s/product/%d", frontendURL, prod.ID),
			LastMod:    prod.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "weekly",
			Priority:   0.6,
		})
	}

	// 5. Blog Posts
	var posts []models.BlogPost
	config.DB.Find(&posts)
	for _, post := range posts {
		urlSet.URLs = append(urlSet.URLs, XMLURL{
			Loc:        fmt.Sprintf("%s/blog/%s", frontendURL, post.Slug),
			LastMod:    post.UpdatedAt.Format("2006-01-02"),
			ChangeFreq: "monthly",
			Priority:   0.5,
		})
	}

	output, err := xml.MarshalIndent(urlSet, "", "  ")
	if err != nil {
		c.String(http.StatusInternalServerError, "Error generating sitemap")
		return
	}

	c.Header("Content-Type", "application/xml")
	c.String(http.StatusOK, xml.Header+string(output))
}
