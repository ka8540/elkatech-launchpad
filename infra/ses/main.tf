/**
 * AWS SES infrastructure for ElkaTech transactional email.
 *
 * Provisions:
 *   - SES domain identity + DKIM keys
 *   - SES verified email identity for the sender (no-reply@…)
 *   - Custom MAIL FROM subdomain
 *   - Optional Route53 DNS records (verification, DKIM, SPF, DMARC, MX)
 *   - SES email templates the notification service references
 *   - Least-privilege IAM user + access key for the app to call SES
 *
 * Backend state is intentionally not configured here — use a backend.tf
 * override in your own environment if you want S3/DynamoDB locking.
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── SES domain identity + DKIM ──────────────────────────────────────────────

resource "aws_ses_domain_identity" "this" {
  domain = var.domain_name
}

resource "aws_ses_domain_dkim" "this" {
  domain = aws_ses_domain_identity.this.domain
}

# ─── Custom MAIL FROM domain (e.g. bounce.elkatech.com) ─────────────────────

resource "aws_ses_domain_mail_from" "this" {
  domain                 = aws_ses_domain_identity.this.domain
  mail_from_domain       = "${var.mail_from_subdomain}.${var.domain_name}"
  behavior_on_mx_failure = "UseDefaultValue"
}

# ─── Verified sender email identity (e.g. no-reply@elkatech.com) ────────────

resource "aws_ses_email_identity" "from_email" {
  email = var.from_email
}

# ─── Optional Route53 records ───────────────────────────────────────────────
# If route53_zone_id is provided, Terraform creates every DNS record SES
# needs. Otherwise the records are exposed as outputs so the operator can
# add them manually at whatever DNS provider hosts the zone.

locals {
  manage_dns = var.route53_zone_id != ""
}

# Domain verification TXT record.
resource "aws_route53_record" "ses_verification" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_amazonses.${aws_ses_domain_identity.this.domain}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.this.verification_token]
}

# DKIM CNAME records (three of them).
resource "aws_route53_record" "ses_dkim" {
  count   = local.manage_dns ? 3 : 0
  zone_id = var.route53_zone_id
  name    = "${aws_ses_domain_dkim.this.dkim_tokens[count.index]}._domainkey.${aws_ses_domain_identity.this.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.this.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# MAIL FROM MX record (feedback domain points at the regional bounce endpoint).
resource "aws_route53_record" "mail_from_mx" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

# MAIL FROM SPF record.
resource "aws_route53_record" "mail_from_spf" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_mail_from.this.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

# Domain-level SPF (in case the apex isn't already covered elsewhere).
resource "aws_route53_record" "domain_spf" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = aws_ses_domain_identity.this.domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com -all"]
}

# DMARC policy. quarantine is a safe starting point; tighten to reject
# once you've confirmed deliverability looks good.
resource "aws_route53_record" "dmarc" {
  count   = local.manage_dns ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "_dmarc.${aws_ses_domain_identity.this.domain}"
  type    = "TXT"
  ttl     = 600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${var.domain_name}; ruf=mailto:dmarc-reports@${var.domain_name}; fo=1",
  ]
}

# ─── SES email templates ────────────────────────────────────────────────────

resource "aws_ses_template" "account_added" {
  name    = "ElkaTechAccountAdded"
  subject = "Your ElkaTech service portal account has been added"
  html    = file("${path.module}/templates/account_added.html")
  text    = file("${path.module}/templates/account_added.txt")
}

resource "aws_ses_template" "request_claimed" {
  name    = "ElkaTechRequestClaimed"
  subject = "Service request picked up: {{requestNumber}}"
  html    = file("${path.module}/templates/request_claimed.html")
  text    = file("${path.module}/templates/request_claimed.txt")
}

# ─── IAM user for the application (least-privilege SES send) ────────────────

resource "aws_iam_user" "app" {
  name = var.app_iam_user_name
  tags = {
    Application = "elkatech"
    Purpose     = "ses-send"
  }
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}

data "aws_caller_identity" "current" {}

# Scope to SES send actions for the verified identities only. We intentionally
# do not grant ses:* or unrelated actions.
data "aws_iam_policy_document" "ses_send" {
  statement {
    sid = "AllowSesSendForElkaTechIdentities"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
      "ses:SendTemplatedEmail",
    ]
    resources = [
      "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.domain_name}",
      "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.from_email}",
      "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:template/ElkaTechAccountAdded",
      "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:template/ElkaTechRequestClaimed",
    ]
  }
}

resource "aws_iam_user_policy" "app_ses" {
  name   = "${var.app_iam_user_name}-ses-send"
  user   = aws_iam_user.app.name
  policy = data.aws_iam_policy_document.ses_send.json
}
