import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, closeDb } from "@elkatech/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = getDb();

  await sql`
    create table if not exists public.platform_migrations (
      service_name text not null,
      file_name text not null,
      applied_at timestamptz not null default now(),
      primary key (service_name, file_name)
    )
  `;

  const servicesDir = path.resolve(__dirname, "../services");
  const serviceNames = await readdir(servicesDir);

  for (const serviceName of serviceNames) {
    const migrationDir = path.join(servicesDir, serviceName, "migrations");

    let migrationFiles: string[] = [];

    try {
      migrationFiles = (await readdir(migrationDir)).filter((file) => file.endsWith(".sql")).sort();
    } catch {
      continue;
    }

    for (const fileName of migrationFiles) {
      const applied = await sql<{ exists: boolean }[]>`
        select true as exists
        from public.platform_migrations
        where service_name = ${serviceName} and file_name = ${fileName}
      `;

      if (applied.length > 0) {
        continue;
      }

      const migrationSql = await readFile(path.join(migrationDir, fileName), "utf8");
      await sql.begin(async (transaction) => {
        await transaction.unsafe(migrationSql);
        await transaction`
          insert into public.platform_migrations (service_name, file_name)
          values (${serviceName}, ${fileName})
        `;
      });
      console.log(`Applied ${serviceName}/${fileName}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
