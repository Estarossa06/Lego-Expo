# LEGO Expo

Aplicación académica de catálogo, carrito y checkout para sets LEGO con backend Express + PostgreSQL y cliente Expo/React Native.

## Arquitectura

- `api/`: backend en Node.js + Express 5 + PostgreSQL (fuente principal de inventario y pedidos).
- `mobile/`: aplicación Expo Router + React Native + SQLite local para UX y sincronización offline.
- `api/sql/schema.sql`: migración y esquema de base de datos.

## Requisitos

- Node.js 20+
- npm
- PostgreSQL 15+
- Expo CLI (`npx expo start`)

## Configuración del entorno

### Backend (`api/.env`)

```env
PORT=3000
DATABASE_URL=postgresql://lego:lego_local@localhost:5432/lego_store
DATABASE_SSL=false
CORS_ORIGIN=http://localhost:8081,http://10.0.2.2:8081,http://192.168.1.10:8081
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_REGISTRATION_CODE=
```

- `DATABASE_URL`: conexión a PostgreSQL Neon o local.
- `DATABASE_SSL`: `false` en entorno local; `true` para servicios con TLS obligatorio.
- `CORS_ORIGIN`: orígenes autorizados para la API.
- `JWT_SECRET`: clave aleatoria de al menos 32 caracteres. Genérela con `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. La API no inicia sin ella.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`: opcionales; se usan para crear el primer administrador. La contraseña debe tener al menos 12 caracteres y no superar 72 bytes.
- `ADMIN_REGISTRATION_CODE`: en desarrollo/pruebas se puede usar `12345678`. En producción, configura una invitación privada aleatoria de al menos 32 caracteres, por ejemplo con `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`, y compártela únicamente con las personas autorizadas. La API rechaza `12345678` en producción. Nunca pongas el código en `mobile/.env` ni en el código del cliente.

### Móvil (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

Usa `http://10.0.2.2:3000/api` en Android Emulator o la IP del equipo para un dispositivo real.
En `mobile/.env` solo debe existir `EXPO_PUBLIC_API_URL`; `DATABASE_URL` y cualquier secreto deben permanecer exclusivamente en el backend.

## Instalación

### 1) Backend

```bash
cd api
npm install
cp .env.example .env
npm run seed
npm run dev
```

### 2) Móvil

```bash
cd mobile
npm install
cp .env.example .env
npx expo start --clear
```

## Base de datos y migraciones

1. Crear la base de datos PostgreSQL (`lego_store` o la indicada en `DATABASE_URL`).
2. Ejecutar la migración inicial:

```bash
cd api
npm run seed
```

`api/seed.js` crea el esquema si falta y carga el catálogo base. La ejecución es idempotente y conserva stock y pedidos existentes. Si se configuran `ADMIN_EMAIL` y `ADMIN_PASSWORD`, también crea la cuenta administrativa inicial.

El esquema incluye:

- `users` con roles `user` y `admin`
- `products` con inventario real y precios
- `orders` y `order_items` con historial de pedidos y precios capturados
- restricciones y validaciones de stock y cantidades

## Crear el primer administrador

El registro público solo crea usuarios normales; elegir o enviar `admin` no otorga privilegios. Para crear al primer administrador, configura en `api/.env` una dirección nueva y una contraseña fuerte:

```env
ADMIN_EMAIL=admin@tu-dominio.example
ADMIN_PASSWORD=una-contraseña-aleatoria-de-12-caracteres-o-más
```

```bash
cd api
npm run seed:admin
```

Este bootstrap crea el administrador solo si el correo aún no existe y nunca promociona una cuenta de usuario. Para Render, `JWT_SECRET` se genera en el blueprint; completa `ADMIN_EMAIL` y `ADMIN_PASSWORD` como variables secretas del servicio antes de arrancar la API. No uses credenciales de ejemplo en producción.

## Autenticación y roles

- La aplicación inicia en acceso y permite registro o inicio de sesión.
- El registro valida nombre, apellido, correo, contraseña y confirmación; PostgreSQL impone el correo único. Se puede seleccionar Usuario o Administrador; la opción administrativa solo se acepta con el código de invitación configurado exclusivamente en la API.
- Las contraseñas se guardan con bcrypt; los JWT expiran a los 7 días y se pueden revocar al cerrar sesión.
- Expo SecureStore conserva el token en iOS/Android; el navegador usa su alternativa de almacenamiento web. Nunca se persiste la contraseña.
- El backend carga el rol activo desde PostgreSQL y protege pedidos y endpoints de administración; los claims del cliente no conceden permisos.
- El backend rechaza la asignación de `admin` sin invitación válida; en desarrollo/pruebas el código es `12345678`, mientras que producción exige un código aleatorio de 32 caracteres o más. El panel administrativo verifica el rol y la API aplica autorización en cada endpoint.
- La pestaña **Cuenta** permite cerrar sesión e ingresar con otra cuenta.
- Cada cuenta conserva su propio carrito local, separado por el identificador de usuario. Los carritos antiguos sin propietario no se asignan a una cuenta; el inventario sigue siendo global en PostgreSQL.

## Inventario y compras

- El stock real vive en PostgreSQL.
- El backend valida inventario y cantidades antes de aceptar un pedido.
- La reducción de stock se ejecuta dentro de la transacción del pedido.
- La compra no se confirma si la cantidad supera el stock disponible.
- Los pedidos duplicados se rechazan mediante idempotencia.

## Facturación PDF

Tras una compra confirmada, el usuario puede descargar la factura desde la confirmación o el historial del pedido. La factura toma datos reales del pedido y guarda precios históricos por producto para que facturas anteriores no cambien si el catálogo se actualiza.

## Ejecución del backend

```bash
cd api
npm run dev
```

Endpoints principales:

- `GET /api/products`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/orders` (requiere Bearer token)
- `POST /api/orders` (requiere Bearer token)
- `GET /api/admin/products`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`

## Pruebas

```bash
cd api
node --test
```

```bash
cd mobile
npx.cmd tsc --noEmit
npx.cmd expo-doctor
```

## Revisión de entrega

La aplicación conserva el flujo de catálogo, carrito local, sincronización offline y compatibilidad con Expo Router. La marca visual se actualizó para usar el logotipo oficial de LEGO sin la palabra `STORE` y sin rediseñar el catálogo base. El PNG del encabezado procede del recurso oficial [brand-lego.svg](https://assets.lego.com/logos/v8.5.0/brand-lego.svg); LEGO es una marca registrada de LEGO Group.

## Exportación ZIP final

Se genera un ZIP final del repositorio excluyendo dependencias, cachés, secretos y artefactos de compilación. El archivo debe estar en la raíz del proyecto con el nombre:

```text
Lego-Expo-Entrega.zip
```

## Archivos importantes

- `api/sql/schema.sql`
- `api/src/app.js`
- `api/src/db.js`
- `api/seed.js`
- `mobile/src/store.tsx`
- `mobile/src/ui.tsx`
- `mobile/src/invoice.ts`

## Notas de seguridad

- No se deben commitear `.env` ni secretos.
- No se almacenan contraseñas ni datos sensibles en el móvil.
- La asignación de rol administrativo se controla en el backend.
- El stock y la autenticación se validan siempre en PostgreSQL y con JWT.
