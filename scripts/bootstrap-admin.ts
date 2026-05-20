import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { closeDb, getDb, getEnv, getFirebaseAdminAuth } from "@elkatech/config";

async function provisionFirebaseAdmin(email: string, password: string): Promise<string | null> {
  const adminAuth = await getFirebaseAdminAuth();
  if (!adminAuth) {
    console.log("Firebase Admin SDK not configured — skipping Firebase admin provisioning.");
    return null;
  }

  try {
    const existing = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(existing.uid, {
      password,
      emailVerified: true,
      displayName: "Platform Admin",
    });
    console.log(`Updated Firebase user ${existing.uid} for ${email}`);
    return existing.uid;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "auth/user-not-found") {
      const created = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: "Platform Admin",
      });
      console.log(`Created Firebase user ${created.uid} for ${email}`);
      return created.uid;
    }
    throw error;
  }
}

async function main() {
  const sql = getDb();
  const env = getEnv();
  // Must use bcrypt to match the verification in services/auth/src/index.ts.
  const passwordHash = await bcrypt.hash(env.BOOTSTRAP_ADMIN_PASSWORD, 12);

  const firebaseUid = await provisionFirebaseAdmin(
    env.BOOTSTRAP_ADMIN_EMAIL,
    env.BOOTSTRAP_ADMIN_PASSWORD,
  );

  await sql`
    insert into auth.users (
      id,
      email,
      display_name,
      role,
      password_hash,
      email_verified,
      status,
      approval_status,
      approved_at,
      firebase_uid
    )
    values (
      ${randomUUID()},
      ${env.BOOTSTRAP_ADMIN_EMAIL},
      ${"Platform Admin"},
      ${"admin"},
      ${passwordHash},
      ${true},
      ${"active"},
      ${"approved"},
      now(),
      ${firebaseUid}
    )
    on conflict (email)
    do update set
      display_name = excluded.display_name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      email_verified = excluded.email_verified,
      status = excluded.status,
      approval_status = 'approved',
      approved_at = coalesce(auth.users.approved_at, now()),
      firebase_uid = coalesce(auth.users.firebase_uid, excluded.firebase_uid),
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
