## 1. Product Overview

ElkaTech Launchpad is a single monorepo that delivers two connected products for
ElkaTech, an industrial printing and signage machinery business:

- A **public marketing and product-catalog website** that presents the ElkaTech
  brand, machine categories, and product detail, with a polished dark/light
  themed experience and stable, layout-safe motion.
- An **authenticated service portal** where customers raise and track machine
  service requests, and where staff (engineers, support, owners, admins) triage,
  assign, and resolve that work.

The two products share one React/Vite frontend, one Fastify gateway, four
internal services (auth, catalog, service-desk, notification), shared
TypeScript/Zod contracts, PostgreSQL, Firebase Authentication, and Cloudflare R2
for attachment storage. Role-based permissions are defined once in the shared
contracts and enforced on the backend gateway as well as reflected in the UI.

## 2. Business Goals

- Present ElkaTech's machinery portfolio professionally and convert public
  interest into service relationships.
- Give existing customers a reliable, self-serve channel to report machine
  problems against the specific machine they own.
- Let operational staff run service delivery — triage, assignment, status, and
  customer communication — in one place.
- Keep ownership and access controls strict: customers see only their own data;
  destructive actions are limited to administrators.
- Remain low-cost and easy to operate (serverless deployment on Vercel, hosted
  Postgres on Neon, object storage on Cloudflare R2).

## 3. Target Users and Personas

| Persona | Description | Primary needs |
| --- | --- | --- |
| Customer | Owns one or more ElkaTech machines | Report a problem on the right machine, attach evidence, track progress |
| Engineer | Field/technical staff | See queue, claim/assigned work, update status, message the customer |
| Support | Service-operations staff | Monitor queue, look up customer activity, create requests for customers, assign engineers |
| Owner | Business operator | Operational oversight plus user approval, suspension, and role assignment (except admin) |
| Admin | System administrator | Full control, including permanent deletion and the system health/danger panel |

All five roles exist in the current branch and are documented as implemented.

## 4. Core Problems Being Solved

- Customers had no structured way to report machine issues tied to the exact
  unit, location, and serial they own.
- Staff lacked a shared queue with assignment, status workflow, and an auditable
  history of who did what and when.
- The business needed clear separation between **catalog products** (what is
  sold) and **customer machines** (what a specific customer actually owns).
- Access needed real backend enforcement, not just hidden buttons, with a clear
  rule that only admins may permanently delete data.

## 5. Product Scope

In scope:

- Public website and product-category discovery.
- Customer authentication, onboarding profile, and machine-scoped requests.
- Request lifecycle: creation, attachments, messaging, assignment, status, and
  history.
- Customer-machine inventory management by admin/owner.
- Operational dashboards (Customer Activity, Support) for support/owner/admin.
- User/account management with approval, suspension, role assignment, and
  admin-only hard delete.
- Transactional email notifications.

Out of scope is listed in Section 17.

## 6. Public Website Requirements

- Responsive landing page with hero, about, work, brands, infrastructure,
  why-us, contact, and footer sections.
- Product-category pages for solvent printers, UV printers, laser cutting
  machines, lamination machines, desktop UV printers, inkjet printers, and
  flatbed UV printers.
- Per-product image carousels, specification tables, brochure links, and a
  clear entry point into the service portal.
- Persisted light/dark/system theme with theme-aware navigation.
- Entrance reveals must be layout-stable (no refresh-time shift); honour
  `prefers-reduced-motion`.

## 7. Service Portal Requirements

- Cookie-based authenticated sessions with CSRF protection on mutations.
- Sign-up/sign-in via Firebase (email/password and Google), bridged to a
  server-side session; a legacy email/password path remains for existing
  accounts.
- New public customers begin in `pending_approval` and cannot create requests
  until an admin or owner approves them.
- Customers must complete a service profile (company, contact, address) before
  creating requests.
- Role-aware navigation and routes; each protected route is gated server-side.
- Operational dashboards for support/owner/admin and a system dashboard for
  admin.

## 8. Customer Machine Assignment Requirements

- A **catalog product** is the general model offered for sale; a **customer
  machine** is one physical unit a specific customer owns.
- Only admin/owner can link machines to customers; customers never create or
  edit machine records.
- Each machine carries a label, optional unit number, site name/location,
  contact phone, purchase/install dates, an admin-only internal serial number,
  status (`active`/`inactive`), and a snapshot of the catalog product at
  assignment time.
- Customers may create requests **only for their own active machines**.
- Admin/owner can create requests on behalf of a customer for that customer's
  machine; support can also create on behalf using a customer-safe machine view.
- Machines are deactivated (soft `inactive` status), not hard-deleted, so they
  can be reactivated and their request history is preserved.

## 9. Service Request Lifecycle

- A request captures the machine, an issue type, description, priority, contact
  details, and a generated request number.
- Status moves through `new`, `triaged`, `assigned`, `in_progress`,
  `waiting_for_customer`, `resolved`, and `closed`, enforced by a backend
  transition map.
- Engineers can self-claim unassigned queue items; support/owner/admin can
  assign or reassign a specific engineer.
- A request has a conversation (customer-visible messages and internal notes)
  and an activity history of key events.

## 10. Attachment / File Upload Requirements

- Customers and staff can attach photo/video evidence to a request.
- Bytes upload **directly from the browser to Cloudflare R2** using a
  short-lived presigned URL; only metadata (object key, file name, type, size,
  kind) is stored in the database.
- Uploads are validated for content type and size; when R2 is not configured the
  presign endpoint returns `501` and the UI degrades gracefully.
- Reads use a configured public base URL when present, otherwise a short-lived
  presigned read URL.

## 11. Role-Based Access Requirements

Permissions are enforced on the gateway (returning `403`) and mirrored in the
UI. Summary:

| Capability | Admin | Owner | Support | Engineer | Customer |
| --- | --- | --- | --- | --- | --- |
| Permanently delete user data | Yes | No | No | No | No |
| Approve / reject users | Yes | Yes | No | No | No |
| Suspend / reactivate users | Yes | Yes | No | No | No |
| Change roles | Yes (any) | Yes (not admin) | No | No | No |
| Assign / reassign requests | Yes | Yes | Yes | claim only | No |
| Create request for a customer | Yes | Yes | Yes | No | own only |
| View Customer Activity / Support | Yes | Yes | Yes | No | No |
| Customer machine management | Yes | Yes | view only | No | No |
| System Admin panel | Yes | No | No | No | No |

A non-negotiable rule: **only admins may permanently delete user/customer
data.** Owner and support receive a `403` ("Only admins can permanently delete
user data.") even on direct API calls.

## 12. Admin / Staff Workflows

- Invite customer or staff users (owner cannot invite admins).
- Approve, reject, suspend, or reactivate accounts.
- Change a user's role (owner is limited to non-admin roles and may never modify
  an admin account).
- Link/manage customer machines and create requests on behalf of customers.
- Monitor the queue, assign engineers, and watch system health (admin only).

## 13. Customer Workflows

- Sign up / sign in, verify email, await approval.
- Complete the required service profile.
- Pick one of their active machines, choose an issue type, describe the problem,
  attach evidence, and submit.
- Track status, exchange messages, and view the resolution.
- Manage their own account: update display name and profile, reset password.

## 14. Engineer, Support, and Owner Workflows

- **Engineer:** work the queue, claim or handle assigned requests, update
  status, and message the customer.
- **Support:** monitor the Support dashboard, look up Customer Activity, create
  requests for customers, and assign/reassign engineers — without any
  user-management powers.
- **Owner:** all support operational abilities plus user approval, suspension,
  role assignment (non-admin), and customer-machine management — but no
  permanent deletion and no system Admin panel.

## 15. Notification Expectations

- Auth, machine, and request events are written to per-schema outbox tables.
- The notification service polls those tables and sends transactional emails
  (account/approval, request created/claimed/assigned, status changes), recording
  one delivery row per recipient for idempotent retries.
- Locally, Mailpit captures email; in production, SMTP credentials are supplied
  via environment variables.

## 16. Non-Functional Requirements

- **Security:** cookie sessions, CSRF on mutations, shared internal-service
  token, server-side RBAC, presigned (not public-write) storage, admin-only
  deletion, and protected system/bootstrap accounts.
- **Reliability:** outbox-based notifications with retry idempotency; soft
  deactivation preserves history; graceful storage fallback.
- **Auditability:** request history records key actions and actors; user state
  transitions are timestamped.
- **Maintainability:** shared Zod contracts and permission helpers as a single
  source of truth; small focused services behind one gateway.
- **Deployment:** serverless on Vercel with prebuilt `api/*.mjs` bundles, hosted
  Postgres (Neon), and Cloudflare R2.

## 17. Out-of-Scope Items

- Public e-commerce / online machine purchasing and payments.
- Customer self-service machine registration (machines are admin-controlled).
- Inventory, spare-parts, or field-scheduling/dispatch logistics.
- In-app real-time chat or push/mobile notifications beyond email.
- Multi-tenant separation beyond the single ElkaTech organization.

## 18. Success Metrics

- Share of service issues submitted through the portal versus phone/email.
- Median time from request creation to assignment and to resolution.
- Approval turnaround for new customer accounts.
- Percentage of requests with attached evidence at creation.
- Reduction in mis-routed requests through machine-scoped creation.

## 19. Risks and Assumptions

- **R2 CORS / configuration:** direct browser uploads require correct bucket
  CORS; misconfiguration surfaces as failed uploads.
- **Hosted database branching:** preview environments must share the primary
  database (branch-per-deployment disabled) or migrations will not reach them.
- **Deployment protection:** server-to-server calls require preview SSO
  protection to be relaxed.
- **Firebase dependency:** sign-in availability depends on correct Admin SDK and
  web configuration.
- **Assumption:** ElkaTech staff manage approvals and machine assignments
  promptly so customers are not blocked from creating requests.
