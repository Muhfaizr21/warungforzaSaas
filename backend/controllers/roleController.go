package controllers

import (
	"forzashop/backend/config"
	"forzashop/backend/models"
	"net/http"

	"strings"

	"github.com/gin-gonic/gin"
)

// CreateRole - Create a new user role
func CreateRole(c *gin.Context) {
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create slug from name (lowercase, replace spaces with dashes)
	slug := strings.ToLower(strings.ReplaceAll(input.Name, " ", "_"))

	// Check if role exists
	var existingRole models.Role
	if err := config.DB.Where("slug = ?", slug).First(&existingRole).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role already exists"})
		return
	}

	role := models.Role{
		Name: input.Name,
		Slug: slug,
	}

	if err := config.DB.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": role})
}
func GetRoles(c *gin.Context) {
	var roles []models.Role
	// Preload Permissions for each role
	if err := config.DB.Preload("Permissions").Find(&roles).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": roles})
}

// GetPermissions - List all available system permissions
func GetPermissions(c *gin.Context) {
	var permissions []models.Permission
	if err := config.DB.Find(&permissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": permissions})
}

// UpdateRolePermissions - Update permissions for a specific role
func UpdateRolePermissions(c *gin.Context) {
	roleID := c.Param("id")
	var input struct {
		PermissionIDs []uint `json:"permission_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var role models.Role
	if err := config.DB.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Prevent modifying Super Admin or Admin permissions if needed (optional safety)
	if role.Slug == models.RoleSuperAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify Super Admin permissions directly"})
		return
	}

	// Fetch Permission objects
	var permissions []models.Permission
	config.DB.Where("id IN ?", input.PermissionIDs).Find(&permissions)

	// Update association
	if err := config.DB.Model(&role).Association("Permissions").Replace(permissions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update permissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role permissions updated successfully", "role": role})
}

// UpdateRole - Edit role name
func UpdateRole(c *gin.Context) {
	roleID := c.Param("id")
	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var role models.Role
	if err := config.DB.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Protected Roles
	if role.Slug == models.RoleSuperAdmin || role.Slug == models.RoleUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "This role is protected and cannot be modified"})
		return
	}

	config.DB.Model(&role).Update("name", input.Name)

	c.JSON(http.StatusOK, gin.H{"message": "Role updated", "data": role})
}

// DeleteRole - Remove a role
func DeleteRole(c *gin.Context) {
	roleID := c.Param("id")

	var role models.Role
	if err := config.DB.First(&role, roleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	// Protected Roles
	if role.Slug == models.RoleSuperAdmin || role.Slug == models.RoleUser || role.Slug == models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Protected system roles cannot be deleted"})
		return
	}

	// Check if users are assigned to this role
	var userCount int64
	config.DB.Model(&models.User{}).Where("role_id = ?", role.ID).Count(&userCount)
	if userCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete role while users are still assigned to it"})
		return
	}

	// Clear permissions association first
	config.DB.Model(&role).Association("Permissions").Clear()

	if err := config.DB.Delete(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role deleted successfully"})
}
