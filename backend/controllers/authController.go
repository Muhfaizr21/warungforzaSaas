package controllers

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

func Register(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Sanitize inputs
	input.Username = strings.TrimSpace(input.Username)
	input.Email = strings.TrimSpace(input.Email)
	input.Password = strings.TrimSpace(input.Password) // Optional: Trim password or not? usually safer to trim to avoid accidental copy-paste spaces

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
		return
	}

	// Default role: User
	var userRole models.Role
	config.DB.Where("slug = ?", models.RoleUser).First(&userRole)

	user := models.User{
		Username: input.Username,
		Email:    input.Email,
		FullName: input.FullName,
		Phone:    input.Phone,
		Password: string(hashedPassword),
		RoleID:   userRole.ID,
		Status:   "pending", // Require verification
	}

	if err := config.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "UNIQUE") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username or Email already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate Verification Code
	otp := helpers.GenerateOTP(6)
	verification := models.VerificationCode{
		Email:     user.Email,
		Code:      otp,
		ExpiresAt: time.Now().Add(1 * time.Hour), // 1 hour valid
	}
	config.DB.Create(&verification)

	// Send Email - Elegant Design
	subject := "Welcome to the Forza Ecosystem - Verification Required"
	body := fmt.Sprintf(`
		<div style="background-color: #030303; padding: 50px 20px; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff; text-align: center;">
			<div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 40px; padding: 60px 40px; backdrop-filter: blur(20px);">
				<img src="%s/forza.png" alt="FORZA SHOP" style="width: 140px; margin-bottom: 40px; brightness: 1.2;">
				
				<h1 style="font-size: 28px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic; margin-bottom: 20px;">
					Greetings, <span style="color: #ff0055;">%s</span>
				</h1>
				
				<p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 40px; font-weight: 500;">
					Welcome to the inner circle of <br/>
					<b style="color: #ffffff;">Warung Forza Shop</b>. <br/><br/>
					A place where legendary artifacts and premium collectibles await your discovery. We are honored to have you join our elite collectors' ecosystem.
				</p>

				<div style="height: 1px; background: linear-gradient(to right, transparent, rgba(255, 0, 85, 0.3), transparent); margin-bottom: 40px;"></div>

				<p style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 4px; color: #ff0055; margin-bottom: 20px;">
					Identity Verification Protocol
				</p>
				
				<div style="background: rgba(255, 255, 255, 0.05); border: 1px dashed rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 30px; margin-bottom: 40px;">
					<span style="font-size: 42px; font-weight: 900; letter-spacing: 15px; color: #ffffff; text-shadow: 0 0 20px rgba(255, 0, 85, 0.4);">
						%s
					</span>
				</div>

				<p style="font-size: 13px; color: #71717a; font-style: italic; margin-bottom: 50px;">
					This code will expire in 60 minutes. <br/>
					Secure your artifacts. Happy hunting.
				</p>

				<div style="font-size: 9px; font-weight: 900; color: #3f3f46; text-transform: uppercase; letter-spacing: 2px;">
					FORZA_SHOP_SYSTEM // ENCRYPT_SNG_99
				</div>
			</div>
			
			<div style="margin-top: 40px; font-size: 10px; color: #3f3f46; text-transform: uppercase; letter-spacing: 1px;">
				© 2026 WARUNG FORZA SHOP INDONESIA. ALL RIGHTS RESERVED.
			</div>
		</div>
	`, os.Getenv("APP_URL"), user.Username, otp)

	go helpers.SendEmail(user.Email, subject, body)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Registration successful. Please check your email for verification code.",
		"email":   user.Email,
	})
}

func Login(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data login tidak valid"})
		return
	}

	// Sanitize
	input.Username = strings.TrimSpace(input.Username)
	input.Password = strings.TrimSpace(input.Password)

	var user models.User
	// Preload Role and Permissions. Allow login via Username or Email.
	if err := config.DB.Preload("Role.Permissions").Where("username = ? OR email = ?", input.Username, input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Kredensial tidak valid (User tidak ditemukan)"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password salah"})
		return
	}

	// CHECK STATUS
	if user.Status == "pending" {
		c.JSON(http.StatusUnauthorized, gin.H{ // Changed to 401/403 but usually clearer to frontend
			"error": "Akun belum diverifikasi",
			"code":  "PENDING_VERIFICATION",
			"email": user.Email,
		})
		return
	}

	if user.Status == "inactive" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun dinonaktifkan oleh sistem"})
		return
	}

	token, err := generateToken(user.ID, user.Role.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal generate token sesi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"token":   token,
		"user": gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"full_name":   user.FullName,
			"phone":       user.Phone,
			"role":        user.Role.Slug,
			"permissions": user.Role.Permissions, // Send permissions to frontend
		},
	})
}

func generateToken(userID uint, roleSlug string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"role":    roleSlug,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
func GoogleLogin(c *gin.Context) {
	var input struct {
		Credential string `json:"credential" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Credential is required"})
		return
	}

	// Validate Google Token
	payload, err := idtoken.Validate(context.Background(), input.Credential, os.Getenv("GOOGLE_CLIENT_ID"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token", "details": err.Error()})
		return
	}

	email := payload.Claims["email"].(string)
	googleID := payload.Subject
	name := payload.Claims["name"].(string)
	picture, _ := payload.Claims["picture"].(string) // Optional: Store avatar if user model supports it

	// Check if user exists
	var user models.User
	if err := config.DB.Preload("Role.Permissions").Where("google_id = ? OR email = ?", googleID, email).First(&user).Error; err != nil {
		// User does not exist, Create new user
		// Generate random secure password
		randomPwd := helpers.GenerateRandomString(16)
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(randomPwd), bcrypt.DefaultCost)

		// Default role: User
		var userRole models.Role
		config.DB.Where("slug = ?", models.RoleUser).First(&userRole)

		user = models.User{
			Username: strings.Split(email, "@")[0] + "_" + helpers.GenerateRandomString(4),
			Email:    email,
			FullName: name,
			GoogleID: &googleID,
			Password: string(hashedPassword),
			RoleID:   userRole.ID,
			Status:   "active",
		}
		// Save picture? No field yet.

		if err := config.DB.Create(&user).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
		// Reload to get role relations properly
		config.DB.Preload("Role.Permissions").First(&user, user.ID)
	} else {
		// User exists, ensure GoogleID is linked
		if user.GoogleID == nil || *user.GoogleID == "" {
			user.GoogleID = &googleID
			config.DB.Save(&user)
		}
		// Activate if pending (Social login counts as verification)
		if user.Status == "pending" {
			user.Status = "active"
			config.DB.Save(&user)
		}
	}

	// Generate JWT
	token, err := generateToken(user.ID, user.Role.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":          user.ID,
			"username":    user.Username,
			"email":       user.Email,
			"full_name":   user.FullName,
			"avatar":      picture,
			"role":        user.Role.Slug,
			"permissions": user.Role.Permissions,
		},
	})
}

// ForgotPassword - Sends OTP to email
func ForgotPassword(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		// Security: Always return success even if email not found to prevent enumeration
		c.JSON(http.StatusOK, gin.H{"message": "If email exists, OTP has been sent."})
		return
	}

	otp := helpers.GenerateOTP(6) // 6 digit code
	token := helpers.GenerateRandomString(32)

	reset := models.PasswordReset{
		Email:     user.Email,
		Code:      otp,
		Token:     token,
		ExpiresAt: time.Now().Add(15 * time.Minute), // Valid for 15 mins
	}

	if err := config.DB.Create(&reset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// Send Email
	subject := "Reset Password Code - Warung Forza"
	body := fmt.Sprintf(`
		<h3>Reset Password Request</h3>
		<p>Your password reset code is: <b>%s</b></p>
		<p>This code expires in 15 minutes.</p>
		<p>If you did not request this, please ignore.</p>
	`, otp)

	go helpers.SendEmail(user.Email, subject, body) // Async send

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP sent to email",
		"token":   token, // Handle this on frontend (optional, or rely on email code)
	})
}

// VerifyRegistration - Activates pending account
func VerifyRegistration(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
		Code  string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var codeEntry models.VerificationCode
	if err := config.DB.Where("email = ? AND code = ? AND used = ? AND expires_at > ?", input.Email, input.Code, false, time.Now()).First(&codeEntry).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code"})
		return
	}

	// Activate User
	if err := config.DB.Model(&models.User{}).Where("email = ?", input.Email).Update("status", "active").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to activate account"})
		return
	}

	// Mark code as used
	config.DB.Model(&codeEntry).Update("used", true)

	c.JSON(http.StatusOK, gin.H{"message": "Account verified successfully. You can now login."})
}

// ResendVerification - Resends code for pending accounts
func ResendVerification(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ? AND status = ?", input.Email, "pending").First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Account not found or already verified"})
		return
	}

	otp := helpers.GenerateOTP(6)
	verification := models.VerificationCode{
		Email:     user.Email,
		Code:      otp,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	config.DB.Create(&verification)

	subject := "New Verification Code - Warung Forza"
	body := fmt.Sprintf(`<h3>New Code: %s</h3>`, otp)
	go helpers.SendEmail(user.Email, subject, body)

	c.JSON(http.StatusOK, gin.H{"message": "New code sent to your email."})
}

// ResetPassword - Verifies OTP and resets password
func ResetPassword(c *gin.Context) {
	var input struct {
		Email       string `json:"email" binding:"required,email"`
		Code        string `json:"code" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak valid"})
		return
	}

	// Sanitize
	input.NewPassword = strings.TrimSpace(input.NewPassword)

	var reset models.PasswordReset
	// Find valid token: Match email, code, not used, not expired
	if err := config.DB.Where("email = ? AND code = ? AND used = ? AND expires_at > ?", input.Email, input.Code, false, time.Now()).First(&reset).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode OTP salah atau sudah kadaluarsa"})
		return
	}

	// Update User Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi password baru"})
		return
	}

	// TRANSACTION: Update Password AND Activate Account
	tx := config.DB.Begin()

	// 1. Update Password
	if err := tx.Model(&models.User{}).Where("email = ?", input.Email).Update("password", string(hashedPassword)).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan password baru"})
		return
	}

	// 2. FORCE ACTIVATE ACCOUNT (Verification via OTP bypasses pending status)
	if err := tx.Model(&models.User{}).Where("email = ?", input.Email).Update("status", "active").Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengaktifkan status akun"})
		return
	}

	// 3. Mark token as used
	if err := tx.Model(&reset).Update("used", true).Error; err != nil {
		tx.Rollback()
		// Non-critical, but good for hygiene
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully. Account activated."})
}
