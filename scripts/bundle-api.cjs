const { build } = require('esbuild');

const services = ['auth', 'catalog', 'service-desk', 'notification', 'gateway'];

async function run() {
  for (const svc of services) {
    try {
      await build({
        entryPoints: [`services/${svc}/src/index.ts`],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node18',
        outfile: `api/${svc}.mjs`,
        // Mark ALL CJS-only / native packages as external so they are
        // resolved from node_modules at runtime on Vercel, not bundled inline.
        external: [
          'fastify', '@fastify/*',
          'postgres', 'ioredis',
          'zod',
          'dotenv', 'dotenv/*',
          'fs', 'path', 'crypto', 'os', 'stream', 'http', 'https', 'net', 'tls', 'events',
          'node:*',
        ],
        loader: { '.ts': 'ts' },
      });
      console.log(`Bundled ${svc} -> api/${svc}.mjs`);
    } catch (e) {
      console.error(`Failed to bundle ${svc}:`, e.message);
      process.exit(1);
    }
  }
}

run();
