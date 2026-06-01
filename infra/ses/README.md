# ElkaTech SES infrastructure

Terraform that provisions everything ElkaTech needs to send transactional
email via AWS SES — domain + DKIM, custom MAIL FROM, SPF/DMARC, the two
SES templates the notification service references, and a least-privilege
IAM user the app uses to call SES.

## Files

```
infra/ses/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars.example
└── templates/
    ├── account_added.html
    ├── account_added.txt
    ├── request_claimed.html
    └── request_claimed.txt
```

## Prerequisites

- AWS account with SES access enabled in the chosen region.
- An apex domain you control (e.g. `elkatech.com`).
- Terraform >= 1.5.
- AWS credentials with permission to manage SES, Route53 (optional), and
  the target IAM user.

## Usage

1. Copy the example tfvars and fill it in. Never commit the real file:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Initialise and review the plan:

   ```bash
   terraform init
   terraform plan
   ```

3. Apply:

   ```bash
   terraform apply
   ```

4. Capture the IAM credentials (marked sensitive) and the SES sender email:

   ```bash
   terraform output -raw app_aws_access_key_id
   terraform output -raw app_aws_secret_access_key
   terraform output -raw ses_from_email
   ```

   Set these in Vercel as the app environment variables (see below). Treat
   the secret access key like any other production secret.

## DNS

- If you set `route53_zone_id`, Terraform creates every DNS record SES
  needs (verification TXT, three DKIM CNAMEs, MAIL FROM MX + SPF, apex
  SPF, and a DMARC TXT).
- If you leave `route53_zone_id` blank, Terraform exposes the required
  values as outputs (`ses_verification_token`, `ses_dkim_tokens`,
  `ses_mail_from_domain`). Add the records manually at whichever DNS
  provider hosts the zone.

## SES sandbox

New AWS accounts start in the **SES sandbox**: you can only send to
*verified* recipient addresses, and the daily send quota is tiny. Before
you can email real customers you must request production access from the
SES console (Account dashboard → "Request production access"). Approval
usually takes <24h.

## App environment variables

Set these in Vercel (and locally if you want to test SES from a dev
machine) — without them the notification service stays on the existing
SMTP/Mailpit path:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from terraform output app_aws_access_key_id>
AWS_SECRET_ACCESS_KEY=<from terraform output app_aws_secret_access_key>
SES_FROM_EMAIL=no-reply@elkatech.com
SES_ACCOUNT_ADDED_TEMPLATE=ElkaTechAccountAdded
SES_REQUEST_CLAIMED_TEMPLATE=ElkaTechRequestClaimed
```

## How the app uses this

The notification service polls the per-service outbox tables (already in
the platform) and, when SES is configured, calls SES `SendTemplatedEmail`
for these two events:

- `user.registered` with `invitation: true` → `ElkaTechAccountAdded` sent
  to the invited address.
- `request.assigned` → `ElkaTechRequestClaimed` sent to the customer
  *and* to the claiming engineer.

If SES env vars are missing, the same events fall through to the
existing SMTP/nodemailer flow used by Mailpit in local development.

## Testing

1. From the admin portal, **Invite team member**. Within ~3 s the
   notification poller should fire and SES should deliver the
   account-added email.
2. As an engineer/admin, **Claim** an unassigned request. SES should
   deliver the request-claimed email to both the customer and the
   claiming engineer.
3. Click Claim again on the same request. The backend returns 409 and no
   new outbox event is emitted — no duplicate email.

## Don't commit

`terraform.tfstate*`, `.terraform/`, and `terraform.tfvars` are ignored
via the repo-root `.gitignore`. Double-check before committing.
