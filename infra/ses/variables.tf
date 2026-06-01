variable "aws_region" {
  description = "AWS region for SES (must be a region where SES is enabled for your account)."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Apex domain to verify in SES, e.g. \"elkatech.com\"."
  type        = string
}

variable "from_email" {
  description = "Sender email address used by the notification service, e.g. \"no-reply@elkatech.com\". Must be on domain_name."
  type        = string
  default     = "no-reply@elkatech.com"
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted-zone id. Leave blank to manage DNS manually — Terraform will output the records to add."
  type        = string
  default     = ""
}

variable "mail_from_subdomain" {
  description = "Subdomain used for the custom MAIL FROM domain (becomes <subdomain>.<domain_name>)."
  type        = string
  default     = "bounce"
}

variable "app_iam_user_name" {
  description = "IAM user the application uses to call SES."
  type        = string
  default     = "elkatech-notification-ses"
}
