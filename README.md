# Elkatech Service Platform

Elkatech is now structured as a microservice-based service platform inside a single npm workspace monorepo.

The public marketing website still lives in the same codebase and keeps the existing visual language. On top of that, the repo now includes a protected service portal with customer authentication, service requests, engineer/admin workflows, and outbound email notifications.

## Architecture

### Apps

- `apps/web`: Vite + React frontend for both the public website and the protected service portal

### Services

- `services/gateway`: public-facing BFF/API gateway with cookie auth, CSRF checks, rate limiting, and RBAC
- `services/auth`: users, invitations, password auth, sessions, verification, password reset
- `services/catalog`: read-only product/category APIs seeded from the current website catalog
- `services/service-desk`: service requests, assignment, statuses, messages, internal notes, history
- `services/notification`: outbox consumer that delivers email notifications

### Shared Packages

- `packages/contracts`: shared Zod schemas, TypeScript contracts, and seed catalog data
- `packages/config`: shared environment, database, crypto, and internal HTTP helpers

### Database Layout

One Postgres instance is used in development, with separate schemas per service:

- `auth`
- `catalog`
- `service_desk`
- `notification`

Async service-to-service notifications use a Postgres outbox pattern in v1.

## Portal Features

- Public customer signup and login
- Invite-only engineer/admin onboarding
- Email verification and password reset
- Product-linked `Request Service` actions from catalog pages
- Protected customer portal under `/app/requests`
- Engineer queue under `/app/queue`
- Admin user invitation screen under `/app/users`
- Customer-visible replies and staff-only internal notes
- Email notifications for verification, password reset, request creation, assignment, replies, and status updates

## Local Setup

1. Install dependencies:

```sh
npm install
```

2. Copy environment defaults:

```sh
cp .env.example .env
```

3. Start Postgres and Mailpit:

```sh
docker compose up -d postgres mailpit
```

4. Apply database migrations:

```sh
npm run db:migrate
```

5. Seed the product catalog:

```sh
npm run db:seed
```

6. Bootstrap the first admin account:

```sh
npm run db:bootstrap-admin
```

7. Start the full platform:

```sh
npm run dev
```

## Useful URLs

- Public site: `http://127.0.0.1:8080`
- Gateway API: `http://127.0.0.1:4000`
- Auth service: `http://127.0.0.1:4001`
- Catalog service: `http://127.0.0.1:4002`
- Service Desk service: `http://127.0.0.1:4003`
- Notification service: `http://127.0.0.1:4004`
- Mailpit inbox: `http://127.0.0.1:8025`

## Verification

Build everything:

```sh
npm run build
```

Run tests:

```sh
npm test
```

## Notes

- The marketing site still uses the existing fonts, theme tokens, Tailwind utilities, shadcn components, and overall visual language.
- The product catalog shown on the public site remains visually unchanged, while the service portal uses the same styling system for continuity.
- Docker is the expected local infrastructure path for Postgres and Mailpit.
