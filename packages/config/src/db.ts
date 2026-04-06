import postgres, { type Sql } from "postgres";
import { getEnv } from "./env";

let sqlClient: Sql | null = null;

export function getDb() {
  if (!sqlClient) {
    const dbUrl = getEnv().POSTGRES_URL || getEnv().DATABASE_URL;
    sqlClient = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
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
