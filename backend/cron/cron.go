package cron

import (
	"fmt"
	"forzashop/backend/services"

	"github.com/robfig/cron/v3"
)

var cronJob *cron.Cron

func InitCron() {
	// Setup cron in the local timezone or UTC depending on server setup
	cronJob = cron.New(cron.WithChain(cron.Recover(cron.DefaultLogger)))

	// Run every night at midnight (00:00)
	_, err := cronJob.AddFunc("0 0 * * *", func() {
		fmt.Println("🤖 [CRON] Starting CheckExpiredPOs at midnight...")
		orderSvc := services.NewOrderService()

		// 0 represents System action
		count, err := orderSvc.CheckExpiredPOs(0)
		if err != nil {
			fmt.Printf("🔴 [CRON] Failed to forfeit expired POs: %v\n", err)
		} else {
			fmt.Printf("✅ [CRON] Job completed successfully! Forfeited %d overdue PO orders.\n", count)
		}
	})

	if err != nil {
		fmt.Printf("🔴 [CRON] Failed to register cron tasks: %v\n", err)
		return
	}

	cronJob.Start()
	fmt.Println("🕰️  [CRON] Daily System Scheduler started successfully (00:00).")
}

func StopCron() {
	if cronJob != nil {
		cronJob.Stop()
		fmt.Println("🛑 [CRON] Scheduler stopped.")
	}
}
