import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function initializeDatabase() {
  const schema = await readFile(fileURLToPath(new URL('../sql/schema.sql', import.meta.url)), 'utf8');
  await pool.query(schema);
}