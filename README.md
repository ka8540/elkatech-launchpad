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

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, TanStack Query |
| Styling | Tailwind CSS, CSS custom properties, shadcn/Radix UI primitives |
| Motion | Framer Motion for controlled UI animation |
| Backend | Fastify services, Zod validation |
| Data | PostgreSQL, optional Redis-compatible cache |
| Email | Nodemailer, Mailpit for local testing |
| Tooling | npm workspaces, TypeScript, Vitest, ESLint |
| Deployment config | Vercel configuration files and prebuilt serverless handlers |

Node version is not pinned in the repository with an `engines` field, `.nvmrc`, or `.node-version`. Use a current Node.js LTS release for local work; adding a pinned version is a sensible future improvement.

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
| `/app/users` | User list and staff invitations | `admin` |

## API / Data Layer

### Browser-facing gateway API

The frontend calls `/api/*` through `apps/web/src/lib/api.ts`. Mutating requests add `x-csrf-token` from the CSRF cookie, and all requests include credentials.

| Method | Endpoint | Purpose | Request schema / notes | Auth |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Create customer account or accept invite | `signUpInputSchema` | Public |
| `POST` | `/api/auth/login` | Create session and cookies | `loginInputSchema` | Public |
| `POST` | `/api/auth/logout` | End session | Session cookie if present | Public |
| `GET` | `/api/auth/me` | Resolve current session | Returns `{ user }` | Public |
| `POST` | `/api/auth/forgot-password` | Request reset email | `forgotPasswordInputSchema` | Public |
| `POST` | `/api/auth/reset-password` | Complete reset | `resetPasswordInputSchema` | Public |
| `POST` | `/api/auth/verify-email` | Verify email token | `verifyEmailInputSchema` | Public |
| `GET` | `/api/catalog/categories` | List catalog categories | Read-only | Public through gateway |
| `GET` | `/api/catalog/products` | List products, optional `?category=` filter | Read-only | Public through gateway |
| `GET` | `/api/catalog/products/:productId` | Read one product | Read-only | Public through gateway |
| `POST` | `/api/requests` | Create service request | `createServiceRequestInputSchema` | Authenticated, verified email |
| `GET` | `/api/requests` | List visible requests; optional `?scope=queue` | Role-aware response | Authenticated |
| `GET` | `/api/requests/:requestId` | Read one request with messages/history | Role-aware visibility | Authenticated |
| `POST` | `/api/requests/:requestId/messages` | Add message or internal note | `createRequestMessageInputSchema` | Authenticated |
| `POST` | `/api/requests/:requestId/claim` | Claim a request | Engineer/admin only | Authenticated |
| `POST` | `/api/requests/:requestId/assign` | Assign an engineer | `{ engineerId }` | Admin only |
| `POST` | `/api/requests/:requestId/status` | Change status | `updateRequestStatusInputSchema` | Engineer/admin only |
| `GET` | `/api/admin/users` | List users | Internal auth read | Admin only |
| `POST` | `/api/admin/users/invite` | Invite engineer/admin | `inviteUserInputSchema` | Admin only |

### Internal service boundaries

| Service | Internal responsibility |
| --- | --- |
| `auth` | Users, password auth, sessions, verify/reset/invite tokens |
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
| `PortalShell` | Shared portal layout and navigation |
| `StatusBadge` | Request status presentation |
| `IntroAnimation` | Initial branded loader animation |

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
| `VERCEL` | Platform-provided | Enables Vercel runtime behavior | `1` on Vercel |
| `VERCEL_URL` | Platform-provided | Preview/runtime URL input | provided by Vercel |
| `VERCEL_PROJECT_PRODUCTION_URL` | Platform-provided | Preferred production URL input | provided by Vercel |

For production, override the local defaults even when the schema technically supplies one.

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

- Deployment is explicitly configured for Vercel through `vercel.json` and `apps/web/vercel.json`.
- Root Vercel output is `apps/web/dist`.
- Root rewrites send `/api/*` traffic to handlers in `api/*.mjs` and all remaining routes to `index.html`.
- `scripts/bundle-api.cjs` builds those serverless handlers from service entry points.
- `packages/config/src/env.ts` rewrites service URLs automatically when `VERCEL=1`.

To be confirmed:

- The root `package.json` does not currently expose a script that runs `scripts/bundle-api.cjs`, even though checked-in `api/*.mjs` handlers and Vercel rewrites depend on those bundles. Confirm whether handler bundling is intentionally manual or should become part of the deployment pipeline.

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

## Future Improvements

- Pin the Node version for reproducible local and CI environments.
- Reconcile or generate the duplicate public-page and seeded catalog datasets from one source.
- Decide whether API bundling should be automated in package scripts or CI.
- Expand automated coverage beyond the current workflow-focused tests.
- Document production observability, backup, and operational procedures once they are formalized.

## License / Ownership

No `LICENSE` file is currently present in the repository. Ownership and redistribution terms should be confirmed before external publication.
