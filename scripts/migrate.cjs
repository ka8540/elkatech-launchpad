#!/usr/bin/env node
// Run all migrations against the remote database
// Usage: DATABASE_URL=postgres://... node scripts/migrate.cjs

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrations = [
  'services/auth/migrations/001_init.sql',
  'services/catalog/migrations/001_init.sql',
  'services/service-desk/migrations/001_init.sql',
  'services/notification/migrations/001_init.sql',
];

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.error('Usage: DATABASE_URL=postgres://... node scripts/migrate.cjs');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✓ Connected to database');

  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    console.log(`Running ${file}...`);
    try {
      await client.query(sql);
      console.log(`✓ ${file} done`);
    } catch (e) {
      console.error(`✗ ${file} failed:`, e.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\n✓ All migrations complete — database is ready!');
}

run();
