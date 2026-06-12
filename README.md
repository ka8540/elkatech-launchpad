# ElkaTech Launchpad

ElkaTech Launchpad is a monorepo for ElkaTech's industrial printing and signage machinery web presence plus its authenticated service platform. The public site presents the ElkaTech brand, product-category pages, responsive landing sections, light/dark theming, and polished motion. The protected portal adds customer authentication, service-request workflows, role-aware staff/owner/admin tools, customer profile onboarding, customer-machine management, request attachments, and email notifications.

## Overview

This repository contains:

- A React/Vite marketing and product-catalog frontend.
- A protected service portal rendered by the same frontend, including customer, engineer, support, owner, and admin roles.
- A Fastify gateway plus four internal services for auth, catalog, service desk, and notifications.
- Shared TypeScript/Zod contracts and shared backend configuration helpers.
- Local development infrastructure for PostgreSQL and Mailpit.

## Features

- Responsive public landing page with hero, about, work, brands, infrastructure, why-us, contact, and footer sections.
- Product/category pages for solvent printers, UV printers, laser cutting machines, lamination machines, desktop UV printers, inkjet printers, and flatbed UV printers.
- Product image carousels, specification tables, brochure links, and service-request entry points.
- Dark/light theme support with persisted preference and theme-aware navbar variants.
- Stable reveal animations designed to avoid refresh-time layout shift.
- Protected customer portal for completing a service profile, choosing an assigned machine, creating service requests, attaching evidence, and tracking follow-up.
- Engineer queue, support operations, owner controls, and admin user-invitation views.
- Cookie-based sessions, CSRF protection, RBAC checks, and email notifications.
- Firebase Authentication (email/password and Google) bridged to existing cookie sessions.
- Admin approval workflow: new customer accounts land in `pending_approval` and cannot create service requests until an admin approves them.
- Admin dashboard with approval counts, request load, and live service heartbeats.
- Owner/support role model with shared permission helpers used by both gateway guards and frontend UI.
- Customer Activity and Support dashboards for operational staff.
- Admin/owner customer-machine inventory linked to customer accounts and request creation.
- Cloudflare R2 direct uploads for request photo/video attachments, with graceful `501` fallback when storage is not configured.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| Styling | Tailwind CSS, CSS custom properties, shadcn/Radix UI primitives |
| Motion | Framer Motion for controlled UI animation |
| Backend | Fastify services, Zod validation |
| Identity | Firebase Authentication (email/password + Google), Firebase Admin SDK on the server |
| Data | PostgreSQL (local Docker or hosted via Neon), optional Redis-compatible cache, Cloudflare R2 for request attachments |
| Email | Nodemailer, Mailpit for local testing |
| Tooling | npm workspaces, TypeScript, Vitest, ESLint |
| Deployment config | Vercel configuration files and prebuilt serverless handlers |

Node version is pinned via `.node-version` (Node 22 LTS). Vercel uses this automatically. Locally, run `nvm use` or ensure Node 22+ is active.

The repo contains both `package-lock.json` and `bun.lockb`. The documented workflow uses npm because the root workspace scripts and lockfile are npm-based.

## Repository Structure

```text
elkatech-launchpad/
|-- apps/
|   `-- web/
|       |-- public/                 # Product images and static assets
|       |-- src/
|       |   |-- components/         # Landing, catalog, shell, and UI components
|       |   |-- hooks/              # Session and shared frontend hooks
|       |   |-- lib/                # API and utility helpers
|       |   `-- pages/              # Auth and service-portal pages
|       |-- package.json
|       |-- tailwind.config.ts
|       `-- vite.config.ts
|-- services/
|   |-- auth/                       # Accounts, sessions, invitations, tokens
|   |-- catalog/                    # Catalog read APIs and optional cache
|   |-- gateway/                    # Public BFF/API boundary
|   |-- notification/               # Outbox polling and email delivery
|   `-- service-desk/                # Requests, messages, assignment, status workflow
|-- packages/
|   |-- config/                     # Env, DB, Redis, HTTP, internal-auth helpers
|   `-- contracts/                  # Shared schemas, types, and catalog seed data
|-- scripts/
|   |-- db-migrate.ts
|   |-- db-seed.ts
|   |-- bootstrap-admin.ts
|   `-- bundle-api.cjs
|-- api/                            # Generated serverless handlers used by root Vercel rewrites
|-- docker-compose.yml
|-- vercel.json
|-- package.json
`-- README.md
```

## Architecture

The browser runs a client-side React application. Public `/api/*` requests go to the gateway, which owns browser-facing concerns such as session cookies, CSRF checks, rate limiting, and role enforcement. The gateway then calls internal services with a shared `x-internal-token`. Auth and service-desk actions write outbox events that the notification service polls and converts into email deliveries.

```mermaid
flowchart TD
    Browser[User Browser] --> Web[apps/web React app]
    Web --> Router[React Router]
    Router --> Landing[Landing and category pages]
    Router --> Portal[Protected service portal]
    Web --> StaticAssets[public images and assets]
    Web --> FirebaseWeb[Firebase Auth Web SDK]
    Web --> Gateway[services/gateway public API]

    Gateway --> Auth[services/auth]
    Gateway --> Catalog[services/catalog]
    Gateway --> Desk[services/service-desk]
    Auth --> FirebaseAdmin[Firebase Admin SDK]
    Desk --> Auth
    Desk --> Catalog
    Desk --> R2[(Cloudflare R2 attachments)]

    Auth --> AuthSchema[(Postgres auth schema)]
    Catalog --> CatalogSchema[(Postgres catalog schema)]
    Desk --> DeskSchema[(Postgres service_desk schema)]
    Auth --> AuthOutbox[(auth.outbox)]
    Desk --> DeskOutbox[(service_desk.outbox)]
    Catalog -. optional cache .-> Redis[(Redis-compatible cache)]

    Notification[services/notification] --> AuthOutbox
    Notification --> DeskOutbox
    Notification --> NotificationSchema[(Postgres notification schema)]
    Notification --> SMTP[SMTP / Mailpit]
```

### Architectural notes

- `apps/web` uses `BrowserRouter`, client-side routes, and a single `ThemeProvider`.
- The public product category pages are rendered from local component data.
- The service portal catalog API is backed by PostgreSQL and seeded from `packages/contracts/src/index.ts`.
- Customer service profiles are stored on `auth.users`; machine ownership and request attachments live in the `service_desk` schema.
- Role permissions live in shared contracts and are imported by the gateway, service desk, and web app so server enforcement and UI visibility stay aligned.
- Static images live under `apps/web/public/images`.
- Request attachment bytes upload directly from the browser to Cloudflare R2 through presigned URLs; the database stores metadata only.
- Local development uses separate HTTP services on ports `4000` through `4004`; Vite proxies `/api` to the gateway on port `4000`.
- Root `vercel.json` rewrites API paths to bundled handlers in `api/*.mjs` and SPA routes to `index.html`.

## Portal roles and permissions

The platform has five portal roles. Permission rules live in one place —
`packages/contracts/src/index.ts` (`canDeleteUsers`, `canApproveUsers`,
`canSuspendUsers`, `canChangeRoles`, `canAssignRequests`,
`canCreateRequestForCustomer`, `canViewCustomerActivity`, `assignableRolesFor`,
`canManageTargetUser`, …). The **gateway** calls these helpers to enforce every
sensitive endpoint (returning `403`), and the **web app** calls the same helpers
to gate UI, so a hidden control always corresponds to a backend rejection.
Permissions are never enforced in React alone.

| Capability | Admin | Owner | Support | Engineer | Customer |
| --- | --- | --- | --- | --- | --- |
| Permanently delete / remove user data | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve / reject users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Suspend / reactivate users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ (any) | ✅ (not admin) | ❌ | ❌ | ❌ |
| View Users management page | ✅ | ✅ | ❌ | ❌ | ❌ |
| Customer Activity dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Support dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign / reassign requests | ✅ | ✅ | ✅ | claim only | ❌ |
| Create request on behalf of a customer | ✅ | ✅ | ✅ | ❌ | own only |
| Customer machine management | ✅ | ✅ | view only | ❌ | ❌ |
| System Admin panel (health, danger zone) | ✅ | ❌ | ❌ | ❌ | ❌ |

- **Admin** — highest system role. Full access, including permanent deletion of
  user/customer data and the system Admin panel.
- **Owner** — business operations. Can approve/suspend users, change roles
  (anything except admin — and never on an admin account), assign requests,
  create requests for customers, and view all customer activity. **Cannot
  permanently delete user/customer data** and has no access to the system Admin
  danger zone. Owner hits a `403` ("Only admins can permanently delete user
  data.") if the delete API is called directly.
- **Support** — service operations. Views customer activity, creates requests
  on behalf of customers, and assigns/reassigns requests to engineers. Cannot
  approve, suspend, delete, or change roles, and never sees user-management
  controls.
- **Engineer** — handles assigned requests (unchanged); claims queue items.
- **Customer** — creates and tracks their own requests (unchanged).

Two dashboards serve the operational roles (admin/owner/support):
`/app/customer-activity` (Customer Activity) and `/app/support` (Support
operations + assignment). The database role check is relaxed by migration
`008_owner_support_roles.sql`; existing users are never changed.

> This feature branch was created from `dev`, and its PR targets `dev`. Never
> branch from or push directly to `main`.

## Application Flow

1. The browser loads `apps/web`, which mounts `ThemeProvider`, routing, toast providers, and scroll handling.
2. Public users browse the landing page and static product-category routes.
3. Portal users authenticate with Firebase or legacy auth through the gateway, which sets the session and CSRF cookies.
4. Protected routes resolve the session through `/api/auth/me`, including role, approval, and profile-completion state.
5. Customers complete their service profile before creating requests, then select one of their active assigned machines.
6. Support, owner, and admin users can create requests on behalf of customers, view customer activity, and assign engineers.
7. Engineers and admins manage workflow status; support/owner/admin users manage assignment.
8. Request attachments upload directly to R2 through presigned URLs, then persist metadata in the service-desk schema.
9. Auth, machine, and request events enter outbox tables; the notification service polls those tables and sends emails.

## Routing / Pages

### Public and auth routes

| Route | Purpose | Main component/page |
| --- | --- | --- |
| `/` | Landing page | `pages/Index.tsx` |
| `/solvent-printers` | Solvent printer category | `components/SolventPrinters.tsx` |
| `/uv-printers` | UV printer category | `components/UVPrinters.tsx` |
| `/laser-cutting-machines` | Laser cutting category | `components/LaserCuttingMachines.tsx` |
| `/lamination-machines` | Lamination category | `components/LaminationMachines.tsx` |
| `/desktop-uv-printer` | Desktop UV category | `components/DesktopUVPrinter.tsx` |
| `/inkjet-printer` | Inkjet printer category | `components/InkjetPrinters.tsx` |
| `/inject-printer` | Redirect to `/inkjet-printer` | `Navigate` route |
| `/flatbed-uv-printer` | Flatbed UV category | `components/UVFlatbedPrinter.tsx` |
| `/login` | Sign in | `pages/LoginPage.tsx` |
| `/signup` | Signup and invite acceptance | `pages/SignupPage.tsx` |
| `/forgot-password` | Password reset request | `pages/ForgotPasswordPage.tsx` |
| `/reset-password` | Password reset completion | `pages/ResetPasswordPage.tsx` |
| `/verify-email` | Email verification | `pages/VerifyEmailPage.tsx` |

### Protected portal routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/app` | Redirects to `/app/requests` | Authenticated users |
| `/app/requests` | Customer requests or assigned work | Authenticated users |
| `/app/requests/new` | Create service request | Authenticated users |
| `/app/requests/:requestId` | Request detail, messages, history | Authenticated users with request access |
| `/app/complete-profile` | Customer service-profile onboarding | Authenticated users |
| `/app/account` | Current user's profile and account controls | Authenticated users |
| `/app/queue` | Open/assigned service queue | `engineer`, `support`, `owner`, `admin` |
| `/app/support` | Support operations dashboard and assignment view | `support`, `owner`, `admin` |
| `/app/customer-activity` | Customer activity dashboard | `support`, `owner`, `admin` |
| `/app/customer-activity/:customerId` | Customer activity detail | `support`, `owner`, `admin` |
| `/app/admin` | Admin dashboard: approvals, requests, heartbeats | `admin` |
| `/app/users` | User list, approvals, and staff invitations | `owner`, `admin` |
| `/app/machines` | Customer-machine inventory | `owner`, `admin` |
| `/app/machines/:customerId` | Customer machine/profile detail | `owner`, `admin` |

## API / Data Layer

### Browser-facing gateway API

The frontend calls `/api/*` through `apps/web/src/lib/api.ts`. Mutating requests add `x-csrf-token` from the CSRF cookie, and all requests include credentials.

| Method | Endpoint | Purpose | Request schema / notes | Auth |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Create customer account or accept invite | `signUpInputSchema`; invite path preserves invited role | Public |
| `POST` | `/api/auth/login` | Create session and cookies (legacy path) | `loginInputSchema` | Public |
| `POST` | `/api/auth/logout` | End session | Session cookie if present | Public |
| `GET` | `/api/auth/me` | Resolve current session | Returns `{ user }`, including `role`, `approvalStatus`, `accountOrigin`, and `profileCompleted` | Public |
| `POST` | `/api/auth/forgot-password` | Request reset email (legacy) | `forgotPasswordInputSchema` | Public |
| `POST` | `/api/auth/reset-password` | Complete reset (legacy) | `resetPasswordInputSchema` | Public |
| `POST` | `/api/auth/verify-email` | Verify email token (legacy) | `verifyEmailInputSchema` | Public |
| `POST` | `/api/auth/firebase/session` | Verify a Firebase ID token and create the local session | `{ idToken }`; creates/link users without overwriting moderator state | Public |
| `GET` | `/api/auth/google/start` | Start legacy server-side Google OAuth flow | `?returnTo=&inviteToken=` | Public |
| `GET` | `/api/auth/google/callback` | Legacy Google OAuth callback | Redirects after auth | Public |
| `GET` | `/api/catalog/categories` | List catalog categories | Read-only | Public through gateway |
| `GET` | `/api/catalog/products` | List products, optional `?category=` filter | Read-only | Public through gateway |
| `GET` | `/api/catalog/products/:productId` | Read one product | Read-only | Public through gateway |
| `GET` | `/api/me/profile` | Read signed-in user's service profile | Customer workshop/contact profile | `customer`, `engineer`, `admin` |
| `PATCH` | `/api/me/profile` | Update signed-in user's display/profile fields | `completeProfileInputSchema.partial()`; never mutates role/email/password/approval | `customer`, `engineer`, `admin` + CSRF |
| `POST` | `/api/me/password-reset` | Send reset email to signed-in user's own email | Constant response; rate-limited | `customer`, `engineer`, `admin` + CSRF |
| `GET` | `/api/me/machines` | List current user's active machine choices | Customer-safe machine view | `customer`, `engineer`, `admin` |
| `POST` | `/api/requests` | Create service request | Machine-based `createCustomerRequestInputSchema` or legacy `createServiceRequestInputSchema`; requires approved + verified user; customers must complete profile | `customer`, `engineer`, `support`, `owner`, `admin` + CSRF |
| `GET` | `/api/requests` | List visible requests; optional `?scope=queue` / `?statusGroup=` | Role-aware response | Authenticated portal roles |
| `GET` | `/api/requests/:requestId` | Read one request with messages, history, participants, and attachments metadata | Role-aware visibility | Authenticated portal roles |
| `PATCH` | `/api/requests/:requestId` | Update request fields | `updateServiceRequestInputSchema` | `customer`, `engineer`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/messages` | Add customer-visible message or internal note | `createRequestMessageInputSchema`; customers cannot create internal notes | Authenticated portal roles + CSRF |
| `POST` | `/api/requests/:requestId/claim` | Engineer self-claim | Returns `409` when already assigned | `engineer`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/assign` | Assign/reassign an engineer | `{ engineerId }`; writes assigned/reassigned history | `support`, `owner`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/status` | Change workflow status | `updateRequestStatusInputSchema`; transition map enforced in service desk | `engineer`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/cancel` | Close/archive a request | `cancelRequestInputSchema` | `customer`, `engineer`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/attachments/presign` | Issue short-lived direct-to-R2 upload target | `presignAttachmentInputSchema`; returns `501` when R2 is not configured | `customer`, `engineer`, `admin` + CSRF |
| `POST` | `/api/requests/:requestId/attachments` | Confirm uploaded attachment metadata | `confirmAttachmentInputSchema`; validates object key prefix | `customer`, `engineer`, `admin` + CSRF |
| `GET` | `/api/requests/:requestId/attachments` | List request attachment metadata/read URLs | Role-aware visibility | Authenticated portal roles |
| `GET` | `/api/admin/users` | List users (includes role, approval, origin, profile status) | Internal auth read | `owner`, `admin` |
| `GET` | `/api/admin/users/summary` | Approval-status counts for the admin dashboard | Internal auth read | `admin` |
| `GET` | `/api/admin/users/:userId/profile` | Read a customer's service profile | Internal auth read | `admin` |
| `PATCH` | `/api/admin/users/:userId/profile` | Edit customer profile fields | `adminUpdateProfileInputSchema` | `admin` + CSRF |
| `POST` | `/api/admin/users/invite` | Invite customer/staff users | `inviteUserInputSchema`; owner cannot invite `admin` | `owner`, `admin` + CSRF |
| `POST` | `/api/admin/users/:userId/approve` | Approve a pending account | Owner cannot act on admin accounts | `owner`, `admin` + CSRF |
| `POST` | `/api/admin/users/:userId/reject` | Reject a pending account | Owner cannot act on admin accounts | `owner`, `admin` + CSRF |
| `POST` | `/api/admin/users/:userId/suspend` | Suspend an account | Owner cannot act on admin accounts | `owner`, `admin` + CSRF |
| `POST` | `/api/admin/users/:userId/reactivate` | Reactivate a suspended/rejected account | Owner cannot act on admin accounts | `owner`, `admin` + CSRF |
| `POST` | `/api/admin/users/:userId/role` | Change a user's role | Admin can assign any role; owner can assign non-admin roles and cannot modify admins | `owner`, `admin` + CSRF |
| `DELETE` | `/api/admin/users/:userId` | Permanently remove user/customer data | Admin-only; self/system/admin accounts protected | `admin` + CSRF |
| `GET` | `/api/admin/users/:userId/machines` | List a customer's machines | Internal service-desk read | `owner`, `admin` |
| `POST` | `/api/admin/users/:userId/machines` | Link a machine to a customer | `createCustomerMachineInputSchema` | `owner`, `admin` + CSRF |
| `PATCH` | `/api/admin/machines/:machineId` | Update one customer machine | `updateCustomerMachineInputSchema` | `owner`, `admin` + CSRF |
| `DELETE` | `/api/admin/machines/:machineId` | Deactivate one customer machine | Soft status change to `inactive` | `owner`, `admin` + CSRF |
| `GET` | `/api/admin/customer-machines` | Global customer-machine dashboard list | Optional `customerId`, `productId`, `status` filters | `owner`, `admin` |
| `POST` | `/api/admin/customer-machines` | Link a machine from the global dashboard | `adminLinkMachineInputSchema` | `owner`, `admin` + CSRF |
| `PATCH` | `/api/admin/customer-machines/:machineId` | Update a global customer-machine row | `updateCustomerMachineInputSchema` | `owner`, `admin` + CSRF |
| `DELETE` | `/api/admin/customer-machines/:machineId` | Deactivate a global customer-machine row | Soft status change to `inactive` | `owner`, `admin` + CSRF |
| `GET` | `/api/admin/health` | Service heartbeat snapshot for the admin dashboard | Read-only | `admin` |
| `GET` | `/api/customer-activity` | Customer activity dashboard aggregate | Joins auth directory with service-desk metrics | `support`, `owner`, `admin` |
| `GET` | `/api/customer-activity/:customerId` | Customer activity detail | Profile, machines, request history | `support`, `owner`, `admin` |
| `GET` | `/api/support/summary` | Support operations KPI summary | Queue and workload metrics | `support`, `owner`, `admin` |
| `GET` | `/api/staff/customers` | Lightweight customer directory for staff request creation | No account-management fields | `support`, `owner`, `admin` |
| `GET` | `/api/staff/customers/:customerId/machines` | Customer machine choices for staff-created requests | Customer-safe machine view | `support`, `owner`, `admin` |
| `GET` | `/api/engineers` | Engineer directory for assignment | Internal auth read filtered to engineers | `support`, `owner`, `admin` |

### Internal service boundaries

| Service | Internal responsibility |
| --- | --- |
| `auth` | Users, password auth, Google OAuth identity linking, sessions, verify/reset/invite tokens |
| `catalog` | Category/product reads, optional Redis cache |
| `service-desk` | Request lifecycle, messages, history, assignment, workflow rules |
| `notification` | Polls `auth.outbox` and `service_desk.outbox`, sends SMTP email, records deliveries |

All non-health internal endpoints expect `x-internal-token`.

## Components Overview

| Component | Responsibility |
| --- | --- |
| `HeroSection` | Cinematic landing hero and headline motion |
| `SiteHeader` | Shared responsive navbar with dark/light variants and scroll-aware glass states |
| `ProductCategoryPage` | Shared category layout, carousel, specs, product CTA composition |
| `ProductPageBackground` | Theme-aware decorative atmosphere for category pages |
| `StableReveal` | Fade/blur reveal wrapper that avoids transform-based entrance motion |
| `ThemeProvider` / `ThemeToggle` | Persisted system/light/dark theme control |
| `ProtectedRoute` | Session gate plus role-based route fallback |
| `PortalShell` | Collapsible sidebar shell with theme selector, profile block, and logout |
| `StatusBadge` | Request status presentation |
| `IntroAnimation` | Initial branded loader animation |
| `ApprovalStateCard` | Polished pending/rejected/suspended state surfaced to blocked customers |
| `VerifyEmailNotice` | Friendly banner shown to signed-in users whose email is not yet verified |
| `AdminDashboardPage` | `/app/admin` — approval counts, request load, recent activity, live heartbeats |
| `AccountPage` | `/app/account` — profile summary, display-name update, self password reset |
| `CompleteProfilePage` | `/app/complete-profile` — required customer workshop/contact onboarding |
| `UsersPage` | `/app/users` — owner/admin user list, approvals, role changes, staff invites |
| `MachinesPage` | `/app/machines` — owner/admin global customer-machine inventory |
| `CustomerMachineProfilePage` | `/app/machines/:customerId` — customer machine and request history workspace |
| `CustomerMachinesDialog` | Inline customer profile and machine management from the users page |
| `MachineFormDialog` | Link/edit customer machines with catalog product snapshots |
| `CustomerActivityPage` | `/app/customer-activity` — customer activity KPIs and customer detail |
| `SupportDashboardPage` | `/app/support` — operational queue, customer lookup, engineer assignment |
| `AdminCreateRequest` | Staff request creation flow for admin/owner/support users |

## Environment Variables

`packages/config/src/env.ts` is the source of truth. `.env.example` contains the local template.

| Variable | Required by schema | Purpose | Example / default |
| --- | --- | --- | --- |
| `NODE_ENV` | No | Runtime mode | `development` |
| `POSTGRES_URL` | No | Preferred hosted Postgres URL override | empty locally |
| `DATABASE_URL` | No | Local Postgres connection string fallback | `postgres://elkatech:elkatech@127.0.0.1:5432/elkatech` |
| `KV_URL` | No | Preferred hosted Redis-compatible cache URL | empty locally |
| `REDIS_URL` | No | Redis-compatible cache fallback | empty locally |
| `INTERNAL_SERVICE_TOKEN` | No | Shared token between gateway and internal services | `dev-internal-token` |
| `APP_BASE_URL` | No | Public app URL used in email links | `http://127.0.0.1:8080` |
| `GATEWAY_URL` | No | Gateway service URL | `http://127.0.0.1:4000` |
| `AUTH_SERVICE_URL` | No | Auth service URL | `http://127.0.0.1:4001` |
| `CATALOG_SERVICE_URL` | No | Catalog service URL | `http://127.0.0.1:4002` |
| `SERVICE_DESK_URL` | No | Service-desk URL | `http://127.0.0.1:4003` |
| `NOTIFICATION_SERVICE_URL` | No | Notification service URL | `http://127.0.0.1:4004` |
| `SESSION_COOKIE_NAME` | No | Session cookie name | `elkatech_session` |
| `CSRF_COOKIE_NAME` | No | CSRF cookie name | `elkatech_csrf` |
| `SESSION_TTL_HOURS` | No | Session lifetime | `168` in `.env.example` |
| `SMTP_HOST` | No | SMTP host | `127.0.0.1` |
| `SMTP_PORT` | No | SMTP port | `1025` |
| `SMTP_FROM` | No | Sender address | `no-reply@elkatech.local` |
| `BOOTSTRAP_ADMIN_EMAIL` | No | Initial admin email and notification fallback | `admin@elkatech.local` |
| `BOOTSTRAP_ADMIN_PASSWORD` | No | Initial admin password | `ChangeMe123!` |
| `GOOGLE_OAUTH_CLIENT_ID` | No | Google OAuth client ID | empty |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | Google OAuth client secret | empty |
| `GOOGLE_OAUTH_REDIRECT_URI` | No | Google OAuth callback URL | `http://127.0.0.1:4000/api/auth/google/callback` |
| `FIREBASE_PROJECT_ID` | No | Firebase Admin: project ID | empty |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase Admin: service-account client email | empty |
| `FIREBASE_PRIVATE_KEY` | No | Firebase Admin: service-account private key (`\n` escapes allowed) | empty |
| `VITE_FIREBASE_API_KEY` | No (web only) | Firebase web client API key | empty |
| `VITE_FIREBASE_AUTH_DOMAIN` | No (web only) | Firebase web client auth domain | empty |
| `VITE_FIREBASE_PROJECT_ID` | No (web only) | Firebase web client project ID | empty |
| `VITE_FIREBASE_APP_ID` | No (web only) | Firebase web client app ID | empty |
| `VITE_FIREBASE_STORAGE_BUCKET` | No (web only) | Firebase web client storage bucket | empty |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No (web only) | Firebase web client messaging sender ID | empty |
| `R2_ACCOUNT_ID` | No | Cloudflare account ID used to derive the R2 S3 endpoint | empty |
| `R2_ACCESS_KEY_ID` | No | R2 S3-compatible access key for presigned uploads/reads | empty |
| `R2_SECRET_ACCESS_KEY` | No | R2 S3-compatible secret key | empty |
| `R2_BUCKET_NAME` | No | R2 bucket that stores request attachments | empty |
| `R2_ENDPOINT` | No | Explicit R2 S3 API endpoint override | derived from `R2_ACCOUNT_ID` |
| `R2_PUBLIC_BASE_URL` | No | Optional public read base URL for attachment display | empty |
| `MAX_REQUEST_ATTACHMENT_MB` | No | Per-file request attachment limit | `25` |
| `ALLOWED_REQUEST_ATTACHMENT_TYPES` | No | Comma-separated upload content types | `image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm` |
| `VERCEL` | Platform-provided | Enables Vercel runtime behavior | `1` on Vercel |
| `VERCEL_URL` | Platform-provided | Preview/runtime URL input | provided by Vercel |
| `VERCEL_PROJECT_PRODUCTION_URL` | Platform-provided | Preferred production URL input | provided by Vercel |

For production, override the local defaults even when the schema technically supplies one.

### Cloudflare R2 CORS (request attachments)

Service-request photo/video attachments are uploaded **directly from the
browser to R2** using a short-lived presigned `PUT` URL (the bytes never pass
through the serverless functions). Because the browser talks to R2 directly,
the R2 bucket must allow cross-origin `PUT`/`GET` from the app's origin —
otherwise the upload is blocked by CORS and the UI shows
"… file(s) could not be uploaded" even though the presigned URL is valid.

Configure CORS on the bucket in the Cloudflare dashboard
(**R2 → your bucket → Settings → CORS policy**). Recommended policy:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-content-sha256", "x-amz-date", "authorization"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Notes:

- Add your Vercel preview/production origins as needed; do **not** hardcode
  these origins in application code.
- `R2_ENDPOINT` is the S3 API endpoint
  (`https://<account-id>.r2.cloudflarestorage.com`) and must **not** include the
  bucket name. `R2_PUBLIC_BASE_URL` is the public read URL
  (`https://pub-xxxx.r2.dev` or a custom domain) used to display attachments.
- Reads use `R2_PUBLIC_BASE_URL` when set, otherwise a short-lived presigned
  `GET`. Keep the bucket's write access private — uploads only work through the
  presigned URLs the backend issues.

## Local Development Setup

### Prerequisites

- Node.js: current LTS release
- npm
- Docker Desktop or another Docker-compatible runtime

### Setup

```sh
git clone <repository-url>
cd elkatech-launchpad
npm install
cp .env.example .env
npm run dev:infra
npm run db:migrate
npm run db:seed
npm run db:bootstrap-admin
npm run dev
```

Default local URLs:

| Service | URL |
| --- | --- |
| Web app | `http://127.0.0.1:8080` |
| Gateway | `http://127.0.0.1:4000` |
| Auth | `http://127.0.0.1:4001` |
| Catalog | `http://127.0.0.1:4002` |
| Service desk | `http://127.0.0.1:4003` |
| Notification | `http://127.0.0.1:4004` |
| Mailpit inbox | `http://127.0.0.1:8025` |

## Available Scripts

### Root scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts web, gateway, auth, catalog, service desk, and notification concurrently |
| `npm run dev:web` | Starts only the Vite frontend |
| `npm run dev:gateway` | Starts only the gateway |
| `npm run dev:auth` | Starts only the auth service |
| `npm run dev:catalog` | Starts only the catalog service |
| `npm run dev:service-desk` | Starts only the service-desk service |
| `npm run dev:notification` | Starts only the notification service |
| `npm run dev:infra` | Starts local PostgreSQL and Mailpit via Docker Compose |
| `npm run build` | Builds all workspaces that define a build script |
| `npm run test` | Runs tests in workspaces that define a test script |
| `npm run lint` | Runs lint in workspaces that define a lint script |
| `npm run db:migrate` | Applies SQL migrations across service folders |
| `npm run db:seed` | Seeds the database catalog from shared contracts |
| `npm run db:bootstrap-admin` | Creates or updates the initial admin account |

### Web-app scripts

| Command | Description |
| --- | --- |
| `npm run dev -w @elkatech/web` | Starts the Vite dev server |
| `npm run build -w @elkatech/web` | Builds the frontend |
| `npm run preview -w @elkatech/web` | Serves the built frontend locally |
| `npm run lint -w @elkatech/web` | Lints the frontend |
| `npm run test -w @elkatech/web` | Runs frontend tests |

## Running the Project

- Full platform: `npm run dev`
- Frontend only: `npm run dev -w @elkatech/web`
- Infrastructure only: `npm run dev:infra`
- Production preview of the web app:

```sh
npm run build -w @elkatech/web
npm run preview -w @elkatech/web
```

## Build and Type Checking

```sh
npm run build
npm run build -w @elkatech/web
npx tsc -p apps/web/tsconfig.json --noEmit
npm run test
npm run lint
```

Notes:

- Root `build`, `test`, and `lint` fan out to workspace scripts.
- The repository currently has pre-existing frontend lint issues in some shared UI/config files; do not assume a clean lint baseline until those are addressed.

## Styling and Theme System

- Tailwind tokens and CSS custom properties live in `apps/web/src/index.css` and `apps/web/tailwind.config.ts`.
- The design language centers on navy, blue, steel, and neutral surfaces.
- `ThemeProvider` supports `light`, `dark`, and `system`, stores the choice under `elkatech-ui-theme`, and updates the root class.
- `SiteHeader` exposes light/dark variants so dark landing sections and light category pages can keep readable contrast.
- `ProductPageBackground` provides theme-aware radial depth, grid texture, and subtle decorative particles behind category pages.
- Prefer existing tokens and utility patterns over introducing unrelated one-off colors.

## Animation System

`StableReveal` is the shared non-hero reveal primitive. It intentionally avoids transform, scale, and layout animation during entrance states to prevent cards and sections from shifting on refresh or rendering differently across browsers.

Current conventions:

- Use opacity and subtle blur for section/card entrance reveals.
- Respect `prefers-reduced-motion`.
- Keep hover polish to borders, shadows, background gradients, icon glow, and small in-button arrow motion.
- Avoid geometry-changing entrance effects on cards and layout containers.
- Hero and intro animation may use Framer Motion more expressively, but product cards and content sections should stay layout-stable.

## Product Catalog Structure

### Current sources of truth

There are two catalog representations today:

1. Public category pages store local arrays inside files such as `apps/web/src/components/SolventPrinters.tsx`.
2. The service portal catalog API is seeded from `catalogSeedData` in `packages/contracts/src/index.ts`, then stored in PostgreSQL.

These sources are parallel, not automatically synchronized. When product data changes, update both where appropriate.

### Product model

The shared catalog product schema contains:

- `id`
- `categorySlug`
- `slug`
- `name`
- `priceDisplay`
- `brochureUrl`
- `images`
- `specs`
- `highlights`

The public page component model uses similar fields but names the displayed price `price`.

### Add or update a product/category

1. Add or update the public category component under `apps/web/src/components/`.
2. Register any new route in `apps/web/src/App.tsx`.
3. Add matching catalog data to `packages/contracts/src/index.ts` if the portal should expose it.
4. Add images under `apps/web/public/images/`.
5. Run `npm run db:seed` to refresh database-backed catalog data.
6. Verify both the public category page and the portal product selector.

## Sequence Diagrams

### Page load flow

```mermaid
sequenceDiagram
    participant Browser
    participant Web as React web app
    participant Theme as ThemeProvider
    participant Router as React Router
    Browser->>Web: Load bundle
    Web->>Theme: Restore theme preference
    Theme-->>Web: Apply light/dark root class
    Web->>Router: Match current route
    Router-->>Browser: Render page tree
```

### Theme toggle flow

```mermaid
sequenceDiagram
    participant User
    participant Toggle as ThemeToggle
    participant Provider as ThemeProvider
    participant Storage as localStorage
    participant Root as documentElement
    User->>Toggle: Choose light/dark/system
    Toggle->>Provider: setTheme(theme)
    Provider->>Storage: Persist elkatech-ui-theme
    Provider->>Root: Replace light/dark class
    Root-->>User: Updated themed UI
```

### Product category page flow

```mermaid
sequenceDiagram
    participant User
    participant Router as React Router
    participant Category as Category component
    participant Layout as ProductCategoryPage
    participant Assets as public/images
    User->>Router: Visit category route
    Router->>Category: Render matching component
    Category->>Layout: Pass title, intro, local products
    Layout->>Assets: Load product images
    Layout-->>User: Render category, carousel, specs, CTAs
```

### Customer profile and machine-based request flow

```mermaid
sequenceDiagram
    participant Customer
    participant Web as Web portal
    participant Gateway
    participant Auth
    participant Desk as Service desk
    participant Catalog
    participant Outbox
    participant Notify as Notification
    Customer->>Web: Complete service profile
    Web->>Gateway: PATCH /api/me/profile + CSRF
    Gateway->>Auth: PATCH /internal/users/:id/profile
    Auth-->>Gateway: profileCompleted=true
    Gateway-->>Web: Updated profile
    Web->>Gateway: GET /api/me/machines
    Gateway->>Desk: GET /me/machines
    Desk-->>Gateway: Active customer-safe machines
    Gateway-->>Web: Machine choices
    Customer->>Web: Submit service request
    Web->>Gateway: POST /api/requests + CSRF
    Gateway->>Auth: Resolve session
    Auth-->>Gateway: Approved, verified, profile-complete user
    Gateway->>Desk: POST /requests
    Desk->>Desk: Validate selected machine ownership
    Desk->>Catalog: Use stored product snapshot
    Catalog-->>Desk: Product
    Desk->>Desk: Store request and history
    Desk->>Outbox: Emit request.created
    Desk-->>Gateway: Service request
    Gateway-->>Web: Created request
    Notify->>Outbox: Poll event
    Notify-->>Customer: Confirmation email
```

### Owner role-management flow

```mermaid
sequenceDiagram
    participant Owner
    participant Web as UsersPage
    participant Gateway
    participant Contracts as Shared permission helpers
    participant Auth
    Owner->>Web: Invite or manage staff
    Web->>Contracts: assignableRolesFor(owner)
    Contracts-->>Web: customer, engineer, support, owner
    Web->>Gateway: POST /api/admin/users/invite or /role + CSRF
    Gateway->>Auth: Resolve session and target role
    Auth-->>Gateway: actor=owner, target role
    Gateway->>Contracts: canManageUsers / canChangeRoles / canManageTargetUser
    Contracts-->>Gateway: Allowed unless target/admin role is protected
    Gateway->>Auth: Forward internal mutation
    Auth-->>Gateway: Updated user
    Gateway-->>Web: Updated role/invite response
```

### Direct request attachment upload flow

```mermaid
sequenceDiagram
    participant User
    participant Web as Request detail UI
    participant Gateway
    participant Desk as Service desk
    participant R2 as Cloudflare R2
    User->>Web: Select image/video evidence
    Web->>Gateway: POST /api/requests/:id/attachments/presign + CSRF
    Gateway->>Desk: POST /requests/:id/attachments/presign
    Desk->>Desk: Check visibility, type, size, request prefix
    Desk-->>Gateway: uploadUrl, objectKey, headers
    Gateway-->>Web: Upload ticket
    Web->>R2: PUT bytes directly with signed URL
    R2-->>Web: Upload complete
    Web->>Gateway: POST /api/requests/:id/attachments + metadata
    Gateway->>Desk: Persist metadata
    Desk->>Desk: Add attachment_added history
    Desk-->>Gateway: Attachment with read URL
    Gateway-->>Web: Render attachment
```

### Staff support assignment flow

```mermaid
sequenceDiagram
    participant Support
    participant Web as Support dashboard
    participant Gateway
    participant Contracts as Shared permission helpers
    participant Desk as Service desk
    participant Auth
    Support->>Web: Assign or reassign engineer
    Web->>Gateway: GET /api/engineers
    Gateway->>Auth: GET /internal/users?role=engineer
    Auth-->>Gateway: Engineer directory
    Gateway-->>Web: Engineer options
    Support->>Web: Submit assignment
    Web->>Gateway: POST /api/requests/:id/assign + CSRF
    Gateway->>Contracts: canAssignRequests(support)
    Contracts-->>Gateway: true
    Gateway->>Desk: POST /requests/:id/assign
    Desk->>Desk: Set assigned engineer and history event
    Desk-->>Gateway: Updated request
    Gateway-->>Web: Updated queue
```

## UML / Component Diagrams

### Frontend component relationship

```mermaid
flowchart TD
    App[App] --> ThemeProvider
    App --> Routes
    Routes --> Index
    Routes --> ProductCategoryPage
    Routes --> AuthPages
    Routes --> ProtectedRoute
    ProtectedRoute --> PortalShell
    Index --> SiteHeader
    Index --> HeroSection
    Index --> LandingSections[About / Work / Brands / Infrastructure / Why / Contact]
    ProductCategoryPage --> SiteHeader
    ProductCategoryPage --> ProductPageBackground
    ProductCategoryPage --> StableReveal
    PortalShell --> PortalPages[Requests / New Request / Detail / Queue / Users / Machines / Support / Customer Activity / Account]
    PortalPages --> AdminCreateRequest
    PortalPages --> CustomerMachinesDialog
    PortalPages --> MachineFormDialog
```

### Role and permission architecture

```mermaid
flowchart TD
    Contracts[packages/contracts roleSchema + permission helpers]
    GatewayGuards[Gateway requireSession + route guards]
    WebGates[ProtectedRoute + PortalShell + page controls]
    DeskGuards[Service-desk operational guards]
    AuthService[Auth role/session/invite logic]

    Contracts --> GatewayGuards
    Contracts --> WebGates
    Contracts --> DeskGuards
    Contracts --> AuthService

    GatewayGuards --> AdminOnly[Admin-only: health, permanent user delete, admin role assignment]
    GatewayGuards --> OwnerOps[Owner/Admin: users, approvals, machines, non-admin roles]
    GatewayGuards --> SupportOps[Support/Owner/Admin: support dashboard, customer activity, assignment]
    GatewayGuards --> PortalOps[All portal roles: visible requests, messages, attachment reads]
```

### Core data model

```mermaid
erDiagram
    AUTH_USERS ||--o{ AUTH_SESSIONS : owns
    AUTH_USERS ||--o{ AUTH_TOKENS : receives
    AUTH_USERS ||--o{ OAUTH_IDENTITIES : links
    AUTH_USERS ||--o{ SERVICE_REQUESTS : creates
    AUTH_USERS ||--o{ CUSTOMER_MACHINES : owns
    CUSTOMER_MACHINES ||--o{ SERVICE_REQUESTS : selected_for
    CATALOG_CATEGORIES ||--o{ CATALOG_PRODUCTS : contains
    SERVICE_REQUESTS ||--o{ REQUEST_MESSAGES : has
    SERVICE_REQUESTS ||--o{ REQUEST_HISTORY : records
    SERVICE_REQUESTS ||--o{ REQUEST_ATTACHMENTS : has
    AUTH_OUTBOX ||--o{ NOTIFICATION_DELIVERIES : produces
    SERVICE_DESK_OUTBOX ||--o{ NOTIFICATION_DELIVERIES : produces

    AUTH_USERS {
      uuid id
      text email
      text display_name
      text role
      boolean email_verified
      text approval_status
      boolean profile_completed
      text company_name
      text contact_phone
    }
    CATALOG_PRODUCTS {
      text id
      text category_slug
      text slug
      text name
      text price_display
    }
    CUSTOMER_MACHINES {
      uuid id
      uuid customer_id
      text product_id
      jsonb product_snapshot
      text display_label
      text internal_serial_number
      text status
    }
    SERVICE_REQUESTS {
      uuid id
      text request_number
      uuid customer_id
      uuid customer_machine_id
      text product_id
      jsonb product_snapshot
      text status
      text priority
    }
    REQUEST_MESSAGES {
      uuid id
      uuid request_id
      uuid author_id
      text visibility
    }
    REQUEST_ATTACHMENTS {
      uuid id
      uuid request_id
      uuid uploaded_by
      text object_key
      text content_type
      text kind
    }
```

## Deployment Notes

### Architecture

- Deployment is explicitly configured for Vercel through `vercel.json` and `apps/web/vercel.json`.
- Root Vercel output is `apps/web/dist`.
- Root rewrites send `/api/*` traffic to handlers in `api/*.mjs` and all remaining routes to `index.html`.
- `scripts/bundle-api.cjs` builds those serverless handlers from service entry points. Re-run it before pushing if you change any backend service source.
- `packages/config/src/env.ts` rewrites service URLs automatically when `VERCEL=1`. Preview deployments route internal traffic to their own `VERCEL_URL`; production uses `VERCEL_PROJECT_PRODUCTION_URL`. Each deployment talks to itself end-to-end.
- `packages/config/src/env.ts` walks the directory tree from the package location to find the workspace-root `.env`, so every service (each launched from its own workspace folder) loads the same env file.
- The Vite app reads env vars from the workspace root via `envDir`, so `VITE_FIREBASE_*` values stay in one `.env` shared with the backend.

### Production setup on Vercel

1. **Connect the GitHub repo** to a new Vercel project. Set `Framework Preset: Vite`, leave Build Command and Output Directory as defined in `vercel.json`.
2. **Add Firebase env vars** under **Settings → Environment Variables** for the **Production** and **Preview** scopes:
   - Frontend (web): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`.
   - Backend (Admin SDK): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. The private key may contain escaped `\n` sequences; keep them literal — the platform converts them at load time.
3. **Add your production domain to Firebase Authorized Domains** (Firebase Console → Authentication → Settings → Authorized domains). Add both the production URL (`<project>.vercel.app`) and the branch URL pattern if you want to test on previews.
4. **Set the shared internal token**: `INTERNAL_SERVICE_TOKEN` to a strong random value (it gates calls between the gateway and the internal services).
5. **SMTP**: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. `SMTP_FROM` accepts either a bare email (`a@b.com`) or the standard display-name form (`"Brand <a@b.com>"`).
6. **Bootstrap admin** values: `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` so `npm run db:bootstrap-admin` provisions the same account locally and in production.
7. **Disable Vercel Deployment Protection for previews** (or set it to "Only Production Deployments"). Server-to-server calls between our own functions can't pass the SSO wall, so leaving Standard Protection on every deployment blocks internal routing.

### Production database with Neon

Neon is the recommended hosted Postgres. Free tier covers initial usage with no credit card.

1. Create a Neon project at https://console.neon.tech (any region close to your Vercel functions).
2. In Vercel → **Storage** tab → connect the Neon database to your project.
3. In the connect dialog:
   - **Custom Environment Variable Prefix**: set this to `POSTGRES` (not the default `STORAGE`). The codebase reads `POSTGRES_URL` directly.
   - **Create Database Branch For Deployment**: uncheck **both** Preview and Production. Otherwise Neon spawns a fresh empty branch for every deployment and migrations only land on `main`.
   - Environments: Production + Preview.
4. After connecting, Vercel injects `POSTGRES_URL`, `POSTGRES_USER`, etc. Confirm `POSTGRES_URL` exists under **Settings → Environment Variables**.
5. **Run migrations against the production database** from your laptop, one-time:

   ```sh
   nvm use 22
   POSTGRES_URL='<paste-the-neon-pooled-url>' npm run db:migrate
   POSTGRES_URL='<paste-the-neon-pooled-url>' npm run db:seed
   POSTGRES_URL='<paste-the-neon-pooled-url>' npm run db:bootstrap-admin
   ```

   - Quote the URL in single quotes (`'...'`) because it contains `&` in the query string.
   - `db:bootstrap-admin` also provisions the admin user in Firebase Auth when the Admin SDK env vars are set.
6. Trigger a new deployment so the function picks up the env vars: push any commit, or use Vercel's **Redeploy** with "Use existing build cache" off.

### Deploying changes

- Pushes to `main` deploy to production automatically.
- Pushes to feature branches create preview deployments on dedicated URLs. Each preview shares the production database when branch-per-deployment is off (see Neon step 3).
- After modifying any backend service in `services/*`, re-run `node scripts/bundle-api.cjs` so the committed `api/*.mjs` bundles match. Vercel uses the committed bundles directly — it does not rebundle.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Dependencies fail to install | Confirm Node/npm versions, then retry from a clean npm install path. |
| Web app is not on the expected port | Vite is configured for `127.0.0.1:8080`; another local command may override it. |
| PostgreSQL connection fails | Run `npm run dev:infra`, confirm Docker is healthy, and verify `DATABASE_URL` or `POSTGRES_URL`. |
| Emails do not appear locally | Confirm Mailpit is running and open `http://127.0.0.1:8025`. |
| Product images do not load | Check the path under `apps/web/public/images` and the corresponding product `images` array. |
| Theme does not change | Check the `elkatech-ui-theme` localStorage value and root `light`/`dark` class. |
| Portal mutations return `403` | Confirm login state, CSRF cookie/header, email verification, and role permissions. |
| Customer gets `USER_PENDING_APPROVAL` on `POST /api/requests` | Sign in as admin and approve the user on `/app/users`. New public signups start as `pending_approval`. |
| Firebase sign-in returns `Invalid Firebase credential` from the gateway | Backend Admin SDK env vars are missing or malformed. Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and the formatting of `FIREBASE_PRIVATE_KEY` (escaped `\n` is OK; do not strip the wrapping quotes in `.env`). |
| Preview deployment hits `column "firebase_uid" does not exist` | Neon's branch-per-deployment is creating a fresh DB per push. Disable branch-per-deployment, or migrate the specific preview branch's connection string. |
| Internal service calls return Vercel's "Authentication Required" HTML page | Vercel Deployment Protection is blocking server-to-server calls. Set it to "Only Production Deployments" or disable it. |
| `tsx`/`concurrently` errors with `Unexpected token {` or `Unexpected token ?` | Active Node version is too old. Run `nvm use 22` (or set `nvm alias default 22` so every new terminal starts on Node 22). |
| Lint fails | The repo currently has pre-existing lint errors in shared UI/config files; isolate whether your change introduced anything new. |

## Contribution Workflow

1. Branch from the intended integration branch (`dev` for the current portal feature work, `main` for production hotfixes).
2. Keep the change focused; avoid unrelated formatting churn.
3. Update shared contracts and local public-page data together when changing catalog content.
4. Run relevant build, typecheck, and tests before opening a pull request.
5. Include screenshots or route notes for visible UI changes.
6. Open a PR with a concise summary, verification notes, and known follow-up work.

Do not commit:

- `node_modules`
- local `.env` secrets
- generated clutter unrelated to the change

## Git Branching Guidelines

Use descriptive branch names:

- `fix/navbar-light-theme`
- `enhance/product-page-background`
- `docs/update-readme`

Recommended prefixes:

- `fix/` for bug fixes
- `enhance/` for iterative improvements
- `feature/` for new user-facing functionality
- `docs/` for documentation-only work

## Firebase Authentication Setup

Firebase Authentication is the chosen identity provider for new email/password and
Google sign-ups. The platform keeps its existing cookie session + CSRF + RBAC
model: the frontend signs in with Firebase, obtains a Firebase ID token, and
exchanges it for a server-side session through `POST /api/auth/firebase/session`.
The backend verifies the ID token with the Firebase Admin SDK before creating
or syncing the local user record.

Admin approval is independent of email verification. Firebase confirms the
user's identity and email; an ElkaTech admin then approves the account before
the user can create service requests.

### Firebase Console

1. Create or open a Firebase project at https://console.firebase.google.com.
2. Enable **Email/Password** and **Google** sign-in providers under **Authentication → Sign-in method**.
3. Register a **Web app** under **Project settings**. Copy the web config keys
   (apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId).
4. Under **Project settings → Service accounts**, generate a new private key.
   That JSON download contains `project_id`, `client_email`, and `private_key`.

### Backend environment variables

Set these in `.env` locally and in your hosting dashboard (e.g. Vercel) for
production:

```
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:

- `FIREBASE_PRIVATE_KEY` may contain escaped newlines (`\n`). The platform
  converts them back to real newlines at load time, so you can store the key on
  a single line.
- Never commit the service-account JSON or the private key. They are excluded
  by `.gitignore` (`*.service-account.json`, `firebase-service-account*.json`).
- Never log the private key, ID tokens, session cookies, or CSRF tokens.

### Frontend environment variables (Vite)

```
VITE_FIREBASE_API_KEY=<web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_APP_ID=<web-app-id>
VITE_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
```

These are public web-client identifiers and are safe to bundle into the
frontend. They are *not* secrets — only the Firebase Admin SDK private key is.

### Login + signup behavior

- **Signup with email/password**: the frontend calls Firebase
  `createUserWithEmailAndPassword`, then `sendEmailVerification`, then exchanges
  the resulting ID token via `POST /api/auth/firebase/session`. A local user
  record is created with role `customer` and approval status `pending_approval`.
- **Login with email/password**: Firebase `signInWithEmailAndPassword` → ID
  token → session bridge. Pending users can sign in and see the portal, but
  the polished pending-approval card replaces the new-request form.
- **Google login/signup**: Firebase `signInWithPopup` with the Google provider,
  same session bridge. Same approval rules.
- **Password reset**: when Firebase is configured the frontend uses
  `sendPasswordResetEmail`; otherwise the legacy backend reset flow is used.
- **Email verification**: Firebase handles verification emails for new
  Firebase-issued accounts. The legacy `/verify-email` route still works for
  any legacy-tokened users.

### Admin approval workflow

| State              | Set when                                                       | Effect                                            |
| ------------------ | -------------------------------------------------------------- | ------------------------------------------------- |
| `pending_approval` | New public customer signup                                     | Cannot create service requests                    |
| `approved`         | Admin approves user (or staff invite, or existing legacy user) | Full customer access                              |
| `rejected`         | Admin rejects user                                             | Cannot create service requests                    |
| `suspended`        | Admin suspends user                                            | Cannot create service requests                    |

- Existing users predating this workflow are kept `approved` by the migration.
- Approval status is enforced on the gateway (`POST /api/requests`) and surfaced
  in the frontend via a polished approval state card on `/app/requests/new` and
  a banner on `/app/requests`.
- The approval-state error codes returned by the gateway are:
  `USER_PENDING_APPROVAL`, `USER_REJECTED`, `USER_SUSPENDED`.

### Heartbeat / admin health dashboard

- Each service exposes `GET /health` returning `{ ok, service, environment }`.
- The gateway exposes `GET /api/admin/health` which probes every internal
  service and returns a per-service `healthy | degraded | down` status plus a
  latency measurement.
- The admin dashboard at `/app/admin` shows live heartbeats, approval counts,
  service-request load, and recent signups. It refreshes on a 60-second cadence
  by default. There is no AWS CloudWatch dependency — the dashboard is sourced
  entirely from internal services.

## Google OAuth Setup

Google OAuth lets users sign in or sign up with their Google account. It is optional — the portal works without it.

### Google Cloud Console

1. Create or select a Google Cloud project.
2. Go to **APIs & Services → OAuth consent screen** and configure it.
3. Go to **APIs & Services → Credentials** and create an **OAuth 2.0 Client ID**.
4. Application type: **Web application**.
5. Authorized redirect URIs:
   - Local: `http://127.0.0.1:4000/api/auth/google/callback`
   - Production: `https://<your-domain>/api/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**.

### Environment Variables

Add to your `.env` (or Vercel dashboard for production):

```
GOOGLE_OAUTH_CLIENT_ID=<your-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-client-secret>
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4000/api/auth/google/callback
```

For production on Vercel, set `GOOGLE_OAUTH_REDIRECT_URI` to your production callback URL.

### Database Migration

Run `npm run db:migrate` to create the `auth.oauth_identities` table.

### Scopes

The integration requests only `openid email profile` — minimal OpenID Connect scopes.

## Recent Updates

A summary of the work currently represented by this branch. Each item refers
to changes already in the codebase — see the git log for the exact commits.

### Owner/support operations, profiles, machines, and attachments

- **Protected owner role.** `owner` is part of the shared role schema and the
  database role constraints for `auth.users` and `auth.tokens`. Owner inherits
  business-operations permissions from admin but remains blocked from
  admin-only destructive/system controls.
- **Shared RBAC helpers.** `packages/contracts/src/index.ts` is the source of
  truth for role checks (`canManageUsers`, `canManageOperational`,
  `canAssignRequests`, `canDeleteUsers`, `assignableRolesFor`,
  `canManageTargetUser`, etc.). The gateway, service desk, and web app all
  consume the same helpers so UI visibility and backend `403` behavior match.
- **Owner safety rails.** Owner can approve/reject/suspend/reactivate users,
  invite and assign non-admin roles, manage customer machines, view customer
  activity, and assign requests. Owner cannot assign admin, modify admin
  accounts, remove protected admin accounts, permanently delete user/customer
  data, or access `/app/admin`.
- **Support role.** `support` can view the support dashboard and customer
  activity, create requests on behalf of customers, and assign/reassign
  requests to engineers without seeing user-management controls.
- **Customer service profiles.** Customer profile fields now capture company,
  contact phone, alternate phone, and workshop address. `profileCompleted`
  is derived server-side and blocks customer request creation until required
  fields are present.
- **Customer-machine inventory.** Admin/owner users can link catalog products
  to customers as physical machines, store site/serial/install metadata, and
  deactivate machines without deleting rows needed by historical requests.
  Customers create requests by selecting an active assigned machine instead
  of typing product/site details manually.
- **Operational dashboards.** `/app/customer-activity`, `/app/support`,
  `/app/machines`, and `/app/machines/:customerId` support the new staff
  workflows, backed by gateway routes that join auth users with service-desk
  request and machine aggregates.
- **Request attachments.** Photo/video evidence is stored in Cloudflare R2
  through the presign -> direct browser upload -> metadata confirm flow. The
  backend enforces allowed types, max size, request visibility, and object-key
  prefix validation; attachment history is recorded on the request timeline.
- **Schema migrations.** The branch adds auth migrations for customer profile
  fields and owner/support roles, plus service-desk migrations for customer
  machines, request-machine links, and request attachments.

### Portal theme & UI polish

- **Unified portal surfaces.** Replaced the residual navy/blue dashboard
  styling across `/app/admin`, `/app/users`, `/app/queue`, `/app/requests`,
  and `/app/requests/new` with the ElkaTech graphite/ivory/copper system
  (`lp-card`, `--lp-panel`, `--lp-accent`, `--lp-line`). No more bright
  blue buttons, badges, or card glows in the protected portal.
- **Compact, consistent cards.** Stat cards, hero headers, recent-activity
  panels, and detail panels all share the same matte surface, subtle
  border, and `rounded-2xl` / `rounded-xl` radii.
- **Status badge palette.**
  - new / open → muted copper
  - triaged / pending → muted amber
  - resolved / approved / healthy → muted green
  - suspended / rejected / down → muted red
  - admin / engineer / customer → graphite neutral with copper accent
- **Sidebar declutter.** The role tag under the user name and the redundant
  "Theme" label in the theme switcher were removed; the user card now shows
  display name + email and the theme row reads as `[icon] System >`.

### New "My Account" page

- **Route `/app/account`** available to all authenticated roles, gated by
  the existing `ProtectedRoute`. Shows display name, email, role, approval
  status, account origin, joined date, and email verification state.
- **Sidebar entry** sits directly above Log out, supports both expanded and
  collapsed sidebar widths, active-state styling, and tooltips.
- **Backend endpoints**
  - `PATCH /api/me/profile` → updates only the signed-in user's display
    name (forwards to `PATCH /internal/users/:id/profile` on the auth
    service). Role, approval status, email, and password are never mutable
    via this route.
  - `POST /api/me/password-reset` → rate-limited, sends the existing
    forgot-password email to the session's own address; constant response so
    it cannot leak account existence.
- **Security** is layered: gateway `requireSession` + `assertCsrf` + the
  internal route's `ensureInternal` token + a strict Zod schema that only
  accepts `{ displayName: string(2..80) }`.
- Email change is documented as admin-handled (Firebase is the identity
  source); the page shows a copper-tinted notice rather than faking the
  flow.

### Remove user flow (soft-delete)

- **Bug fix.** `DELETE /api/admin/users/:userId` previously failed with
  `FST_ERR_CTP_EMPTY_JSON_BODY` because the shared `internalHeaders()` helper
  always set `Content-Type: application/json` even when the request had no
  body. `packages/config/src/http.ts → fetchJson` now strips the JSON
  content-type when `init.body == null`, and throws a typed
  `InternalFetchError { status, body }` so the gateway can forward the real
  status code instead of converting everything to 500.
- **Soft-delete migration.** Added
  [`services/auth/migrations/005_user_removed_at.sql`](services/auth/migrations/005_user_removed_at.sql)
  introducing `auth.users.removed_at` and `removed_by` plus a partial index
  on rows where `removed_at IS NULL`.
- **Schema-aware code path.** The auth service probes for the column once
  (`hasRemovedAtColumn()` via `information_schema.columns`) and:
  - `GET /internal/users` and `/summary` filter `WHERE removed_at IS NULL`
    when the column exists; degrades gracefully when it doesn't.
  - `DELETE /internal/users/:id` sets `removed_at`, `removed_by`,
    `approval_status='suspended'`, and deletes all sessions — outside a
    transaction-aborting `42703` fallback path.
- **Production migration required:**
  ```bash
  DATABASE_URL='postgres://…neon.tech/…' npx tsx scripts/db-migrate.ts
  ```

### Safe test-data cleanup script

- **Script** at [`scripts/cleanup-test-data.ts`](scripts/cleanup-test-data.ts)
  with npm alias `npm run db:cleanup-test-data`.
- **Dry-run by default.** Lists kept admins, doomed users, and dependent
  row counts; takes no action. Pass `-- --confirm` to delete.
- **Keeps:** every `role='admin'` row plus any account matching
  `BOOTSTRAP_ADMIN_EMAIL` (defaults to `admin@elkatech.local`). Aborts
  before touching anything if zero admins would remain.
- **Deletes (single transaction, FK-safe order):**
  `service_desk.outbox` → `request_messages` → `request_history` →
  `requests` → `auth.sessions` → `auth.tokens` →
  `auth.oauth_identities` (when present) → `auth.outbox` (user-scoped
  events via `aggregate_type='user' AND aggregate_id IN …`) → `auth.users`.
- **Notification deliveries** (no FK; audit log) and Firebase Auth users
  are intentionally left in place — Firebase cleanup is documented as a
  manual follow-up.
- **Usage:**
  ```bash
  npm run db:cleanup-test-data                  # dry run
  npm run db:cleanup-test-data -- --confirm     # destructive
  DATABASE_URL='postgres://…' npm run db:cleanup-test-data -- --confirm
  ```
- Operational notes live in [`scripts/README.md`](scripts/README.md).

### Google sign-in — first-click bug fix

- **Bug.** After a successful Google OAuth round-trip the user landed
  back on `/login` and had to click "Continue with Google" again. Root
  cause was a React Query race: the `["session"]` query was inactive on
  the login page, so `invalidateQueries` only marked it stale instead of
  refetching, and `ProtectedRoute` read the cached `{ user: null }` on its
  first render.
- **Fix.** `LoginPage` and `SignupPage` now call
  `queryClient.setQueryData(["session"], { user })` synchronously before
  navigating, then invalidate for background freshness. Same one-click
  behavior for email/password and Firebase signup paths.

### Request detail page — UX overhaul

- **Compact summary** card with request number, status badge, priority
  pill, subject, product, description, and a meta strip showing created /
  updated / assignee — no more giant hero block.
- **Conversation thread** rendered as real chat:
  - Your messages align right with a copper-tinted bubble and "You" label.
  - Other participants align left with a graphite bubble; sender name
    falls back to email, then to a role label.
  - Role chips ("Admin" / "Engineer") and "Internal note" badge are
    rendered as small `lp-mono` pills.
- **Composer attached** to the conversation card: textarea sits flush
  inside the wrapper, visibility selector + Send pill on a thin divider
  below, Send disables on empty input.
- **Sidebar density.** The 6-box detail grid collapsed into a single
  card of `DetailRow` items (label + value with a hairline divider),
  with a new "Assigned to" row that resolves to "You" / `<display name>` /
  `<email>` / "Unassigned".
- **Workflow panel** restructured: a single assignment-state pill at the
  top, primary copper Claim button when unassigned, status actions in a
  two-column grid, Archive isolated under a divider with caution styling,
  admin Reassign as an inline `[Select] [Reassign]` row.
- **Activity timeline** with a vertical line + copper dots, newest event
  first, compact rows, an "N events" count badge, and a "Show all
  activity (X more)" / "Show less" toggle (default cap = 5).

### Request workflow state machine

- **Strict transition map** mirrored in
  [`services/service-desk/src/workflow.ts`](services/service-desk/src/workflow.ts)
  and [`apps/web/src/lib/request-status.ts`](apps/web/src/lib/request-status.ts):

  | From | Allowed via `/status` |
  | --- | --- |
  | `new` | `triaged`, `closed` |
  | `triaged` | `in_progress`, `waiting_for_customer`, `resolved`, `closed` |
  | `assigned` | `triaged`, `in_progress`, `waiting_for_customer`, `resolved`, `closed` |
  | `in_progress` | `waiting_for_customer`, `resolved`, `closed` |
  | `waiting_for_customer` | `in_progress`, `resolved`, `closed` |
  | `resolved` | `new` (admin only), `closed` |
  | `closed` | `new` (admin only) |

  `assigned` is never a `/status` target — assignment is set exclusively
  by `/claim` and `/assign`. Same-status updates are rejected so the
  history never accumulates no-op `status_changed` rows.
- **`canTransitionRequestTo`** combines RBAC + transition map + an
  admin-only reopen gate; `/status` calls it as a single check and returns
  400 *"Invalid workflow transition."* or 403 *"Forbidden"* with the real
  status code forwarded by the gateway (no more opaque 500s).
- **Claim hygiene.** `/claim` returns 409 with a friendly message if the
  request is already assigned, and `/assign` no-ops when reassigning to
  the same engineer — both prevent the duplicate "Request Claimed" /
  "Request Assigned" history rows that the activity timeline previously
  accumulated.
- **Reassignment activity** writes `request_reassigned` (vs
  `request_assigned`) with `{ previousEngineerId, engineerId,
  engineerEmail }` metadata for clearer timelines.
- **Frontend** mirrors all of the above: `getAllowedStatuses` filters to
  only valid forward targets, hides reopens from non-admins, and uses
  context-aware button copy (`Reopen request`, `Resume work`,
  `Mark triaged`, etc.) — `Mark open` / `Mark assigned` are gone.

### Request detail payload enrichment

- **Backend** `GET /requests/:requestId` resolves every participant (the
  assignee plus every message author) in parallel via the existing
  `getUserById` internal call. The response now includes:
  - `assignedEngineer: { id, displayName, email, role } | null`
  - per-message `authorDisplayName` and `authorEmail` (nullable)
- New contract type `RequestParticipant` in
  [`packages/contracts/src/index.ts`](packages/contracts/src/index.ts);
  `RequestMessage` gained optional `authorDisplayName`/`authorEmail` fields
  (older payloads still parse).
- **Result:** engineers and customers (who can't call
  `/api/admin/users`) now see real names everywhere — "Assigned to Ajit
  Doval" in the summary, the details row, and the workflow pill, plus
  real author names on every conversation message.

### Vercel bundling note

The `api/*.mjs` serverless handlers are committed to the repo and are
what Vercel actually runs. After **any** change under `services/*` or
`packages/config/`, regenerate the bundles or production will keep
running the old compiled code:

```bash
node scripts/bundle-api.cjs
git add api/*.mjs
```

## Future Improvements

- Pin the Node version for reproducible local and CI environments.
- Reconcile or generate the duplicate public-page and seeded catalog datasets from one source.
- Decide whether API bundling should be automated in package scripts or CI.
- Expand automated coverage beyond the current workflow-focused tests.
- Document production observability, backup, and operational procedures once they are formalized.

## License / Ownership

No `LICENSE` file is currently present in the repository. Ownership and redistribution terms should be confirmed before external publication.
