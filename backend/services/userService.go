package services

import (
	"fmt"
	"strconv"

	"forzashop/backend/config"
	"forzashop/backend/helpers"
	"forzashop/backend/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserService struct {
	DB *gorm.DB
}

func NewUserService() *UserService {
	return &UserService{
		DB: config.DB,
	}
}

// CreateSystemUser handles creating staff members
func (s *UserService) CreateSystemUser(username, email, password string, roleID uint, adminID uint, ip, userAgent string) (*models.User, error) {
	// Check if user exists
	var existingUser models.User
	if err := s.DB.Where("email = ? OR username = ?", email, username).First(&existingUser).Error; err == nil {
		return nil, fmt.Errorf("user with this email or username already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password")
	}

	// Create User
	user := models.User{
		Username: username,
		Email:    email,
		Password: string(hashedPassword),
		RoleID:   roleID,
		Status:   "active",
		FullName: username,
	}

	if err := s.DB.Create(&user).Error; err != nil {
		return nil, err
	}

	helpers.LogAudit(adminID, "User", "Create", strconv.Itoa(int(user.ID)),
		"Created system user: "+user.Username, nil, nil, ip, userAgent)

	return &user, nil
}
