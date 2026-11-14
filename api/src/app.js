import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { requireRole } from './authorization.js';
import { getJwtSecret, validateLoginInput, validateRegistrationInput } from './authValidation.js';
import { describeDatabaseError, getPool } from './db.js';
import { isValidUUID, validateInventory, validateOrder } from './orderValidation.js';

const app = express();
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins?.length && !allowedOrigins.includes('*') ? allowedOrigins : true }));
app.use(express.json({ limit: '32kb' }));

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function sanitizeProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: Number(row.price_cents),
    stock: Number(row.stock),
    imageUrl: row.image_url,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, getJwtSecret(), {
    expiresIn: '7d',
    jwtid: randomUUID(),
  });
}

async function getAuthUserFromRequest(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;

  try {
    const payload = jwt.verify(match[1], getJwtSecret());
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') return null;
    if (typeof payload.jti === 'string') {
      const revoked = await getPool().query(
        'SELECT 1 FROM revoked_auth_tokens WHERE token_id = $1 AND expires_at > NOW()',
        [payload.jti],
      );
      if (revoked.rowCount) return null;
    }
    const result = await getPool().query(
      `SELECT id, first_name, last_name, email, role, is_active, created_at
       FROM users WHERE id = $1 AND is_active = TRUE`,
      [payload.sub],
    );
    return result.rowCount
      ? {
          user: sanitizeUser(result.rows[0]),
          tokenId: typeof payload.jti === 'string' ? payload.jti : null,
          expiresAt: typeof payload.exp === 'number' ? payload.exp : null,
        }
      : null;
  } catch {
    return null;
  }
}

function requireAuth(request, response, next) {
  return getAuthUserFromRequest(request)
    .then((session) => {
      if (!session) {
        response.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
        return;
      }
      request.user = session.user;
      request.authTokenId = session.tokenId;
      request.authExpiresAt = session.expiresAt;
      next();
    })
    .catch(() => response.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' }));
}

const orderSelect = `
  SELECT o.id, o.device_id AS "deviceId", o.user_id AS "userId", o.status, o.customer,
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
  await getPool().query('SELECT 1');
  response.json({ status: 'ok' });
});

app.post('/api/auth/register', async (request, response) => {
  const validation = validateRegistrationInput(request.body);
  if (validation.error) return response.status(validation.status).json({ error: validation.error });
  const { firstName, lastName, email, password, role } = validation.value;
  const passwordHash = await bcrypt.hash(password, 12);
  const inserted = await getPool().query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, first_name, last_name, email, role, is_active, created_at`,
    [firstName, lastName, email, passwordHash, role],
  );
  if (!inserted.rowCount) return response.status(409).json({ error: 'Este correo ya está registrado.' });
  const user = sanitizeUser(inserted.rows[0]);
  response.status(201).json({ token: signToken(user), user });
});

app.post('/api/auth/login', async (request, response) => {
  const validation = validateLoginInput(request.body);
  if (validation.error) return response.status(validation.status).json({ error: validation.error });
  const { email, password } = validation.value;

  const result = await getPool().query(
    `SELECT id, first_name, last_name, email, password_hash, role, is_active, created_at
     FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1`,
    [email],
  );
  const user = result.rows[0];
  if (!user) return response.status(401).json({ error: 'Credenciales inválidas.' });

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return response.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const safeUser = sanitizeUser(user);
  response.json({ token: signToken(safeUser), user: safeUser });
});

app.get('/api/auth/me', requireAuth, async (request, response) => {
  response.json({ user: request.user });
});

app.post('/api/auth/logout', requireAuth, async (request, response) => {
  if (request.authTokenId && request.authExpiresAt) {
    await getPool().query('DELETE FROM revoked_auth_tokens WHERE expires_at <= NOW()');
    await getPool().query(
      'INSERT INTO revoked_auth_tokens (token_id, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT (token_id) DO NOTHING',
      [request.authTokenId, request.authExpiresAt],
    );
  }
  response.json({ ok: true });
});

app.get('/api/products', async (_request, response) => {
  const result = await getPool().query(
    `SELECT id, name, description, price_cents AS "priceCents", stock,
      image_url AS "imageUrl", category, is_active AS "isActive"
      FROM products WHERE is_active IS NOT FALSE ORDER BY category, name`,
  );
  response.json({ products: result.rows.map(sanitizeProduct) });
});

app.get('/api/admin/products', requireAuth, requireRole('admin'), async (_request, response) => {
  const result = await getPool().query(`SELECT * FROM products ORDER BY category, name`);
  response.json({ products: result.rows.map(sanitizeProduct) });
});

app.post('/api/admin/products', requireAuth, requireRole('admin'), async (request, response) => {
  const { id, name, description, priceCents, stock, imageUrl, category } = request.body ?? {};
  if (
    typeof id !== 'string' || !id.trim() ||
    typeof name !== 'string' || !name.trim() ||
    typeof description !== 'string' ||
    !Number.isInteger(priceCents) || priceCents < 0 ||
    !Number.isInteger(stock) || stock < 0 ||
    typeof imageUrl !== 'string' || !/^https?:\/\//.test(imageUrl) ||
    typeof category !== 'string' || !category.trim()
  ) {
    return response.status(400).json({ error: 'Faltan datos requeridos del producto.' });
  }

  const result = await getPool().query(
    `INSERT INTO products (id, name, description, price_cents, stock, image_url, category, is_active, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       price_cents = EXCLUDED.price_cents,
       stock = EXCLUDED.stock,
       image_url = EXCLUDED.image_url,
       category = EXCLUDED.category,
       is_active = TRUE,
       updated_at = NOW()
     RETURNING *`,
    [String(id), String(name), String(description), Number(priceCents), Number(stock), String(imageUrl), String(category)],
  );
  response.status(201).json({ product: sanitizeProduct(result.rows[0]) });
});

app.patch('/api/admin/products/:id', requireAuth, requireRole('admin'), async (request, response) => {
  const { name, description, priceCents, stock, imageUrl, category, active } = request.body ?? {};
  const assignments = [];
  const values = [];

  if (priceCents !== undefined && (!Number.isInteger(priceCents) || priceCents < 0)) {
    return response.status(400).json({ error: 'El precio debe ser un entero no negativo.' });
  }
  if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
    return response.status(400).json({ error: 'Las existencias deben ser un entero no negativo.' });
  }

  if (typeof name === 'string') {
    assignments.push(`name = $${values.length + 1}`); values.push(name);
  }
  if (typeof description === 'string') {
    assignments.push(`description = $${values.length + 1}`); values.push(description);
  }
  if (priceCents !== undefined) {
    assignments.push(`price_cents = $${values.length + 1}`); values.push(Number(priceCents));
  }
  if (stock !== undefined) {
    assignments.push(`stock = $${values.length + 1}`); values.push(Number(stock));
  }
  if (typeof imageUrl === 'string') {
    assignments.push(`image_url = $${values.length + 1}`); values.push(imageUrl);
  }
  if (typeof category === 'string') {
    assignments.push(`category = $${values.length + 1}`); values.push(category);
  }
  if (typeof active === 'boolean') {
    assignments.push(`is_active = $${values.length + 1}`); values.push(active);
  }
  if (!assignments.length) return response.status(400).json({ error: 'No hay campos válidos para actualizar.' });

  values.push(request.params.id);
  const result = await getPool().query(
    `UPDATE products SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
    values,
  );
  if (!result.rowCount) return response.status(404).json({ error: 'Producto no encontrado.' });
  response.json({ product: sanitizeProduct(result.rows[0]) });
});

app.delete('/api/admin/products/:id', requireAuth, requireRole('admin'), async (request, response) => {
  const result = await getPool().query('UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *', [request.params.id]);
  if (!result.rowCount) return response.status(404).json({ error: 'Producto no encontrado.' });
  response.json({ product: sanitizeProduct(result.rows[0]), deleted: true });
});

app.get('/api/admin/orders', requireAuth, requireRole('admin'), async (_request, response) => {
  const result = await getPool().query(`${orderSelect} GROUP BY o.id ORDER BY o.created_at DESC`);
  response.json({ orders: result.rows });
});

app.get('/api/orders', requireAuth, async (request, response) => {
  const result = await getPool().query(
    `${orderSelect} WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
    [request.user.id],
  );
  response.json({ orders: result.rows });
});

app.get('/api/orders/:id', requireAuth, async (request, response) => {
  const { id } = request.params;
  if (!isValidUUID(id)) return response.status(400).json({ error: 'Identificador de pedido inválido.' });
  const order = await findOrder(
    getPool(),
    'WHERE o.id = $1 AND (o.user_id = $2 OR $3 = \'admin\')',
    id,
    request.user.id,
    request.user.role,
  );
  if (!order) return response.status(404).json({ error: 'Pedido no encontrado.' });
  response.json({ order });
});

app.post('/api/orders', requireAuth, async (request, response) => {
  const { id, deviceId, customer, items } = request.body ?? {};
  const invalid = validateOrder({ id, deviceId, customer, items });
  if (invalid) return response.status(400).json({ error: invalid });

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO orders (id, device_id, user_id, status, customer, subtotal_cents, total_cents)
       VALUES ($1, $2, $3, 'processing', $4, 0, 0)
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [id, deviceId, request.user.id, customer],
    );
    if (!inserted.rowCount) {
      const existing = await findOrder(client, 'WHERE o.id = $1 AND o.device_id = $2 AND o.user_id = $3', id, deviceId, request.user.id);
      await client.query('COMMIT');
      if (!existing) return response.status(409).json({ error: 'El identificador ya pertenece a otro dispositivo.' });
      return response.json({ order: existing });
    }

    const products = await client.query(
      `SELECT id, name, price_cents, stock, image_url FROM products
       WHERE id = ANY($1::text[]) AND is_active IS NOT FALSE ORDER BY id FOR UPDATE`,
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
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (order_id, product_id) DO NOTHING`,
          [id, product.id, product.name, item.quantity, product.price_cents, product.image_url],
        );
      }
      await client.query("UPDATE orders SET status = 'completed', subtotal_cents = $2, total_cents = $2 WHERE id = $1", [id, total]);
    }

    await client.query('COMMIT');
    const order = await findOrder(getPool(), 'WHERE o.id = $1', id);
    response.json({ order });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

app.use((error, _request, response, _next) => {
  console.error('Error en solicitud API:', describeDatabaseError(error));
  response.status(500).json({ error: 'Error interno del servidor.' });
});

export default app;