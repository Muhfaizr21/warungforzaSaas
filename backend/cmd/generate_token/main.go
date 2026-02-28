package main

import (
	"fmt"
	"forzashop/backend/config"
	"forzashop/backend/models"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env")
	config.ConnectDB()
	var user models.User
	config.DB.Where("username = ?", "customer1").First(&user)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString([]byte("super-secret-horror-key-666"))
	fmt.Print(tokenString)
}
