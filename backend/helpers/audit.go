package helpers

import (
	"encoding/json"
	"fmt"
	"forzashop/backend/config"
	"forzashop/backend/models"

	"gorm.io/datatypes"
)

// LogAudit records a critical action in the system
func LogAudit(userID uint, module, action, objectID, details string, oldData, newData interface{}, ip, userAgent string) {
	var oldJson, newJson datatypes.JSON

	if oldData != nil {
		if b, err := json.Marshal(oldData); err == nil {
			oldJson = datatypes.JSON(b)
		}
	}
	if newData != nil {
		if b, err := json.Marshal(newData); err == nil {
			newJson = datatypes.JSON(b)
		}
	}

	var uid *uint
	if userID != 0 {
		uid = &userID
	}

	log := models.AuditLog{
		UserID:    uid,
		Module:    module,
		Action:    action,
		ObjectID:  objectID,
		Details:   details,
		OldData:   oldJson,
		NewData:   newJson,
		IPAddress: ip,
		UserAgent: userAgent,
	}

	// Run in background to not block main thread
	go func() {
		// Create a copy of log because uid points to local var which might be reused/invalid in closure?
		// No, `uid` is pointer to local var `userID`. `userID` lifetime extends to end of function.
		// But in goroutine, `userID` might be destroyed?
		// Actually, Go escapes to heap if referenced. It's safe.
		// But cleaner:
		l := log
		config.DB.Create(&l)
	}()
}

// LogAuditSimple - Simplified audit log for basic logging without old/new data
func LogAuditSimple(userID uint, module, action string, recordID uint, details string) {
	objectID := fmt.Sprintf("%d", recordID)
	LogAudit(userID, module, action, objectID, details, nil, nil, "", "")
}
