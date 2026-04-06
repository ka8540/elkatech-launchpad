import { build } from 'esbuild';

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
        external: ['fastify', 'postgres', 'ioredis', 'zod', '@fastify/*'],
        loader: { '.ts': 'ts' }
      });
      console.log(`Bundled ${svc} successfully into api/${svc}.mjs`);
    } catch (e) {
      console.error(`Failed to bundle ${svc}`, e);
    }
  }
}
run();
