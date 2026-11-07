import 'dotenv/config';
import { pool, initializeDatabase } from './src/db.js';
import { seedProducts } from './src/products.js';

try {
  await initializeDatabase();
  for (const product of seedProducts) {
    await pool.query(
      `INSERT INTO products (id, name, description, price_cents, stock, image_url, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
      [product.id, product.name, product.description, product.priceCents, product.stock, product.imageUrl, product.category],
    );
  }
  console.log(`Seed listo: ${seedProducts.length} productos.`);
} catch (error) {
  console.error('No se pudo cargar el catálogo:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}