import 'dotenv/config';
import { closePool, ensureBootstrapAdmin, getPool, initializeDatabase } from './src/db.js';
import { seedProducts } from './src/products.js';

async function seedCatalog() {
  try {
    await initializeDatabase();
    const client = await getPool().connect();
    let transactionStarted = false;
    try {
      await client.query('BEGIN');
      transactionStarted = true;

      for (const product of seedProducts) {
        await client.query(
          `INSERT INTO products (id, name, description, price_cents, stock, image_url, category, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             description = EXCLUDED.description,
             price_cents = EXCLUDED.price_cents,
             image_url = EXCLUDED.image_url,
             category = EXCLUDED.category,
             is_active = COALESCE(products.is_active, TRUE),
             updated_at = NOW()`,
          [product.id, product.name, product.description, product.priceCents, product.stock, product.imageUrl, product.category],
        );
      }

      await client.query('COMMIT');
      transactionStarted = false;
    } catch (error) {
      if (transactionStarted) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    await ensureBootstrapAdmin();
    const result = await getPool().query(
      'SELECT COUNT(*) AS total FROM products WHERE id = ANY($1::text[])',
      [seedProducts.map((product) => product.id)],
    );
    if (Number(result.rows[0].total) !== seedProducts.length) {
      throw new Error('La verificación del catálogo no encontró todos los productos esperados.');
    }
    console.log(`Seed listo: ${result.rows[0].total} productos del catálogo verificados.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido.';
    console.error('No se pudo cargar el catálogo:', message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

await seedCatalog();