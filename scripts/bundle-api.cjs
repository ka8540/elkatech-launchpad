const { build } = require('esbuild');
const path = require('path');

const services = ['auth', 'catalog', 'service-desk', 'notification', 'gateway'];

// Path prefix that each internal service receives from Vercel rewrites
const prefixMap = {
  'auth': '/api/internal-auth',
  'catalog': '/api/internal-catalog',
  'service-desk': '/api/internal-service-desk',
  'notification': '/api/internal-notification',
  'gateway': '',
};

// CJS compatibility shim — fixes "Dynamic require of X is not supported" in ESM bundles
const cjsShim = `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`;

async function run() {
  for (const svc of services) {
    const prefix = prefixMap[svc];
    try {
      await build({
        entryPoints: [`services/${svc}/src/index.ts`],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node18',
        outfile: `api/${svc}.mjs`,
        // Only externalize true Node built-ins — bundle everything else
        // so we are 100% self-contained and don't need root node_modules
        external: ['node:*'],
        // Inject CJS shim so bundled CommonJS packages (dotenv, etc) can call require()
        banner: { js: cjsShim },
        loader: { '.ts': 'ts' },
        // Silence top-level await warnings
        logLevel: 'error',
      });
      console.log(`✓ Bundled ${svc} -> api/${svc}.mjs`);
    } catch (e) {
      console.error(`✗ Failed to bundle ${svc}:`, e.message);
      process.exit(1);
    }
  }
}

run();
