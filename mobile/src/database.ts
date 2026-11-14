import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { catalogSeed } from './catalogSeed';
import type { CartItem, OrderItem, Product, StoreOrder } from './types';

type OrderRow = {
  id: string;
  status: StoreOrder['status'];
  created_at: string;
  customer_json: string;
  subtotal_cents: number;
  total_cents: number;
  rejection_reason: string | null;
};

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cart (
      product_id TEXT PRIMARY KEY NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99)
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      owner_user_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending_sync', 'processing', 'completed', 'rejected')),
      created_at TEXT NOT NULL,
      customer_json TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      rejection_reason TEXT
    );
    CREATE TABLE IF NOT EXISTS order_items (
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_cents INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      PRIMARY KEY (order_id, product_id)
    );
    CREATE TABLE IF NOT EXISTS local_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const orderColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(orders)');
  if (!orderColumns.some((column) => column.name === 'owner_user_id')) {
    await db.execAsync('ALTER TABLE orders ADD COLUMN owner_user_id TEXT');
  }

  await db.runAsync("UPDATE orders SET status = 'pending_sync' WHERE status = 'processing'");
  const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM products');
  if (!count?.count) await saveProducts(db, catalogSeed);
  await getDeviceId(db);
}

export async function getDeviceId(db: SQLiteDatabase) {
  const setting = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_settings WHERE key = 'device_id'",
  );
  if (setting) return setting.value;
  const id = Crypto.randomUUID();
  await db.runAsync("INSERT INTO local_settings (key, value) VALUES ('device_id', ?)", id);
  return id;
}

export async function saveProducts(db: SQLiteDatabase, products: Product[]) {
  await db.withTransactionAsync(async () => {
    for (const product of products) {
      await db.runAsync(
        `INSERT INTO products (id, name, description, price_cents, stock, image_url, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
         price_cents = excluded.price_cents, stock = excluded.stock, image_url = excluded.image_url,
         category = excluded.category`,
        product.id,
        product.name,
        product.description,
        product.priceCents,
        product.stock,
        product.imageUrl,
        product.category,
      );
    }
  });
}

export async function readProducts(db: SQLiteDatabase) {
  return db.getAllAsync<Product>(
    `SELECT id, name, description, price_cents AS priceCents, stock,
      image_url AS imageUrl, category FROM products ORDER BY category, name`,
  );
}

export async function readCart(db: SQLiteDatabase) {
  return db.getAllAsync<CartItem>(
    `SELECT p.id, p.name, p.description, p.price_cents AS priceCents, p.stock,
      p.image_url AS imageUrl, p.category, c.quantity
     FROM cart c JOIN products p ON p.id = c.product_id ORDER BY p.name`,
  );
}

export async function readOrders(db: SQLiteDatabase, ownerUserId: string | null): Promise<StoreOrder[]> {
  if (!ownerUserId) return [];
  const orders = await db.getAllAsync<OrderRow>(
    'SELECT * FROM orders WHERE owner_user_id = ? ORDER BY created_at DESC',
    ownerUserId,
  );
  return Promise.all(
    orders.map(async (order) => {
      const items = await db.getAllAsync<OrderItem>(
        `SELECT product_id AS productId, name, quantity, price_cents AS priceCents,
          image_url AS imageUrl FROM order_items WHERE order_id = ?`,
        order.id,
      );
      return {
        id: order.id,
        status: order.status,
        createdAt: order.created_at,
        customer: JSON.parse(order.customer_json),
        items,
        subtotalCents: order.subtotal_cents,
        totalCents: order.total_cents,
        rejectionReason: order.rejection_reason,
      };
    }),
  );
}