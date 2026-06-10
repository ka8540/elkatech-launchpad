# ElkaTech Launchpad — Service Cost Analysis

A complete inventory of every external service, platform, infrastructure
provider, API, database, email provider, hosting provider, authentication
provider, and tooling dependency that this repository currently uses or
references.

Sources used to build this document:

- `README.md`
- Root and workspace `package.json` files
- `.env.example`
- `docker-compose.yml`
- `vercel.json`
- `packages/config/src/` (env schema, db, redis, firebase helpers)
- `services/*/src/` (where each service actually calls each provider)
- `infra/ses/main.tf` (AWS SES Terraform)
- Conversation history with the project owner

Prices reflect **publicly listed pricing as of June 2026**; some
providers change pricing without notice, so re-check before committing
to a tier. Where the repo doesn't pin a tier, I state the assumption
explicitly.

---

## 1. Service-by-service breakdown

| Service | Where it's used in this project | Required or Optional | Free tier? | Est. Monthly Cost | Est. Yearly Cost | Pricing notes | Production risk / limitation |
|---|---|---|---|---|---|---|---|
| **Vercel — Hosting / Serverless Functions** | Hosts the React/Vite frontend and the five backend service bundles in `api/*.mjs` (gateway, auth, catalog, service-desk, notification). Routing rules live in [`vercel.json`](../vercel.json). | Required (production) | Yes (Hobby) | $0 (Hobby) → ~$20 (Pro, 1 seat) | $0 → ~$240 | Hobby: 100 GB bandwidth, 100 GB-h functions, 6 000 fn invocations/day soft cap. Pro: $20/seat/month + usage. Cron, team features, longer fn timeouts, and **commercial use** require Pro. | The current notification flow trips a function invocation per `emitOutbox`; high traffic can burn Hobby invocation quota fast. Hobby has no support SLA. |
| **Neon — PostgreSQL (managed)** | Production database for `auth.*`, `service_desk.*`, `notification.*`, `catalog.*` schemas. Connection string is in `DATABASE_URL` (currently pooler URL). Detected in source via `packages/config/src/db.ts` pgbouncer detection. | Required (production) | Yes (Free Tier) | $0 (Free) → $19 (Launch) | $0 → $228 | Free tier (June 2026): 0.5 GB storage, 1 project, 10 branches, auto-suspend after 5 min idle. Launch tier $19/mo: 10 GB, 100 branches, no auto-suspend. Storage-overage and compute-hour overage apply on paid tiers. | Auto-suspend on the free tier causes a cold-start spike on first request after idle. Free tier is fine for dev + low-traffic; **upgrade before going live** if you need 24/7 warm DB and >0.5 GB data. |
| **PostgreSQL (local, Docker)** | Local dev DB defined in [`docker-compose.yml`](../docker-compose.yml) (`postgres:16-alpine`). | Required (dev only) | N/A (self-hosted) | $0 | $0 | Free open-source software running on the developer's machine. | Not used in production. |
| **Mailpit (local, Docker)** | Local SMTP capture for dev email testing, also in `docker-compose.yml` (`axllent/mailpit:latest`, ports 1025/8025). | Optional (dev only) | N/A | $0 | $0 | Free open-source. | Not used in production. |
| **AWS SES — Transactional Email** | Used by `services/notification` for the two SES templates `ElkaTechAccountAdded` and `ElkaTechRequestClaimed`. AWS SDK: `@aws-sdk/client-ses ^3.1057.0` in `services/notification/package.json`. Infra provisioned via [`infra/ses/main.tf`](../infra/ses/main.tf). | Optional (notification service uses SMTP fallback when SES env is unset) | Yes (12-month) | $0 → ~$0.10 / 1 000 emails | $0 → varies | New AWS accounts: 62 000 outbound emails/month from an EC2 instance free for 12 months. Outside that, $0.10 per 1 000 emails + $0.12/GB attachments. **Receiving and bounces are extra.** | **SES sandbox restriction**: until production access is granted, you can only send to verified recipients. Approval typically <24h via SES console. |
| **AWS IAM (root + ses-send IAM user)** | The Terraform creates a dedicated `elkatech-notification-ses` IAM user with a least-privilege policy. Root creds were used once to bootstrap (per conversation history). | Required if using SES | Yes | $0 | $0 | IAM users and access keys are free; there's no per-user fee. Costs only kick in via the services those keys call (SES). | Root keys should be deleted; only the IAM user keys belong in Vercel. |
| **AWS Route 53 (optional, mentioned in Terraform)** | Optional path in `infra/ses/main.tf` — if `route53_zone_id` is set, DNS records are auto-created. Currently set to `""` in `terraform.tfvars.example`. | Optional | N/A | $0.50 per hosted zone/month + per-query | $6 per zone + query | Not active in this project unless the operator opts in. | Adds a small fixed cost per zone if used. |
| **SMTP relay (Resend assumed)** | `.env.example` defaults to `SMTP_HOST=smtp.resend.com`. The notification service uses `nodemailer` for all events that don't have SES templates. | Optional fallback (set `SMTP_USER`/`SMTP_PASS`) | Yes | $0 (Resend free) → $20 (Pro) | $0 → $240 | Resend Free: 3 000 emails/month, 100/day. Pro: 50 000/mo at $20. Other relays (SendGrid, Postmark, Mailgun, Brevo) have comparable free tiers and similar paid pricing. | If SMTP creds aren't set, every non-SES event fails with `530 Auth Required` (observed in `notification.deliveries`). |
| **Firebase Authentication (frontend)** | `apps/web/src/lib/firebase.ts` — email/password + Google sign-in via `firebase ^10.14.1`. | Required (production sign-in) | Yes | $0 (Spark) | $0 | Spark plan: unlimited email/password and Google sign-ins. Blaze plan only needed for phone-SMS auth, custom domains, or Identity Platform features. | Spark plan limits aren't a concern for sign-in volumes typical of a service portal. Phone-SMS would force Blaze (pay-as-you-go). |
| **Firebase Admin SDK (backend)** | `services/auth` uses `firebase-admin ^12.7.0` to verify ID tokens server-side. Credentials in `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`. | Required if Firebase Auth is on | Yes | $0 | $0 | Admin SDK token verification is part of Firebase Auth — no extra cost on Spark. | Same as Firebase Auth above. |
| **Google Cloud — OAuth (Web Client)** | Legacy `/api/auth/google/start` + `callback` flow in `services/gateway` uses `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI`. Also implicit through Firebase Google sign-in. | Optional (redundant with Firebase Google sign-in) | Yes | $0 | $0 | OAuth client registration is free. | OAuth quota is high enough to never matter for this scale. |
| **Redis / KV (Upstash compatible)** | `packages/config/src/redis.ts` exposes `getRedis()`. Only used by `services/catalog/src/index.ts` (3 call sites — likely caching catalog reads). Activated when `KV_URL` or `REDIS_URL` is set. | **Currently optional and unused in production** — `.env.example` has `KV_URL=` blank | Yes (Upstash) | $0 (Upstash Free) → $10 (Pay-as-you-go) | $0 → varies | Upstash Free: 10 000 commands/day, 256 MB. Vercel KV is Upstash under the hood — Vercel Hobby includes a small free quota; Pro $1/GB-month + commands. | The cache is purely an optimisation for catalog reads. Without it the catalog service hits Postgres directly — fine at low traffic. **Don't enable it until you need it.** |
| **Vercel KV (alternative to Upstash)** | Compatible with the same `KV_URL` env. Not currently provisioned. | Optional | Yes | $0 (Hobby quota) → $0.30/100k requests + storage | varies | Marketplace pricing — see Vercel's Storage tab if you ever turn it on. | Same conclusion as Upstash: not needed yet. |
| **Domain registration (`elkatech.in`)** | Mentioned by project owner. Used as the SES domain identity once `terraform apply` is run with `domain_name = "elkatech.in"`. | Required for branded email + production app domain | N/A | ~$0.50–$2/month (~$8–$24/year for `.in`) | $8–$24 | One-time renewal fee — exact price depends on registrar (GoDaddy, Namecheap, Cloudflare Registrar, etc.). Cloudflare Registrar is at-cost (~$11/yr for `.in`). | Required if you want `no-reply@elkatech.in` instead of a Gmail sender. |
| **GitHub — Source code + CI trigger** | Origin remote is GitHub (`git@github.com:ka8540/elkatech-launchpad.git`). Vercel auto-deploys on push to `main`. | Required | Yes | $0 (private repo, single user) | $0 | GitHub Free: unlimited private repos and unlimited collaborators for personal accounts. CI minutes via Vercel deploys, not GitHub Actions. | None for current scale. |
| **npm registry** | All dependency installs in every workspace. Lockfile committed at `package-lock.json`. | Required (dev) | Yes | $0 | $0 | Public registry is free. | None. |
| **HashiCorp / Terraform CLI** | `infra/ses/` is Terraform-managed. CLI runs locally. | Optional tooling | N/A | $0 | $0 | Free open-source CLI. Terraform Cloud / Enterprise would be paid; not used here. | None. |
| **AWS CLI** | Used to verify SES identity status during setup. | Optional tooling | N/A | $0 | $0 | Free. | None. |
| **Docker Desktop / Engine** | Local Postgres + Mailpit containers. | Required (local dev) | Yes (personal use) | $0 (personal) → $9–$24/seat (business) | $0 → varies | Docker Desktop is free for individuals + small businesses (<250 employees, <$10M revenue). Otherwise commercial license required. | Pay attention only if the company exceeds the small-business threshold. |
| **Node.js 22 / nvm** | Runtime. Pinned in `.node-version` / via nvm. | Required | Yes | $0 | $0 | Free. | None. |
| **TypeScript, Vite, Tailwind, ESLint, Vitest, etc.** | All dev tooling — open-source. | Required (dev) | Yes | $0 | $0 | Free open-source. | None. |
| **AWS SDK clients (besides SES)** | None currently — only `@aws-sdk/client-ses` is installed. | — | — | $0 | $0 | No other AWS services are wired up. | — |
| **Stripe / payment processor** | Not present in the repo. | — | — | $0 | $0 | Not used. | None. |
| **Sentry / observability** | Not present in the repo. | — | — | $0 | $0 | Not used. | The project has no production error tracking — worth adding before serious launch (Sentry has a free hobby tier). |

---

## 2. Pricing assumptions

- **Vercel Hobby is fine for a personal/portfolio site** but Vercel's
  terms of service prohibit commercial use on the Hobby tier. If
  ElkaTech is being used to take real customers, **Pro is required**
  ($20/month minimum).
- **Neon Free is fine until 0.5 GB or until 24/7 uptime matters.** A
  small-prod customer base typically lives under 0.5 GB for months;
  upgrade trigger is usually "I can't tolerate the 5-minute cold start"
  rather than storage.
- **AWS SES** is treated as free for year 1 (62k emails/month free from
  EC2-integrated workloads). Outside the free window, the project's
  current volume — 2 transactional emails per significant event —
  costs essentially nothing ($0.10 per 1 000 emails).
- **Firebase Auth** stays on Spark indefinitely unless you add phone-SMS
  auth — which this project doesn't.
- **Upstash / Vercel KV** — assumed *not* provisioned. The catalog
  service degrades to direct DB reads when `KV_URL` is empty.

---

## 3. Cost summary

### Dev / local environment

Every dev-only service (local Postgres in Docker, Mailpit, Docker
Desktop on personal use, Node/npm/Vite/Tailwind, Terraform CLI, AWS CLI,
GitHub Free, Firebase Spark) is **$0/month**.

**Total monthly cost for local development: $0.**

### Small production launch (low traffic, single admin, <100 active customers)

Assuming:
- Personal/portfolio scope (Vercel Hobby — *only legal if non-commercial*),
- Neon Free (<0.5 GB data, OK with cold starts),
- SES in production access (out of sandbox) sending <5 000 emails/mo,
- Firebase Spark,
- No Redis,
- Domain renewed.

| Item | Monthly | Yearly |
|---|---|---|
| Vercel Hobby | $0 | $0 |
| Neon Free | $0 | $0 |
| AWS SES (~5 000 emails) | ~$0.50 | ~$6 |
| AWS Route 53 (not used) | $0 | $0 |
| Firebase (Spark) | $0 | $0 |
| Domain (`elkatech.in`) | ~$1 (amortised) | ~$11 |
| GitHub Free | $0 | $0 |
| **Total** | **~$1.50** | **~$17** |

If you flip Vercel to Pro (required for commercial use, recommended
for production):

| Item | Monthly | Yearly |
|---|---|---|
| Vercel Pro (1 seat) | $20 | $240 |
| Neon Launch (10 GB, no idle) | $19 | $228 |
| AWS SES (~5 000 emails) | ~$0.50 | ~$6 |
| Domain | ~$1 | ~$11 |
| Everything else | $0 | $0 |
| **Total** | **~$40.50** | **~$485** |

### Currently free services

Vercel (Hobby), Neon (Free), AWS SES (within first-year free quota),
Firebase Auth + Admin (Spark), Google OAuth, GitHub Free, npm registry,
Terraform CLI, AWS CLI, Docker Desktop (personal use), Node/Vite/etc,
Mailpit (local), local Postgres.

### Services that may become paid first as usage grows

1. **Neon** — first to flip when DB > 0.5 GB or when idle cold-starts
   become unacceptable.
2. **Vercel** — switches to Pro the moment ElkaTech is used commercially
   (Vercel ToS), or when function invocation / bandwidth quota is hit.
3. **AWS SES** — after the first 12-month free window, or sooner if
   email volume exceeds 62 000/month.
4. **Domain renewal** — annual fee due regardless of traffic.

### Services that need billing/card on file before production

- **AWS** — even though SES is essentially free now, AWS won't grant
  production access without a valid payment method on the root account.
- **Vercel** — Pro tier requires a card. Hobby doesn't.
- **Neon** — Launch tier requires a card. Free doesn't.
- **Domain registrar** — annual renewal must be paid.

---

## 4. Brutally clear recommendations

### Safe to keep free for now

- **Firebase Auth (Spark)** — won't outgrow it for this product.
- **GitHub Free** — fine forever for a single-developer private repo.
- **Local Postgres + Mailpit** — these are dev-only; not relevant in prod.
- **Upstash/Vercel KV** — don't enable it. The catalog cache is an
  optimisation, not a requirement. Adding it now is premature.
- **Google OAuth** — already free; only the legacy Google OAuth flow
  uses it, and Firebase Google sign-in covers the same case.
- **Terraform / AWS CLI / Node / Docker** — all free tooling.

### Must be configured properly before production

- **Vercel** — **must upgrade to Pro** if this is going to be used
  commercially. Hobby is for non-commercial use only.
- **AWS SES production access** — sandbox is a blocker. Submit the
  production-access request from the SES Account Dashboard; ~24h.
- **Neon** — confirm whether you can tolerate 5-minute idle cold starts
  on Free. If not, upgrade to Launch ($19/mo).
- **SMTP fallback creds** — either commit fully to SES *for every
  event* (add more templates) or set `SMTP_USER`/`SMTP_PASS` in Vercel
  pointing at Resend, so non-SES events stop failing with
  `530 Auth Required`.
- **Custom domain** — point a real DNS-controlled domain at Vercel and
  use it as `APP_BASE_URL`. `elkatech-final.vercel.app` should not be
  the production URL.
- **Vercel env vars** — every value in `.env.example` that's actually
  used in production needs to be set in Vercel's env, including
  `INTERNAL_SERVICE_TOKEN` (rotate from the dev default).
- **Database backups** — Neon has PITR on paid tiers; Free has no
  point-in-time-restore. Decide what data loss you can tolerate.

### What could unexpectedly cost money

- **AWS root key compromise** — if root keys leak, an attacker can spin
  up EC2 and you owe AWS the bill. Already flagged in our conversation;
  rotate immediately if not done.
- **Vercel function invocation overage** — the inline
  `triggerNotificationPoll()` fire-and-forget pattern doubles the
  invocation count per emitted event. At low traffic it's free; at
  scale, watch it.
- **Neon storage overage** — if `notification.deliveries` or
  `service_desk.request_history` grows unbounded, you'll cross the 0.5
  GB free threshold faster than expected. Add a retention/archive
  policy.
- **AWS SES bounces and complaints** — sending to invalid addresses
  silently incurs no fee, but high bounce rate gets your sending
  reputation downgraded (effectively breaking the service).
- **Docker Desktop license** — if the company hits the commercial-use
  threshold, the personal-use license no longer applies.

### Unnecessary or optional right now

- **Redis / Upstash / Vercel KV** — turned off, and there's no traffic
  to justify caching catalog reads yet. Leave `KV_URL` blank.
- **AWS Route 53** — only needed if you want Terraform to manage DNS for
  `elkatech.in`. Adding records by hand at your existing registrar is
  free.
- **Google OAuth direct flow** (`/api/auth/google/start`) — redundant
  with Firebase Google sign-in. Could be removed to reduce surface
  area, but it isn't costing anything.
- **Sentry / Datadog** — not present in repo. Worth considering
  *eventually* but not needed for launch.

---

## 5. Action items before production

- [ ] **Database plan**: confirm whether Neon Free's auto-suspend + 0.5
      GB cap is acceptable. If not, upgrade to Neon Launch ($19/mo).
- [ ] **SMTP provider + limits**: either (a) finish migrating every
      event to SES templates and request SES production access, or (b)
      set `SMTP_USER`/`SMTP_PASS` in Vercel pointing at Resend (or
      similar) so SMTP fallback stops failing. Confirm the chosen
      provider's monthly cap matches expected email volume.
- [ ] **Firebase Auth limits**: confirm staying on Spark plan; flag any
      future feature that would require Blaze (phone-SMS auth, custom
      domain, Identity Platform, etc.).
- [ ] **Vercel plan & limits**: decide Hobby vs Pro based on whether
      use is commercial. If commercial → Pro (required by Vercel's
      ToS). Either way, verify you're under bandwidth + invocation
      quota for the chosen tier.
- [ ] **Redis/KV**: confirm `KV_URL` is intentionally blank in Vercel
      production envs. Don't provision Upstash or Vercel KV until
      catalog read latency is actually a problem.
- [ ] **Vercel env vars**: verify every required production env is set
      with a non-default value. In particular:
      `INTERNAL_SERVICE_TOKEN` (rotate from `dev-internal-token`),
      `BOOTSTRAP_ADMIN_PASSWORD`, `DATABASE_URL`, Firebase admin keys,
      AWS SES creds, SMTP creds (if used), `APP_BASE_URL`.
- [ ] **No secrets committed**: confirm `.env`, `terraform.tfvars`,
      `*.tfstate`, `firebase-service-account*.json` are all gitignored
      (they are — verified). Spot-check by running
      `git ls-files | grep -E "\.env$|tfstate|tfvars$|service-account.*\.json"` —
      output should be empty (only `.env.example` and
      `terraform.tfvars.example` should ever be tracked).
- [ ] **AWS root keys**: confirm root access keys (the ones pasted in
      chat earlier) have been **deleted** in IAM, not just made
      inactive. The IAM user `elkatech-notification-ses` is the only
      account that should hold active access keys.
- [ ] **SES production access**: submit the request from the SES
      Account Dashboard. Until approved, sandbox blocks every
      unverified recipient.
- [ ] **Custom domain**: configure `elkatech.in` (or whatever the
      production domain is) in Vercel → Domains, update
      `APP_BASE_URL`, redeploy.
- [ ] **Data retention**: decide a policy for `notification.deliveries`
      and `service_desk.request_history` so DB storage doesn't grow
      unbounded.
- [ ] **Billing alerts**: set up AWS Budgets ($5 threshold), Vercel
      usage alerts, and Neon usage alerts so a surprise bill is
      impossible.

---

## Appendix — quick service-vs-cost glance

| Service | Production cost (small launch, with Vercel Pro path) |
|---|---|
| Vercel Pro | $20/mo |
| Neon Launch (if needed) | $19/mo |
| AWS SES (~5k emails) | <$1/mo |
| Domain | <$1/mo |
| Firebase | $0 |
| GitHub | $0 |
| Local Docker / Mailpit / dev tooling | $0 |
| **Total** | **~$40–$41/mo (~$485/yr)** |

If you accept Hobby Vercel (non-commercial only) and skip the Neon
upgrade, the same setup runs **~$1.50/mo / ~$17/yr**.
