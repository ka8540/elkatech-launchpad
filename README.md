# ElkaTech Launchpad

ElkaTech Launchpad is a monorepo for ElkaTech's industrial printing and signage machinery web presence plus its authenticated service platform. The public site presents the ElkaTech brand, product-category pages, responsive landing sections, light/dark theming, and polished motion. The protected portal adds customer authentication, service-request workflows, engineer/admin tools, and email notifications.

## Overview

This repository contains:

- A React/Vite marketing and product-catalog frontend.
- A protected service portal rendered by the same frontend.
- A Fastify gateway plus four internal services for auth, catalog, service desk, and notifications.
- Shared TypeScript/Zod contracts and shared backend configuration helpers.
- Local development infrastructure for PostgreSQL and Mailpit.

## Features

- Responsive public landing page with hero, about, work, brands, infrastructure, why-us, contact, and footer sections.
- Product/category pages for solvent printers, UV printers, laser cutting machines, lamination machines, desktop UV printers, inkjet printers, and flatbed UV printers.
- Product image carousels, specification tables, brochure links, and service-request entry points.
- Dark/light theme support with persisted preference and theme-aware navbar variants.
- Stable reveal animations designed to avoid refresh-time layout shift.
- Protected customer portal for creating and tracking service requests.
- Engineer queue and admin user-invitation views.
- Cookie-based sessions, CSRF protection, RBAC checks, and email notifications.
- Firebase Authentication (email/password and Google) bridged to existing cookie sessions.
- Admin approval workflow: new customer accounts land in `pending_approval` and cannot create service requests until an admin approves them.
- Admin dashboard with approval counts, request load, and live service heartbeats.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| Styling | Tailwind CSS, CSS custom properties, shadcn/Radix UI primitives |
| Motion | Framer Motion for controlled UI animation |
| Backend | Fastify services, Zod validation |
| Identity | Firebase Authentication (email/password + Google), Firebase Admin SDK on the server |
| Data | PostgreSQL (local Docker or hosted via Neon), optional Redis-compatible cache |
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
    Web --> Gateway[services/gateway public API]

    Gateway --> Auth[services/auth]
    Gateway --> Catalog[services/catalog]
    Gateway --> Desk[services/service-desk]
    Desk --> Auth
    Desk --> Catalog

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
- Static images live under `apps/web/public/images`.
- Local development uses separate HTTP services on ports `4000` through `4004`; Vite proxies `/api` to the gateway on port `4000`.
- Root `vercel.json` rewrites API paths to bundled handlers in `api/*.mjs` and SPA routes to `index.html`.

## Application Flow

1. The browser loads `apps/web`, which mounts `ThemeProvider`, routing, toast providers, and scroll handling.
2. Public users browse the landing page and static product-category routes.
3. Portal users authenticate through the gateway, which sets the session and CSRF cookies.
4. Protected routes resolve the session through `/api/auth/me`.
5. Customers create service requests against catalog products; engineers/admins manage queue, messages, assignment, and status.
6. Auth and request events enter outbox tables; the notification service polls those tables and sends emails.

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
| `/app/queue` | Open/assigned service queue | `engineer`, `admin` |
| `/app/admin` | Admin dashboard: approvals, requests, heartbeats | `admin` |
| `/app/users` | User list, approvals, and staff invitations | `admin` |

## API / Data Layer

### Browser-facing gateway API

The frontend calls `/api/*` through `apps/web/src/lib/api.ts`. Mutating requests add `x-csrf-token` from the CSRF cookie, and all requests include credentials.

| Method | Endpoint | Purpose | Request schema / notes | Auth |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Create customer account or accept invite (legacy + invite path) | `signUpInputSchema` | Public |
| `POST` | `/api/auth/login` | Create session and cookies (legacy path) | `loginInputSchema` | Public |
| `POST` | `/api/auth/logout` | End session | Session cookie if present | Public |
| `GET` | `/api/auth/me` | Resolve current session | Returns `{ user }` (includes `approvalStatus`) | Public |
| `POST` | `/api/auth/forgot-password` | Request reset email (legacy) | `forgotPasswordInputSchema` | Public |
| `POST` | `/api/auth/reset-password` | Complete reset (legacy) | `resetPasswordInputSchema` | Public |
| `POST` | `/api/auth/verify-email` | Verify email token (legacy) | `verifyEmailInputSchema` | Public |
| `POST` | `/api/auth/firebase/session` | Verify a Firebase ID token and create the local session | `{ idToken }` | Public |
| `GET` | `/api/auth/google/start` | Start legacy server-side Google OAuth flow | `?returnTo=&inviteToken=` | Public |
| `GET` | `/api/auth/google/callback` | Legacy Google OAuth callback | Redirects after auth | Public |
| `GET` | `/api/catalog/categories` | List catalog categories | Read-only | Public through gateway |
| `GET` | `/api/catalog/products` | List products, optional `?category=` filter | Read-only | Public through gateway |
| `GET` | `/api/catalog/products/:productId` | Read one product | Read-only | Public through gateway |
| `POST` | `/api/requests` | Create service request | `createServiceRequestInputSchema` | Authenticated, verified email, approval status `approved` |
| `GET` | `/api/requests` | List visible requests; optional `?scope=queue` | Role-aware response | Authenticated |
| `GET` | `/api/requests/:requestId` | Read one request with messages/history | Role-aware visibility | Authenticated |
| `POST` | `/api/requests/:requestId/messages` | Add message or internal note | `createRequestMessageInputSchema` | Authenticated |
| `POST` | `/api/requests/:requestId/claim` | Claim a request | Engineer/admin only | Authenticated |
| `POST` | `/api/requests/:requestId/assign` | Assign an engineer | `{ engineerId }` | Admin only |
| `POST` | `/api/requests/:requestId/status` | Change status | `updateRequestStatusInputSchema` | Engineer/admin only |
| `GET` | `/api/admin/users` | List users (includes `approvalStatus`) | Internal auth read | Admin only |
| `GET` | `/api/admin/users/summary` | Approval-status counts for the dashboard | Internal auth read | Admin only |
| `POST` | `/api/admin/users/invite` | Invite engineer/admin | `inviteUserInputSchema` | Admin only |
| `POST` | `/api/admin/users/:userId/approve` | Approve a pending customer | `approvalActionInputSchema` | Admin only |
| `POST` | `/api/admin/users/:userId/reject` | Reject a pending customer | `approvalActionInputSchema` | Admin only |
| `POST` | `/api/admin/users/:userId/suspend` | Suspend an approved customer | `approvalActionInputSchema` | Admin only |
| `POST` | `/api/admin/users/:userId/reactivate` | Reactivate a suspended/rejected customer | `approvalActionInputSchema` | Admin only |
| `GET` | `/api/admin/health` | Service heartbeat snapshot for the admin dashboard | Read-only | Admin only |

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

### Service request creation flow

```mermaid
sequenceDiagram
    participant Customer
    participant Web as Web portal
    participant Gateway
    participant Auth
    participant Catalog
    participant Desk as Service desk
    participant Outbox
    participant Notify as Notification
    Customer->>Web: Submit service request
    Web->>Gateway: POST /api/requests + CSRF
    Gateway->>Auth: Resolve session
    Auth-->>Gateway: User session
    Gateway->>Desk: POST /requests
    Desk->>Catalog: GET product snapshot
    Catalog-->>Desk: Product
    Desk->>Desk: Store request and history
    Desk->>Outbox: Emit request.created
    Desk-->>Gateway: Service request
    Gateway-->>Web: Created request
    Notify->>Outbox: Poll event
    Notify-->>Customer: Confirmation email
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
    PortalShell --> PortalPages[Requests / New Request / Detail / Queue / Users]
```

### Core data model

```mermaid
erDiagram
    AUTH_USERS ||--o{ AUTH_SESSIONS : owns
    AUTH_USERS ||--o{ AUTH_TOKENS : receives
    AUTH_USERS ||--o{ OAUTH_IDENTITIES : links
    AUTH_USERS ||--o{ SERVICE_REQUESTS : creates
    CATALOG_CATEGORIES ||--o{ CATALOG_PRODUCTS : contains
    SERVICE_REQUESTS ||--o{ REQUEST_MESSAGES : has
    SERVICE_REQUESTS ||--o{ REQUEST_HISTORY : records
    AUTH_OUTBOX ||--o{ NOTIFICATION_DELIVERIES : produces
    SERVICE_DESK_OUTBOX ||--o{ NOTIFICATION_DELIVERIES : produces

    AUTH_USERS {
      uuid id
      text email
      text display_name
      text role
      boolean email_verified
    }
    CATALOG_PRODUCTS {
      text id
      text category_slug
      text slug
      text name
      text price_display
    }
    SERVICE_REQUESTS {
      uuid id
      text request_number
      uuid customer_id
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

1. Branch from `main`.
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

A summary of the work that has landed on `main` over the most recent
iteration cycle. Each item refers to changes already in the codebase — see
the git log for the exact commits.

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
