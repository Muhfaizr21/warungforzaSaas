package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"forzashop/backend/services"

	"github.com/gin-gonic/gin"
)

// UploadFile - Handle file uploads
func UploadFile(c *gin.Context) {
	// 1. Validate Form File
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// 2. Validate Extension (Images only)
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only images allowed (jpg, jpeg, png, webp, gif)"})
		return
	}

	// 3. Ensure Upload Directory
	uploadDir := "./public/uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, os.ModePerm)
	}

	var finalFilename string

	// 4. Handle Format Optimization
	// For GIF and WEBP, we save directly to preserve animations or avoid re-compressing
	if ext == ".gif" || ext == ".webp" {
		finalFilename = fmt.Sprintf("%d-%s", time.Now().UnixNano(), fileHeader.Filename)
		targetPath := filepath.Join(uploadDir, finalFilename)
		if err := c.SaveUploadedFile(fileHeader, targetPath); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
			return
		}
	} else {
		// Convert JPG/PNG to WebP
		srcFile, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read uploaded file"})
			return
		}
		defer srcFile.Close()

		img, _, err := image.Decode(srcFile)
		if err != nil {
			// Fallback: If parse fails, save it originally without conversion
			finalFilename = fmt.Sprintf("%d-%s", time.Now().UnixNano(), fileHeader.Filename)
			targetPath := filepath.Join(uploadDir, finalFilename)
			c.SaveUploadedFile(fileHeader, targetPath)
		} else {
			// Start encoding to WebP
			baseName := strings.TrimSuffix(fileHeader.Filename, filepath.Ext(fileHeader.Filename))
			finalFilename = fmt.Sprintf("%d-%s.webp", time.Now().UnixNano(), baseName)
			targetPath := filepath.Join(uploadDir, finalFilename)

			out, err := os.Create(targetPath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create webp file"})
				return
			}
			defer out.Close()

			// Compress with Quality 85 using helper
			if err := services.EncodeToWebP(out, img, 85); err != nil {
				out.Close()
				os.Remove(targetPath)
				// Fallback if encode fails
				finalFilename = fmt.Sprintf("%d-%s", time.Now().UnixNano(), fileHeader.Filename)
				fallbackPath := filepath.Join(uploadDir, finalFilename)
				c.SaveUploadedFile(fileHeader, fallbackPath)
			}
		}
	}

	// 5. Return Public URL
	publicURL := fmt.Sprintf("/uploads/%s", finalFilename)
	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"url":     publicURL,
	})
}
