package middleware

import (
	"forzashop/backend/helpers"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// --- 1. RATE LIMITER (In-Memory Token Bucket Simplified) ---
type rateLimiter struct {
	visitors map[string]*visitor
	mu       sync.Mutex
}

type visitor struct {
	lastSeen time.Time
	count    int
}

var limiter = &rateLimiter{
	visitors: make(map[string]*visitor),
}

// Strict Rate Limiter for sensitive endpoints (Login, Checkout)
var strictLimiter = &rateLimiter{
	visitors: make(map[string]*visitor),
}

// cleanupOnce ensures cleanup goroutines are only started ONCE at startup,
// not once per request (which was a serious goroutine leak).
var cleanupOnce sync.Once

// startCleanupWorkers launches background workers to purge stale rate limiter entries.
// Called once during middleware init to prevent goroutine accumulation.
func startCleanupWorkers() {
	cleanupOnce.Do(func() {
		// Worker for general rate limiter
		go func() {
			for {
				time.Sleep(1 * time.Minute)
				limiter.mu.Lock()
				for ip, v := range limiter.visitors {
					if time.Since(v.lastSeen) > 3*time.Minute {
						delete(limiter.visitors, ip)
					}
				}
				limiter.mu.Unlock()
			}
		}()

		// Worker for strict rate limiter
		go func() {
			for {
				time.Sleep(1 * time.Minute)
				strictLimiter.mu.Lock()
				for ip, v := range strictLimiter.visitors {
					if time.Since(v.lastSeen) > 3*time.Minute {
						delete(strictLimiter.visitors, ip)
					}
				}
				strictLimiter.mu.Unlock()
			}
		}()
	})
}

// RateLimitMiddleware limits requests per IP.
// Default: 300 requests per minute (Generous enough for frontend assets/API usage)
func RateLimitMiddleware() gin.HandlerFunc {
	// ✅ FIX: Start cleanup workers only ONCE globally, not per request
	startCleanupWorkers()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter.mu.Lock()

		v, exists := limiter.visitors[ip]
		if !exists {
			limiter.visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
			limiter.mu.Unlock()
			c.Next()
			return
		}

		if time.Since(v.lastSeen) > 1*time.Minute {
			// Reset counter after 1 minute
			v.lastSeen = time.Now()
			v.count = 1
		} else {
			v.count++
			// LIMIT: 300 requests / minute
			if v.count > 300 {
				limiter.mu.Unlock()
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error": "Too many requests. Please slow down.",
				})
				return
			}
		}

		limiter.mu.Unlock()
		c.Next()
	}
}

// StrictRateLimitMiddleware limits requests per IP for sensitive routes.
// Limit: 20 requests per minute
func StrictRateLimitMiddleware() gin.HandlerFunc {
	// ✅ FIX: Cleanup workers already started by startCleanupWorkers() (called from RateLimitMiddleware)
	// Calling startCleanupWorkers() here is safe due to sync.Once guard
	startCleanupWorkers()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		strictLimiter.mu.Lock()

		v, exists := strictLimiter.visitors[ip]
		if !exists {
			strictLimiter.visitors[ip] = &visitor{lastSeen: time.Now(), count: 1}
			strictLimiter.mu.Unlock()
			c.Next()
			return
		}

		if time.Since(v.lastSeen) > 1*time.Minute {
			// Reset counter after 1 minute
			v.lastSeen = time.Now()
			v.count = 1
		} else {
			v.count++
			// STRICT LIMIT: 20 requests / minute
			if v.count > 20 {
				strictLimiter.mu.Unlock()
				c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
					"error": "Too many attempts. Please try again later.",
				})
				return
			}
		}

		strictLimiter.mu.Unlock()
		c.Next()
	}
}

// --- 2. SECURE HEADERS ---
// Adds security headers to prevent common attacks
func SecureHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent Clickjacking
		c.Header("X-Frame-Options", "DENY")

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Enable XSS filtering in browser
		c.Header("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS (HSTS) - Max Age 1 Year
		// Only enable in production to avoid local issues usually, but good to have.
		if os.Getenv("GIN_MODE") == "release" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// CSP (Content Security Policy) - Permissive for API, restricts objects/scripts
		c.Header("Content-Security-Policy", "default-src 'self'; img-src 'self' data: https: http:; script-src 'self' 'unsafe-inline'; object-src 'none';")

		c.Next()
	}
}

// --- 3. STRICT CORS (Optimized) ---
// Replaces the manual CORS setup with a configurable one.
// Config is loaded ONCE at startup for performance.
func CORSMiddleware() gin.HandlerFunc {
	// 1. Load Configuration ONCE (Closure Capture)
	mode := os.Getenv("GIN_MODE")
	configOrigins := os.Getenv("ALLOWED_ORIGINS")

	var allowedOrigins []string
	if configOrigins != "" {
		allowedOrigins = strings.Split(configOrigins, ",")
	}

	// Pre-calculate hardcoded fallbacks
	defaultAllowed := map[string]bool{
		helpers.GetFrontendURL():  true,
		"https://warungforza.com": true,
	}

	return func(c *gin.Context) {
		clientOrigin := c.Request.Header.Get("Origin")
		allowOrigin := ""

		// DEVELOPMENT MODE: Allow Mirroring (Simulates "*" with credentials)
		if mode != "release" {
			allowOrigin = clientOrigin
		} else {
			// PRODUCTION MODE: Strict Whitelist Check
			// 1. Check Env Config
			if len(allowedOrigins) > 0 {
				for _, o := range allowedOrigins {
					if o == clientOrigin {
						allowOrigin = clientOrigin
						break
					}
				}
			}

			// 2. Check Defaults (if env didn't match or empty)
			if allowOrigin == "" && defaultAllowed[clientOrigin] {
				allowOrigin = clientOrigin
			}
		}

		// Set Headers Logic
		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		}

		// Handle Preflight
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
