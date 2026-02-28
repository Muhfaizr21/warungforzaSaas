package services

import (
	"image"
	"io"

	"github.com/chai2010/webp"
)

// EncodeToWebP encodes an image into WebP format with given quality (0-100)
func EncodeToWebP(w io.Writer, m image.Image, quality float32) error {
	return webp.Encode(w, m, &webp.Options{
		Lossless: false,
		Quality:  quality,
	})
}
