package helpers

import (
	"strings"
)

// DefaultEmailLayout wraps body HTML inside a consistent branded email layout.
// Placeholders: {{shop_name}}, {{year}}
func DefaultEmailLayout(subject, shopName, accentColor, bodyContent string) string {
	if accentColor == "" {
		accentColor = "#e11d48"
	}
	if shopName == "" {
		shopName = "Warung Forza"
	}

	tpl := GetEmailTemplate("email_tpl_global_layout", DefaultTPL_GlobalLayout)
	vars := map[string]string{
		"subject":      subject,
		"shop_name":    shopName,
		"accent_color": accentColor,
		"body_content": bodyContent,
	}
	return ApplyEmailVars(tpl, vars)
}

// GetEmailTemplate returns the editable text of an email template from settings DB.
// key: one of the email_tpl_* keys. Returns the fallback if not set.
func GetEmailTemplate(key string, fallback string) string {
	val := GetSetting(key, "")
	if val != "" {
		return val
	}
	return fallback
}

// ApplyEmailVars replaces {{var}} style variables inside a template string.
func ApplyEmailVars(template string, vars map[string]string) string {
	result := template
	for k, v := range vars {
		result = strings.ReplaceAll(result, "{{"+k+"}}", v)
	}
	return result
}

// ─── DEFAULT TEMPLATE BODIES ─────────────────────────────────────────────────
// These are the fallback templates saved as const strings.
// Admin can override them via email_tpl_* settings in the DB.

const DefaultTPL_GlobalLayout = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><title>{{subject}}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <!-- HEADER -->
  <tr>
    <td style="background:{{accent_color}};padding:28px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">{{shop_name}}</h1>
    </td>
  </tr>
  <!-- BODY -->
  <tr>
    <td style="padding:36px 40px;color:#333;line-height:1.7;font-size:15px;">
      {{body_content}}
    </td>
  </tr>
  <!-- FOOTER -->
  <tr>
    <td style="background:#f8f8f8;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#aaa;">&copy; 2026 {{shop_name}}. All rights reserved.<br>
      This is an automated email, please do not reply.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`

const DefaultTPL_PaymentSuccess = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>{{message}}</p>
<table style="width:100%;background:#f8f9fa;border-left:5px solid {{accent_color}};padding:16px;border-radius:4px;margin:20px 0;border-collapse:collapse;">
  <tr><td style="color:#666;font-size:13px;padding:6px 0;">Invoice No.</td><td style="font-weight:bold;text-align:right;">{{invoice_number}}</td></tr>
  <tr><td style="color:#666;font-size:13px;padding:6px 0;">Amount Paid</td><td style="font-weight:bold;text-align:right;font-size:16px;">{{amount}}</td></tr>
  <tr><td style="color:#666;font-size:13px;padding:6px 0;">Status</td><td style="font-weight:bold;text-align:right;color:{{accent_color}};">PAID</td></tr>
</table>
<div style="background:#e3f2fd;padding:14px;border-radius:8px;border:1px solid #bbdefb;margin-bottom:20px;">
  <p style="margin:0;color:#0d47a1;font-size:14px;">ℹ️ <strong>Next Step:</strong><br>{{next_step}}</p>
</div>
<p>Thank you for trusting us with your collection.<br><strong>{{shop_name}} Team</strong></p>`

const DefaultTPL_POArrival = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Great news! Your Pre-Order for <strong>{{product_name}}</strong> has arrived at our warehouse.</p>
<div style="background:#f8f9fa;padding:16px;border-left:5px solid #007bff;border-radius:4px;margin:20px 0;">
  <p style="margin:0;"><strong>Balance Due:</strong> <span style="font-size:18px;color:#dc3545;">{{balance}}</span></p>
  <p style="margin:8px 0 0;"><strong>Due Date:</strong> {{due_date}}</p>
</div>
<p>Please proceed with the balance payment so we can ship your item.</p>
<p>Log in to your account and go to <strong>My Orders</strong> to make your payment.</p>
<p>Thank you,<br><strong>{{shop_name}} Team</strong></p>`

const DefaultTPL_POArrivalFull = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Your Pre-Order item <strong>{{product_name}}</strong> has arrived at our warehouse!</p>
<p>Since your order is already <strong>fully paid</strong>, we are now preparing the item for shipment.</p>
<p>You will receive a tracking number once the courier picks up your package.</p>
<p>Thank you,<br><strong>{{shop_name}} Team</strong></p>`

const DefaultTPL_Refund = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Your refund for order <strong>#{{order_number}}</strong> has been successfully processed.</p>
<div style="background:#e8f5e9;padding:16px;border-left:4px solid #4caf50;border-radius:4px;margin:20px 0;">
  <p style="margin:0;"><strong>Refund Amount:</strong> {{amount}}</p>
  <p style="margin:8px 0 0;"><strong>Type:</strong> {{refund_type}}</p>
  <p style="margin:8px 0 0;"><strong>Reason:</strong> {{reason}}</p>
</div>
<p>Funds usually return to the original payment method within 3–5 business days.</p>
<p>Thank you,<br><strong>{{shop_name}} Team</strong></p>`

const DefaultTPL_WelcomeOTP = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>Welcome! Please verify your email address using the code below:</p>
<div style="text-align:center;margin:30px 0;">
  <span style="display:inline-block;background:#111;color:#fff;font-size:36px;font-weight:900;letter-spacing:12px;padding:16px 32px;border-radius:8px;">{{otp_code}}</span>
</div>
<p style="color:#888;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
<p>Thank you,<br><strong>{{shop_name}} Team</strong></p>`

const DefaultTPL_ResetPassword = `<p>Hi <strong>{{customer_name}}</strong>,</p>
<p>We received a request to reset your password. Click the button below:</p>
<div style="text-align:center;margin:30px 0;">
  <a href="{{reset_link}}" style="display:inline-block;background:{{accent_color}};color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password</a>
</div>
<p style="color:#888;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
<p>Thank you,<br><strong>{{shop_name}} Team</strong></p>`
