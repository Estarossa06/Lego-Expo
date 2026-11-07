import 'dotenv/config';
import app from './app.js';
import { initializeDatabase, pool } from './db.js';

const port = Number(process.env.PORT ?? 3000);

try {
  await initializeDatabase();
  app.listen(port, () => console.log(`LEGO Store API escuchando en el puerto ${port}.`));
} catch (error) {
  console.error('No se pudo iniciar la API:', error);
  await pool.end();
  process.exit(1);
}