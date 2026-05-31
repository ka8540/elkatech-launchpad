/*
 * Safe cleanup of non-admin test users and the service-desk data they own.
 *
 * Default mode is a DRY RUN: prints what would be removed and exits.
 * Pass --confirm to actually delete.
 *
 *   npm run db:cleanup-test-data
 *   npm run db:cleanup-test-data -- --confirm
 *   DATABASE_URL='postgres://...' npm run db:cleanup-test-data -- --confirm
 *
 * Always backs off if it can't find an admin to keep.
 */

import { closeDb, getDb, getEnv } from "@elkatech/config";

type AdminRow = { id: string; email: string; display_name: string };
type UserRow = { id: string; email: string; display_name: string; role: string };
type RequestRow = { id: string; request_number: string; customer_id: string; subject: string };

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
  };
}

function fmtUser(u: UserRow | AdminRow & { role?: string }): string {
  const role = "role" in u && u.role ? u.role : "admin";
  return `  • ${u.email}  (${role}, ${u.display_name})`;
}

async function main() {
  const { confirm } = parseArgs(process.argv.slice(2));
  const env = getEnv();
  const sql = getDb();

  console.log("=".repeat(72));
  console.log("ElkaTech — test data cleanup");
  console.log("Mode:", confirm ? "⚠️  CONFIRMED DELETE" : "dry run (no changes)");
  console.log("=".repeat(72));

  const protectedEmail = env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  console.log(`Bootstrap admin to protect: ${protectedEmail}`);

  // 1. Admin users to keep: anyone with role='admin' OR matching bootstrap email.
  const adminsToKeep = await sql<AdminRow[]>`
    select id, email, display_name
    from auth.users
    where role = 'admin'
       or lower(email) = ${protectedEmail}
    order by created_at asc
  `;

  if (adminsToKeep.length === 0) {
    console.error(
      "\n❌ Refusing to run: no admin account found. Bootstrap an admin first " +
        "(npm run db:bootstrap-admin) before cleaning test data.",
    );
    process.exitCode = 1;
    await closeDb();
    return;
  }

  const keepIds = new Set(adminsToKeep.map((u) => u.id));
  console.log(`\nAdmin accounts that will be KEPT (${adminsToKeep.length}):`);
  for (const admin of adminsToKeep) console.log(fmtUser(admin));

  // 2. All other users — the ones to remove.
  const usersToRemove = await sql<UserRow[]>`
    select id, email, display_name, role
    from auth.users
    where id <> all(${Array.from(keepIds)}::uuid[])
    order by created_at asc
  `;

  if (usersToRemove.length === 0) {
    console.log("\n✓ Nothing to clean up — only admin accounts exist.");
    await closeDb();
    return;
  }

  console.log(`\nUsers that will be REMOVED (${usersToRemove.length}):`);
  for (const user of usersToRemove) console.log(fmtUser(user));

  const removeIds = usersToRemove.map((u) => u.id);

  // 3. Service-desk requests owned by those users.
  const requests = await sql<RequestRow[]>`
    select id, request_number, customer_id, subject
    from service_desk.requests
    where customer_id = any(${removeIds}::uuid[])
    order by created_at asc
  `;
  const requestIds = requests.map((r) => r.id);

  console.log(`\nService requests that will be DELETED (${requests.length}):`);
  for (const req of requests) {
    console.log(`  • ${req.request_number}  —  ${req.subject}`);
  }

  // 4. Counts for dependent rows so the dry-run is informative.
  const [{ count: messagesCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from service_desk.request_messages
    where request_id = any(${requestIds}::uuid[])
  `;
  const [{ count: historyCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from service_desk.request_history
    where request_id = any(${requestIds}::uuid[])
  `;
  const [{ count: deskOutboxCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from service_desk.outbox
    where aggregate_type = 'service_request'
      and aggregate_id = any(${requestIds.map(String)}::text[])
  `;
  // auth.outbox has no user_id — events are keyed by aggregate_type/aggregate_id.
  // Per services/auth/src/index.ts, user-scoped events use aggregate_type='user'
  // and aggregate_id = <userId>::text.
  const [{ count: authOutboxCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from auth.outbox
    where aggregate_type = 'user'
      and aggregate_id = any(${removeIds.map(String)}::text[])
  `;
  const [{ count: sessionsCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from auth.sessions
    where user_id = any(${removeIds}::uuid[])
  `;
  const [{ count: tokensCount }] = await sql<[{ count: string }]>`
    select count(*)::text as count
    from auth.tokens
    where user_id = any(${removeIds}::uuid[])
  `;
  const oauthCount = await sql<[{ count: string }]>`
    select count(*)::text as count
    from information_schema.tables
    where table_schema = 'auth' and table_name = 'oauth_identities'
  `;
  let oauthRows = "0";
  if (Number(oauthCount[0]?.count ?? "0") > 0) {
    const [row] = await sql<[{ count: string }]>`
      select count(*)::text as count
      from auth.oauth_identities
      where user_id = any(${removeIds}::uuid[])
    `;
    oauthRows = row.count;
  }

  console.log("\nDependent rows that will be DELETED:");
  console.log(`  request_messages:    ${messagesCount}`);
  console.log(`  request_history:     ${historyCount}`);
  console.log(`  service_desk.outbox: ${deskOutboxCount}`);
  console.log(`  auth.sessions:       ${sessionsCount}`);
  console.log(`  auth.tokens:         ${tokensCount}`);
  console.log(`  auth.oauth_identities: ${oauthRows}`);
  console.log(`  auth.outbox:         ${authOutboxCount}`);

  console.log(
    "\nNote: notification.deliveries are NOT deleted (no FK; rows are an audit log).",
  );
  console.log(
    "Note: Firebase Auth users are NOT touched. If a user had firebase_uid set,",
  );
  console.log(
    "      remove them manually from the Firebase console or via a follow-up script.",
  );

  if (!confirm) {
    console.log(
      "\n— Dry run complete. Re-run with `-- --confirm` to actually delete. —",
    );
    await closeDb();
    return;
  }

  // 5. Execute. All-or-nothing inside a single transaction.
  console.log("\n→ Executing deletion in a transaction…");
  await sql.begin(async (tx) => {
    if (requestIds.length > 0) {
      await tx`
        delete from service_desk.outbox
        where aggregate_type = 'service_request'
          and aggregate_id = any(${requestIds.map(String)}::text[])
      `;
      // request_messages and request_history cascade via FK ON DELETE CASCADE,
      // but explicit deletes make intent clear and survive schema drift.
      await tx`
        delete from service_desk.request_messages
        where request_id = any(${requestIds}::uuid[])
      `;
      await tx`
        delete from service_desk.request_history
        where request_id = any(${requestIds}::uuid[])
      `;
      await tx`
        delete from service_desk.requests
        where id = any(${requestIds}::uuid[])
      `;
    }

    // Auth dependents cascade on user delete, but explicit is safer/clearer.
    await tx`
      delete from auth.sessions
      where user_id = any(${removeIds}::uuid[])
    `;
    await tx`
      delete from auth.tokens
      where user_id = any(${removeIds}::uuid[])
    `;
    if (Number(oauthCount[0]?.count ?? "0") > 0) {
      await tx`
        delete from auth.oauth_identities
        where user_id = any(${removeIds}::uuid[])
      `;
    }
    await tx`
      delete from auth.outbox
      where aggregate_type = 'user'
        and aggregate_id = any(${removeIds.map(String)}::text[])
    `;
    await tx`
      delete from auth.users
      where id = any(${removeIds}::uuid[])
    `;
  });

  console.log("\n✓ Cleanup complete.");
  console.log(
    `  Removed ${usersToRemove.length} user(s), ${requests.length} request(s),`,
  );
  console.log(
    `  ${messagesCount} message(s), ${historyCount} history row(s),`,
  );
  console.log(
    `  ${deskOutboxCount} desk-outbox event(s), ${authOutboxCount} auth-outbox event(s).`,
  );
  console.log("\nKept admin accounts:");
  for (const admin of adminsToKeep) console.log(fmtUser(admin));

  await closeDb();
}

main().catch(async (error) => {
  console.error("\n✗ Cleanup failed:", error);
  process.exitCode = 1;
  await closeDb().catch(() => undefined);
});
