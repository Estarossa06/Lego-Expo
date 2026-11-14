import 'dotenv/config';
import { closePool, ensureBootstrapAdmin, initializeDatabase } from './src/db.js';

try {
  if (!process.env.ADMIN_EMAIL?.trim() || !process.env.ADMIN_PASSWORD) {
    throw new Error('Defina ADMIN_EMAIL y ADMIN_PASSWORD en api/.env antes de crear el administrador.');
  }
  await initializeDatabase();
  const created = await ensureBootstrapAdmin();
  console.log(created ? 'Administrador inicial creado.' : 'La cuenta administrativa configurada ya existe.');
} catch (error) {
  console.error('No se pudo crear el administrador:', error instanceof Error ? error.message : 'Error desconocido.');
  process.exitCode = 1;
} finally {
  await closePool();
}
