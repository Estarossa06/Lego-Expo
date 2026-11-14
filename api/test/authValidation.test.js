import test from 'node:test';
import assert from 'node:assert/strict';
import { getJwtSecret, validateLoginInput, validateRegistrationInput } from '../src/authValidation.js';
import { requireRole } from '../src/authorization.js';

test('normaliza el correo y registra únicamente cuentas user', () => {
  const result = validateRegistrationInput({
    firstName: ' Ada ',
    lastName: ' Lovelace ',
    email: ' ADA@EXAMPLE.COM ',
    password: 'secure pass 123',
    role: 'user',
  });

  assert.deepEqual(result, {
    value: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure pass 123',
      role: 'user',
    },
  });
});

test('rechaza registro administrativo sin invitación válida', () => {
  assert.equal(validateRegistrationInput({}).status, 400);
  assert.equal(validateRegistrationInput({ firstName: 'A', lastName: 'B', email: 'bad', password: 'password123' }).status, 400);
  assert.equal(validateRegistrationInput({ firstName: 'A', lastName: 'B', email: 'a@example.com', password: 'password123', role: 'owner' }).status, 400);
  assert.equal(validateRegistrationInput({ firstName: 'A', lastName: 'B', email: 'a@example.com', password: 'á'.repeat(40) }).status, 400);
  assert.equal(validateRegistrationInput({
    firstName: 'A',
    lastName: 'B',
    email: 'a@example.com',
    password: 'password123',
    role: 'admin',
  }, { ADMIN_REGISTRATION_CODE: 'a'.repeat(32) }).status, 403);
  assert.equal(validateRegistrationInput({
    firstName: 'A',
    lastName: 'B',
    email: 'a@example.com',
    password: 'password123',
    role: 'admin',
    adminInvitationCode: 'wrong-code',
  }, { ADMIN_REGISTRATION_CODE: 'a'.repeat(32) }).status, 403);
});

test('permite crear una cuenta admin solo con el código configurado en el servidor', () => {
  const invitationCode = 'a'.repeat(32);
  assert.deepEqual(validateRegistrationInput({
    firstName: ' Ada ',
    lastName: ' Lovelace ',
    email: ' ADA@EXAMPLE.COM ',
    password: 'secure pass 123',
    role: 'admin',
    adminInvitationCode: ` ${invitationCode} `,
  }, { ADMIN_REGISTRATION_CODE: invitationCode }), {
    value: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'secure pass 123',
      role: 'admin',
    },
  });

  const developmentInput = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'secure pass 123',
    role: 'admin',
    adminInvitationCode: '1234',
  };
  assert.equal(validateRegistrationInput(developmentInput, { NODE_ENV: 'development' }).value.role, 'admin');
  assert.equal(validateRegistrationInput(developmentInput, {
    NODE_ENV: 'production',
    ADMIN_REGISTRATION_CODE: '1234',
  }).status, 403);
});

test('valida credenciales de inicio de sesión sin modificar la contraseña', () => {
  assert.deepEqual(validateLoginInput({ email: ' User@Example.com ', password: ' pass 123 ' }), {
    value: { email: 'user@example.com', password: ' pass 123 ' },
  });
  assert.equal(validateLoginInput({ email: 'invalid', password: 'password123' }).status, 400);
  assert.equal(validateLoginInput({ email: 'user@example.com', password: '' }).status, 400);
});

test('requiere una clave JWT configurada y suficientemente larga', () => {
  assert.throws(() => getJwtSecret({}), /JWT_SECRET/);
  assert.throws(() => getJwtSecret({ JWT_SECRET: 'too-short' }), /JWT_SECRET/);
  assert.equal(getJwtSecret({ JWT_SECRET: 'an-example-secret-with-at-least-32-chars' }), 'an-example-secret-with-at-least-32-chars');
});

test('el middleware administrativo permite admin y rechaza user o sesión ausente', () => {
  const middleware = requireRole('admin');
  let nextCalled = false;
  const denied = {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  middleware({ user: { role: 'user' } }, denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  middleware({ user: { role: 'admin' } }, denied, () => { nextCalled = true; });
  assert.equal(nextCalled, true);

  nextCalled = false;
  middleware({}, denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);
});
