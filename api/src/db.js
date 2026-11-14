import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { DatabaseConfigurationError, getDatabaseConfig } from './databaseConfig.js';

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) pool = new Pool(getDatabaseConfig());
  return pool;
}

export async function closePool() {
  if (pool) await pool.end();
}

export function describeDatabaseError(error) {
  const code = error?.code;
  if (code === '28P01') return 'PostgreSQL rechazó la autenticación. Verifique usuario y contraseña en api/.env.';
  if (code === '3D000') return 'La base de datos configurada no existe.';
  if (code === 'ECONNREFUSED') return 'PostgreSQL rechazó la conexión. Compruebe que el servicio esté iniciado y el host/puerto sean correctos.';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'No se pudo resolver el host PostgreSQL. Compruebe el host configurado.';
  if (code === 'ETIMEDOUT' || code === 'TIMEOUT') return 'La conexión a PostgreSQL agotó el tiempo de espera.';
  if (String(error?.message).startsWith('SASL:')) {
    return 'Falló la autenticación SCRAM de PostgreSQL. Verifique que DATABASE_URL incluya una contraseña válida como texto.';
  }
  return 'No se pudo conectar con PostgreSQL. Revise la configuración y disponibilidad del servicio.';
}

export async function verifyDatabaseConnection() {
  try {
    await getPool().query('SELECT 1');
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) throw error;
    throw new Error(describeDatabaseError(error), { cause: error });
  }
}

export async function initializeDatabase() {
  await verifyDatabaseConnection();
  const schema = await readFile(fileURLToPath(new URL('../sql/schema.sql', import.meta.url)), 'utf8');
  try {
    await getPool().query(schema);
  } catch (error) {
    throw new Error(`No se pudo inicializar el esquema de PostgreSQL: ${describeDatabaseError(error)}`, { cause: error });
  }
}

export async function ensureBootstrapAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail && !adminPassword) return false;
  if (!adminEmail || !adminPassword) {
    throw new Error('Configure tanto ADMIN_EMAIL como ADMIN_PASSWORD para crear el administrador inicial.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('ADMIN_EMAIL debe ser una dirección de correo válida.');
  }
  if (adminPassword.length < 12 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres y no superar 72 bytes.');
  }

  const existing = await getPool().query('SELECT id, role FROM users WHERE email = $1 LIMIT 1', [adminEmail]);
  if (existing.rowCount) {
    if (existing.rows[0].role !== 'admin') {
      throw new Error('ADMIN_EMAIL ya pertenece a un usuario normal; use un correo administrativo distinto.');
    }
    return false;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const created = await getPool().query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, 'admin', TRUE)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['Administrador', 'Sistema', adminEmail, passwordHash],
  );
  if (created.rowCount) return true;

  const concurrent = await getPool().query('SELECT role FROM users WHERE email = $1 LIMIT 1', [adminEmail]);
  if (concurrent.rows[0]?.role !== 'admin') {
    throw new Error('No se pudo crear el administrador inicial porque el correo ya está registrado.');
  }
  return false;
}
