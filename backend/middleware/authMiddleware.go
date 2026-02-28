package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix if present
		tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// ✅ FIX: Safe expiration check — prevents runtime panic if 'exp' is missing or wrong type
		expVal, ok := claims["exp"].(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token missing expiration"})
			c.Abort()
			return
		}
		if float64(time.Now().Unix()) > expVal {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token expired"})
			c.Abort()
			return
		}

		// ✅ FIX: Safe user_id extraction — prevents panic if claim is missing
		userIDVal, ok := claims["user_id"].(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
			c.Abort()
			return
		}
		userID := uint(userIDVal)

		var user models.User
		// Preload Role AND Permissions
		if err := config.DB.Preload("Role.Permissions").First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// ✅ Re-check user status from DB on every request
		// This ensures suspended/deactivated accounts are blocked immediately even with valid JWT
		if user.Status == "inactive" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda telah dinonaktifkan. Hubungi administrator."})
			c.Abort()
			return
		}

		c.Set("currentUser", user)
		c.Set("userID", userID)
		c.Next()
	}
}

// AdminOnly middleware ensures user has admin role
// Since we have single admin role, this replaces granular permission checks
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("currentUser")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		currentUser := user.(models.User)

		// Check if user is NOT a regular customer (slug "user")
		// Any staff role should be able to pass this gatekeeper,
		// with specific access then governed by CheckPermission.
		if currentUser.Role.Slug == models.RoleUser {
			c.JSON(http.StatusForbidden, gin.H{"error": "Administrative access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CheckPermission verifies if the user has the specific permission required
func CheckPermission(permissionSlug string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("currentUser")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		currentUser := user.(models.User)

		// 1. Super Admin bypasses ALL checks
		if currentUser.Role.Slug == models.RoleSuperAdmin {
			c.Next()
			return
		}

		// 2. Check key permissions
		hasPermission := false
		for _, perm := range currentUser.Role.Permissions {
			if perm.Slug == permissionSlug {
				hasPermission = true
				break
			}
		}

		if hasPermission {
			c.Next()
			return
		}

		// For non-admin users (customers), deny admin operations
		c.JSON(http.StatusForbidden, gin.H{
			"error": fmt.Sprintf("Missing permission: %s", permissionSlug),
		})
		c.Abort()
	}
}
