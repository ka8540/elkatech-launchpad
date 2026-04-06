import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { closeDb, getDb, getEnv } from "@elkatech/config";

async function main() {
  const sql = getDb();
  const env = getEnv();
  const passwordHash = await argon2.hash(env.BOOTSTRAP_ADMIN_PASSWORD);

  await sql`
    insert into auth.users (
      id,
      email,
      display_name,
      role,
      password_hash,
      email_verified,
      status
    )
    values (
      ${randomUUID()},
      ${env.BOOTSTRAP_ADMIN_EMAIL},
      ${"Platform Admin"},
      ${"admin"},
      ${passwordHash},
      ${true},
      ${"active"}
    )
    on conflict (email)
    do update set
      display_name = excluded.display_name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      email_verified = excluded.email_verified,
      status = excluded.status,
      updated_at = now()
  `;

  console.log(`Bootstrapped admin ${env.BOOTSTRAP_ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
