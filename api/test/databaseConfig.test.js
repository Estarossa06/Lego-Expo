import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabaseConfig } from '../src/databaseConfig.js';
import { describeDatabaseError } from '../src/db.js';

const validUrl = 'postgresql://store-user:local%40password@localhost:5432/lego_store';

test('requiere una DATABASE_URL y no expone secretos', () => {
  assert.throws(
    () => getDatabaseConfig({}),
    (error) => error.message.includes('DATABASE_URL no está configurada') && !error.message.includes('password'),
  );
});

test('resume errores de PostgreSQL sin incluir el mensaje original', () => {
  const error = Object.assign(new Error('authentication failed for password=secret-value'), { code: '28P01' });
  const message = describeDatabaseError(error);
  assert.match(message, /rechazó la autenticación/);
  assert.doesNotMatch(message, /secret-value/);
});

test('valida esquema, host, base de datos y credenciales PostgreSQL', () => {
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'https://localhost/store' }), /esquema PostgreSQL/);
  assert.throws(() => getDatabaseConfig({ DATABASE_URL: 'postgresql://localhost/lego_store' }), /usuario y contraseña/);
});

test('acepta credenciales URL-codificadas y SSL explícito', () => {
  const config = getDatabaseConfig({ DATABASE_URL: validUrl, DATABASE_SSL: 'true' });
  assert.equal(config.connectionString, validUrl);
  assert.equal(config.ssl, true);
});

test('habilita TLS verificado cuando sslmode de URL lo requiere', () => {
  const config = getDatabaseConfig({
    DATABASE_URL: `${validUrl}?sslmode=require`,
  });
  assert.equal(new URL(config.connectionString).searchParams.has('sslmode'), false);
  assert.equal(config.ssl, true);
});

test('rechaza caracteres reservados sin codificar y modo SSL inválido', () => {
  assert.throws(
    () => getDatabaseConfig({ DATABASE_URL: 'postgresql://store-user:local@password@localhost:5432/lego_store' }),
    /percent-encoding/,
  );
  assert.throws(
    () => getDatabaseConfig({ DATABASE_URL: validUrl, DATABASE_SSL: 'require' }),
    /DATABASE_SSL debe ser true o false/,
  );
  assert.throws(
    () => getDatabaseConfig({ DATABASE_URL: `${validUrl}?sslmode=require`, DATABASE_SSL: 'false' }),
    /contradice el modo SSL/,
  );
  assert.throws(
    () => getDatabaseConfig({ DATABASE_URL: `${validUrl}?sslmode=disable`, DATABASE_SSL: 'true' }),
    /contradice sslmode=disable/,
  );
});
