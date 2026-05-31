# Operational scripts

Run from the repo root. All scripts read `DATABASE_URL` (or `POSTGRES_URL`) and
the `BOOTSTRAP_ADMIN_EMAIL` env var via `@elkatech/config`.

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Applies every `services/*/migrations/*.sql` file once, tracked in `public.platform_migrations`. |
| `npm run db:seed` | Seeds the catalog tables from the contracts package. Idempotent. |
| `npm run db:bootstrap-admin` | Creates / repairs the Platform Admin account and (if configured) the matching Firebase user. |
| `npm run db:cleanup-test-data` | **Destructive.** Removes all non-admin users and the service-desk data they own. Dry-run by default. |

## Cleanup test data

Removes test customers/engineers and the service requests they own. The
Platform Admin and every `role='admin'` account are preserved.

```bash
# Dry run — prints what would be deleted and exits without touching anything.
npm run db:cleanup-test-data

# Confirmed — actually deletes, all inside one transaction.
npm run db:cleanup-test-data -- --confirm

# Against a remote database (e.g. Neon staging — never run on production
# without a backup):
DATABASE_URL='postgres://…' npm run db:cleanup-test-data -- --confirm
```

What is removed when `--confirm` is passed:

- `service_desk.requests` rows owned by non-admin users
- `service_desk.request_messages`, `service_desk.request_history`, and
  `service_desk.outbox` rows for those requests
- `auth.sessions`, `auth.tokens`, `auth.oauth_identities`, `auth.outbox`
  rows for those users (most cascade, but the script is explicit)
- the `auth.users` rows themselves

What is **not** touched:

- any user with `role='admin'` or whose email equals
  `BOOTSTRAP_ADMIN_EMAIL` (default `admin@elkatech.local`)
- the catalog schema
- `notification.deliveries` rows (they are an audit log with no FK; safe
  to leave or trim manually)
- Firebase Auth users — remove them by hand from the Firebase console or
  via the Admin SDK if you also want their auth accounts gone

The script aborts before deleting anything if it can't find an admin to keep.

> ⚠️ **Back up the database before running with `--confirm` on a shared
> environment.** This is irreversible.
