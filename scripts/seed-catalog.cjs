// Seed catalog categories and products into the Neon database
// Usage: DATABASE_URL=postgres://... node scripts/seed-catalog.cjs

const { Client } = require('pg');

const categories = [
  { id: 'solvent-printers', slug: 'solvent-printers', route_path: '/solvent-printers', name: 'Solvent Inkjet Printers', intro: 'Wide-format solvent inkjet printers' },
  { id: 'uv-printers', slug: 'uv-printers', route_path: '/uv-printers', name: 'UV Printers', intro: 'UV curing wide-format printers' },
  { id: 'laser-cutting', slug: 'laser-cutting-machines', route_path: '/laser-cutting-machines', name: 'Laser Cutting Machines', intro: 'Precision laser engraving and cutting' },
  { id: 'lamination', slug: 'lamination-machines', route_path: '/lamination-machines', name: 'Lamination Machines', intro: 'Cold and heat lamination machines' },
  { id: 'desktop-uv', slug: 'desktop-uv-printer', route_path: '/desktop-uv-printer', name: 'Desktop UV Printers', intro: 'Compact desktop UV printers' },
  { id: 'inkjet-printers', slug: 'inkjet-printers', route_path: '/inkjet-printer', name: 'Giant Inkjet Printers', intro: 'Large-format inkjet printers' },
  { id: 'uv-flatbed', slug: 'uv-flatbed-printer', route_path: '/flatbed-uv-printer', name: 'UV Flatbed Printers', intro: 'Flatbed UV printers for rigid media' },
];

const products = [
  { id: 'gzm3202et', category_id: 'solvent-printers', category_slug: 'solvent-printers', slug: 'gzm3202et', name: 'Gongzheng GZM3202ET Solvent Inkjet Printer', price_display: 'Get Quote' },
  { id: 'c3202sg', category_id: 'solvent-printers', category_slug: 'solvent-printers', slug: 'c3202sg', name: 'Gongzheng C3202SG Starfire Solvent Inkjet Printer', price_display: 'Get Quote' },
  { id: 'allwin-a180', category_id: 'solvent-printers', category_slug: 'solvent-printers', slug: 'allwin-a180', name: 'Allwin A180 Epson 13200 Eco Solvent Printer', price_display: 'Get Quote' },
  { id: 'gzm3204sg', category_id: 'solvent-printers', category_slug: 'solvent-printers', slug: 'gzm3204sg', name: 'Gongzheng GZM3204SG Starfire Solvent Inkjet Printer', price_display: 'Get Quote' },
  { id: 'allwin-3200-uv', category_id: 'uv-printers', category_slug: 'uv-printers', slug: 'allwin-3200-uv', name: 'Allwin 3.2 Double Rows Pinch Roller UV Printer', price_display: 'Get Quote' },
  { id: 'gz-dc1800uv', category_id: 'uv-printers', category_slug: 'uv-printers', slug: 'gz-dc1800uv', name: 'Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer', price_display: 'Get Quote' },
  { id: 'allwin-hybrid-uv', category_id: 'uv-printers', category_slug: 'uv-printers', slug: 'allwin-hybrid-uv', name: 'Allwin Giant Hybrid UV Printer', price_display: 'Get Quote' },
  { id: 'laser-1325ccd', category_id: 'laser-cutting', category_slug: 'laser-cutting-machines', slug: 'laser-1325ccd', name: '1325CCD Laser Engraving Cutting Machine', price_display: 'Get Quote' },
  { id: 'inca-l4-1700', category_id: 'lamination', category_slug: 'lamination-machines', slug: 'inca-l4-1700', name: 'Inca L4-1700 Electric Laminating Machine', price_display: 'Get Quote' },
  { id: 'molor-ml1600k', category_id: 'lamination', category_slug: 'lamination-machines', slug: 'molor-ml1600k', name: 'Molor ML1600K Cold Heat Lamination Machine', price_display: 'Get Quote' },
  { id: 'gz-a3-desktop', category_id: 'desktop-uv', category_slug: 'desktop-uv-printer', slug: 'gz-a3-desktop', name: 'Gongzheng A3 HD Desktop UV Printer', price_display: 'Get Quote' },
  { id: 'allwin-c8pro', category_id: 'inkjet-printers', category_slug: 'inkjet-printers', slug: 'allwin-c8pro', name: 'Allwin C8 Pro Inkjet Printer', price_display: 'Get Quote' },
  { id: 'allwin-e520', category_id: 'inkjet-printers', category_slug: 'inkjet-printers', slug: 'allwin-e520', name: 'Allwin E520-8H 5M Giant Inkjet Printer', price_display: 'Get Quote' },
  { id: 'allwin-ricoh-2513', category_id: 'uv-flatbed', category_slug: 'uv-flatbed-printer', slug: 'allwin-ricoh-2513', name: 'Allwin Ricoh 2513 UV Flatbed Printer', price_display: 'Get Quote' },
];

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✓ Connected');

  // Upsert categories
  for (const cat of categories) {
    await client.query(`
      INSERT INTO catalog.categories (id, slug, route_path, name, intro)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, intro = EXCLUDED.intro
    `, [cat.id, cat.slug, cat.route_path, cat.name, cat.intro]);
    console.log(`✓ Category: ${cat.name}`);
  }

  // Upsert products
  for (const p of products) {
    await client.query(`
      INSERT INTO catalog.products (id, category_id, category_slug, slug, name, price_display)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price_display = EXCLUDED.price_display
    `, [p.id, p.category_id, p.category_slug, p.slug, p.name, p.price_display]);
    console.log(`  ✓ Product: ${p.name}`);
  }

  await client.end();
  console.log('\n✓ Catalog seeded — all 14 products are ready!');
}

run().catch(e => { console.error(e); process.exit(1); });
