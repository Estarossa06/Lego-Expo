export class DatabaseConfigurationError extends Error {}

export function getDatabaseConfig(env = process.env) {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError('DATABASE_URL no está configurada. Cree api/.env a partir de api/.env.example y configure PostgreSQL.');
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabaseConfigurationError('DATABASE_URL no tiene un formato válido de URL PostgreSQL.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new DatabaseConfigurationError('DATABASE_URL debe incluir el esquema PostgreSQL, host y nombre de base de datos.');
  }
  if (!url.username || !url.password) {
    throw new DatabaseConfigurationError('DATABASE_URL debe incluir usuario y contraseña. Codifique los caracteres reservados con percent-encoding.');
  }

  try {
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    throw new DatabaseConfigurationError('DATABASE_URL contiene caracteres URL mal codificados en las credenciales.');
  }

  const authority = connectionString.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1];
  const userInfo = authority?.slice(0, authority.lastIndexOf('@'));
  const separator = userInfo?.indexOf(':') ?? -1;
  const rawUsername = separator >= 0 ? userInfo.slice(0, separator) : '';
  const rawPassword = separator >= 0 ? userInfo.slice(separator + 1) : '';
  if (/%(?![0-9a-f]{2})/i.test(`${rawUsername}${rawPassword}`) ||
      /[!$&'()*+,;=:/?#\[\]@\\\s]/.test(rawUsername) ||
      /[!$&'()*+,;=:/?#\[\]@\\\s]/.test(rawPassword)) {
    throw new DatabaseConfigurationError('Codifique los caracteres reservados de usuario y contraseña con percent-encoding en DATABASE_URL.');
  }

  const sslSetting = env.DATABASE_SSL?.trim().toLowerCase();
  if (sslSetting && sslSetting !== 'true' && sslSetting !== 'false') {
    throw new DatabaseConfigurationError('DATABASE_SSL debe ser true o false.');
  }
  const urlSslMode = url.searchParams.get('sslmode')?.toLowerCase();
  const sslModes = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);
  if (urlSslMode && !sslModes.has(urlSslMode)) {
    throw new DatabaseConfigurationError('DATABASE_URL contiene un valor sslmode no reconocido.');
  }
  const urlRequiresSsl = Boolean(urlSslMode && urlSslMode !== 'disable');
  if (sslSetting === 'false' && urlRequiresSsl) {
    throw new DatabaseConfigurationError('DATABASE_SSL=false contradice el modo SSL de DATABASE_URL.');
  }
  if (sslSetting === 'true' && urlSslMode === 'disable') {
    throw new DatabaseConfigurationError('DATABASE_SSL=true contradice sslmode=disable en DATABASE_URL.');
  }
  const ssl = sslSetting === 'true' || (!sslSetting && urlRequiresSsl);
  if (urlSslMode) url.searchParams.delete('sslmode');

  return {
    connectionString: url.toString(),
    ssl: ssl ? true : undefined,
  };
}
