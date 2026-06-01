import postgres, { type Sql } from "postgres";
import { getEnv } from "./env";

let sqlClient: Sql | null = null;

export function getDb() {
  if (!sqlClient) {
    const dbUrl = getEnv().POSTGRES_URL || getEnv().DATABASE_URL;
    // Neon's pooler (and pgbouncer in transaction mode generally) is
    // incompatible with persistent prepared statements — after a schema
    // change callers hit "cached plan must not change result type" because
    // the cached server-side plan no longer matches the current column
    // set. Disable named-statement preparation when we're routed through
    // such a pooler so every execution describes-and-runs cleanly.
    const isPgbouncer = /-pooler|pgbouncer/i.test(dbUrl);
    sqlClient = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: !isPgbouncer,
    });
  }

  return sqlClient;
}

export async function closeDb() {
  if (sqlClient) {
    await sqlClient.end({ timeout: 5 });
    sqlClient = null;
  }
}
