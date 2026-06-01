output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity."
  value       = aws_ses_domain_identity.this.arn
}

output "ses_verification_token" {
  description = "TXT record value for _amazonses.<domain> domain verification. Add manually if not using Route53."
  value       = aws_ses_domain_identity.this.verification_token
}

output "ses_dkim_tokens" {
  description = "DKIM tokens — three CNAMEs of form <token>._domainkey.<domain> → <token>.dkim.amazonses.com. Add manually if not using Route53."
  value       = aws_ses_domain_dkim.this.dkim_tokens
}

output "ses_mail_from_domain" {
  description = "Custom MAIL FROM domain — needs an MX record (10 feedback-smtp.<region>.amazonses.com) and SPF."
  value       = aws_ses_domain_mail_from.this.mail_from_domain
}

output "ses_from_email" {
  description = "Verified sender email address. Apply this to SES_FROM_EMAIL in the app environment."
  value       = aws_ses_email_identity.from_email.email
}

output "ses_template_names" {
  description = "Names of the SES templates created."
  value = [
    aws_ses_template.account_added.name,
    aws_ses_template.request_claimed.name,
  ]
}

output "app_iam_user_arn" {
  description = "ARN of the IAM user the notification service uses."
  value       = aws_iam_user.app.arn
}

output "app_aws_access_key_id" {
  description = "Access key id for the application IAM user. Set as AWS_ACCESS_KEY_ID in the app environment."
  value       = aws_iam_access_key.app.id
  sensitive   = true
}

output "app_aws_secret_access_key" {
  description = "Secret access key for the application IAM user. Set as AWS_SECRET_ACCESS_KEY in the app environment. Treat as a secret — Terraform state will hold this value."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}
