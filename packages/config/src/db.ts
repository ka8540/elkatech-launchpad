import postgres, { type ISql, type Sql } from "postgres";
import { getEnv } from "./env";

/**
 * Anything that can run a tagged-template query.
 *
 * `Sql` (the pooled client from `getDb()`) and `TransactionSql` (what
 * `sql.begin()` hands its callback) are *siblings* — both extend `ISql`, but
 * neither is assignable to the other, since only `Sql` has `begin`/`reserve`
 * and only `TransactionSql` has `savepoint`. `ISql` is their common base and
 * carries the tagged-template call signatures plus `json`/`unsafe`, so a
 * helper typed against it works standalone *or* enlisted in a caller's
 * transaction with no loss of template typing.
 */
export type DbExecutor = ISql;

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
