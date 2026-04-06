import { closeDb, getDb } from "@elkatech/config";
import { catalogSeedData } from "@elkatech/contracts";

async function main() {
  const sql = getDb();

  for (const category of catalogSeedData) {
    await sql`
      insert into catalog.categories (id, slug, route_path, name, intro)
      values (${category.id}, ${category.slug}, ${category.routePath}, ${category.name}, ${category.intro})
      on conflict (id)
      do update set
        slug = excluded.slug,
        route_path = excluded.route_path,
        name = excluded.name,
        intro = excluded.intro,
        updated_at = now()
    `;

    for (const product of category.products) {
      await sql`
        insert into catalog.products (
          id,
          category_id,
          category_slug,
          slug,
          name,
          price_display,
          brochure_url,
          images,
          specs,
          highlights
        )
        values (
          ${product.id},
          ${category.id},
          ${product.categorySlug},
          ${product.slug},
          ${product.name},
          ${product.priceDisplay},
          ${product.brochureUrl ?? null},
          ${sql.json(product.images)},
          ${sql.json(product.specs)},
          ${sql.json(product.highlights)}
        )
        on conflict (id)
        do update set
          category_id = excluded.category_id,
          category_slug = excluded.category_slug,
          slug = excluded.slug,
          name = excluded.name,
          price_display = excluded.price_display,
          brochure_url = excluded.brochure_url,
          images = excluded.images,
          specs = excluded.specs,
          highlights = excluded.highlights,
          updated_at = now()
      `;
    }
  }

  console.log(`Seeded ${catalogSeedData.length} categories`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
