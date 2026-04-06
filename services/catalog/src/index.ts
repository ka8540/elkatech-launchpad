import Fastify from "fastify";
import { z } from "zod";
import { getDb, getEnv, getRedis } from "@elkatech/config";
import { catalogCategorySchema, catalogProductSchema } from "@elkatech/contracts";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

app.get("/health", async () => ({ ok: true, service: "catalog" }));

app.get("/categories", async () => {
  const redis = getRedis();
  const cacheKey = "catalog:categories";

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const rows = await sql<{
    id: string;
    slug: string;
    route_path: string;
    name: string;
    intro: string;
  }[]>`
    select id, slug, route_path, name, intro
    from catalog.categories
    order by name asc
  `;

  const result = rows.map((row) =>
    catalogCategorySchema.omit({ products: true }).parse({
      id: row.id,
      slug: row.slug,
      routePath: row.route_path,
      name: row.name,
      intro: row.intro,
    }),
  );

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }

  return result;
});

app.get("/products", async (request) => {
  const querySchema = z.object({
    category: z.string().optional(),
  });
  const query = querySchema.parse(request.query);

  const redis = getRedis();
  const cacheKey = `catalog:products:${query.category || "all"}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const rows = query.category
    ? await sql<{
        id: string;
        category_slug: string;
        slug: string;
        name: string;
        price_display: string;
        brochure_url: string | null;
        images: string[];
        specs: [string, string][];
        highlights: string[];
      }[]>`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        where category_slug = ${query.category}
        order by name asc
      `
    : await sql<{
        id: string;
        category_slug: string;
        slug: string;
        name: string;
        price_display: string;
        brochure_url: string | null;
        images: string[];
        specs: [string, string][];
        highlights: string[];
      }[]>`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        order by category_slug asc, name asc
      `;

  const result = rows.map((row) =>
    catalogProductSchema.parse({
      id: row.id,
      categorySlug: row.category_slug,
      slug: row.slug,
      name: row.name,
      priceDisplay: row.price_display,
      brochureUrl: row.brochure_url ?? undefined,
      images: row.images,
      specs: row.specs,
      highlights: row.highlights,
    }),
  );

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }

  return result;
});

app.get("/products/:productId", async (request, reply) => {
  const paramsSchema = z.object({ productId: z.string() });
  const params = paramsSchema.parse(request.params);

  const redis = getRedis();
  const cacheKey = `catalog:product:${params.productId}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const rows = await sql<{
    id: string;
    category_slug: string;
    slug: string;
    name: string;
    price_display: string;
    brochure_url: string | null;
    images: string[];
    specs: [string, string][];
    highlights: string[];
  }[]>`
    select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
    from catalog.products
    where id = ${params.productId}
    limit 1
  `;

  const product = rows[0];
  if (!product) {
    return reply.code(404).send({ message: "Product not found." });
  }

  const result = catalogProductSchema.parse({
    id: product.id,
    categorySlug: product.category_slug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.price_display,
    brochureUrl: product.brochure_url ?? undefined,
    images: product.images,
    specs: product.specs,
    highlights: product.highlights,
  });

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }

  return result;
});

const port = Number(new URL(env.CATALOG_SERVICE_URL).port || "4002");

app.listen({ port, host: "127.0.0.1" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
