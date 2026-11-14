import 'dotenv/config';
import app from './app.js';
import { getJwtSecret } from './authValidation.js';
import { closePool, describeDatabaseError, ensureBootstrapAdmin, initializeDatabase } from './db.js';

const port = Number(process.env.PORT ?? 3000);

try {
  getJwtSecret();
  await initializeDatabase();
  await ensureBootstrapAdmin();
  const server = app.listen(port, () => console.log(`LEGO Store API escuchando en el puerto ${port}.`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    });
  }
} catch (error) {
  console.error('No se pudo iniciar la API:', error instanceof Error ? error.message : describeDatabaseError(error));
  await closePool();
  process.exit(1);
}