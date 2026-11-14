import { createHash, timingSafeEqual } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_BCRYPT_PASSWORD_BYTES = 72;
const MIN_ADMIN_INVITATION_LENGTH = 32;
const DEVELOPMENT_ADMIN_INVITATION_CODE = '1234';

function matchesAdminInvitation(candidate, environment) {
  const configuredCode = typeof environment.ADMIN_REGISTRATION_CODE === 'string'
    ? environment.ADMIN_REGISTRATION_CODE.trim()
    : '';
  const isProduction = environment.NODE_ENV === 'production';
  const expectedCode = configuredCode || (isProduction ? '' : DEVELOPMENT_ADMIN_INVITATION_CODE);
  const isDevelopmentCode = !isProduction && expectedCode === DEVELOPMENT_ADMIN_INVITATION_CODE;
  if (!candidate || (expectedCode.length < MIN_ADMIN_INVITATION_LENGTH && !isDevelopmentCode)) return false;

  const candidateHash = createHash('sha256').update(candidate, 'utf8').digest();
  const configuredHash = createHash('sha256').update(expectedCode, 'utf8').digest();
  return timingSafeEqual(candidateHash, configuredHash);
}

export function validateRegistrationInput(body, environment = process.env) {
  const firstName = typeof body?.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body?.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = body?.role === undefined ? 'user' : body.role;

  if (role !== 'user' && role !== 'admin') {
    return { status: 400, error: 'El tipo de cuenta solicitado no es válido.' };
  }
  if (!firstName || !lastName || !email || !password) {
    return { status: 400, error: 'Nombre, apellido, correo y contraseña son obligatorios.' };
  }
  if (firstName.length > 80 || lastName.length > 80) {
    return { status: 400, error: 'El nombre y el apellido no pueden superar 80 caracteres.' };
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { status: 400, error: 'Introduce un correo electrónico válido.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH || Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return { status: 400, error: 'La contraseña debe tener entre 8 caracteres y 72 bytes.' };
  }

  if (role === 'admin') {
    const invitationCode = typeof body?.adminInvitationCode === 'string'
      ? body.adminInvitationCode.trim()
      : '';
    if (invitationCode.length > 256 || !matchesAdminInvitation(invitationCode, environment)) {
      return { status: 403, error: 'El código de invitación administrativa no es válido.' };
    }
  }

  return { value: { firstName, lastName, email, password, role } };
}

export function validateLoginInput(body) {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) {
    return { status: 400, error: 'Correo y contraseña son obligatorios.' };
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { status: 400, error: 'Introduce un correo electrónico válido.' };
  }
  return { value: { email, password } };
}

export function getJwtSecret(environment = process.env) {
  const secret = typeof environment.JWT_SECRET === 'string' ? environment.JWT_SECRET.trim() : '';
  if (secret.length < 32 || secret === 'replace-with-a-long-random-secret') {
    throw new Error('Configure JWT_SECRET con al menos 32 caracteres aleatorios antes de iniciar la API.');
  }
  return secret;
}
