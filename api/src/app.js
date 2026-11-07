import cors from 'cors';
import express from 'express';
import { pool } from './db.js';
import { isValidUUID, validateInventory, validateOrder } from './orderValidation.js';

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins?.length && !allowedOrigins.includes('*') ? allowedOrigins : true }));
app.use(express.json({ limit: '32kb' }));

const orderSelect = `
  SELECT o.id, o.device_id AS "deviceId", o.status, o.customer,
    o.subtotal_cents AS "subtotalCents", o.total_cents AS "totalCents",
    o.rejection_reason AS "rejectionReason", o.created_at AS "createdAt",
    COALESCE(json_agg(json_build_object(
      'productId', oi.product_id, 'name', oi.product_name, 'quantity', oi.quantity,
      'priceCents', oi.unit_price_cents, 'imageUrl', oi.image_url
    )) FILTER (WHERE oi.order_id IS NOT NULL), '[]') AS items
  FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id`;

async function findOrder(executor, condition, ...values) {
  const result = await executor.query(`${orderSelect} ${condition} GROUP BY o.id`, values);
  return result.rows[0];
}

app.get('/api/health', async (_request, response) => {
  await pool.query('SELECT 1');
  response.json({ status: 'ok' });
});

app.get('/api/products', async (_request, response) => {
  const result = await pool.query(
    `SELECT id, name, description, price_cents AS "priceCents", stock,
      image_url AS "imageUrl", category FROM products ORDER BY category, name`,
  );
  response.json({ products: result.rows });
});

app.get('/api/orders', async (request, response) => {
  const { deviceId } = request.query;
  if (typeof deviceId !== 'string' || !deviceId) return response.status(400).json({ error: 'Falta deviceId.' });
  const result = await pool.query(`${orderSelect} WHERE o.device_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`, [deviceId]);
  response.json({ orders: result.rows });
});

app.get('/api/orders/:id', async (request, response) => {
  const { id } = request.params;
  const { deviceId } = request.query;
  if (!isValidUUID(id) || typeof deviceId !== 'string') return response.status(400).json({ error: 'Identificador de pedido inválido.' });
  const order = await findOrder(pool, 'WHERE o.id = $1 AND o.device_id = $2', id, deviceId);
  if (!order) return response.status(404).json({ error: 'Pedido no encontrado.' });
  response.json({ order });
});

app.post('/api/orders', async (request, response) => {
  const { id, deviceId, customer, items } = request.body ?? {};
  const invalid = validateOrder({ id, deviceId, customer, items });
  if (invalid) return response.status(400).json({ error: invalid });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO orders (id, device_id, status, customer, subtotal_cents, total_cents)
       VALUES ($1, $2, 'processing', $3, 0, 0) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [id, deviceId, customer],
    );
    if (!inserted.rowCount) {
      const existing = await findOrder(client, 'WHERE o.id = $1 AND o.device_id = $2', id, deviceId);
      await client.query('COMMIT');
      if (!existing) return response.status(409).json({ error: 'El identificador ya pertenece a otro dispositivo.' });
      return response.json({ order: existing });
    }

    const products = await client.query(
      `SELECT id, name, price_cents, stock, image_url FROM products
       WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      [items.map((item) => item.productId)],
    );
    const byId = new Map(products.rows.map((product) => [product.id, product]));
    const rejection = validateInventory(items, products.rows);

    if (rejection) {
      await client.query("UPDATE orders SET status = 'rejected', rejection_reason = $2 WHERE id = $1", [id, rejection]);
    } else {
      let total = 0;
      for (const item of items) {
        const product = byId.get(item.productId);
        total += product.price_cents * item.quantity;
        await client.query('UPDATE products SET stock = stock - $2, updated_at = NOW() WHERE id = $1', [product.id, item.quantity]);
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, product.id, product.name, item.quantity, product.price_cents, product.image_url],
        );
      }
      await client.query("UPDATE orders SET status = 'completed', subtotal_cents = $2, total_cents = $2 WHERE id = $1", [id, total]);
    }

    await client.query('COMMIT');
    const order = await findOrder(pool, 'WHERE o.id = $1', id);
    response.json({ order });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;