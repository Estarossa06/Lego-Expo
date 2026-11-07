import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidUUID, validateInventory, validateOrder } from '../src/orderValidation.js';

const order = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  deviceId: 'device-1',
  customer: { name: 'Ana Ruiz', phone: '55512345', email: 'ana@example.com', address: 'Calle 1' },
  items: [{ productId: '31145', quantity: 2, priceCents: 999 }],
};
const product = { id: '31145', name: 'Dragón rojo', price_cents: 999, stock: 3 };

test('acepta un pedido válido y su UUID', () => {
  assert.equal(isValidUUID(order.id), true);
  assert.equal(validateOrder(order), null);
});

test('rechaza UUID, correo, cantidades y productos duplicados inválidos', () => {
  assert.equal(isValidUUID('no-es-uuid'), false);
  assert.match(validateOrder({ ...order, customer: { ...order.customer, email: 'invalido' } }), /inválidos/);
  assert.match(validateOrder({ ...order, items: [{ ...order.items[0], quantity: 0 }] }), /cantidades inválidas/);
  assert.match(validateOrder({ ...order, items: [...order.items, order.items[0]] }), /cantidades inválidas/);
});

test('valida precio actual y existencias antes de aceptar', () => {
  assert.equal(validateInventory(order.items, [product]), null);
  assert.match(validateInventory([{ ...order.items[0], priceCents: 1000 }], [product]), /precio.*cambió/);
  assert.match(validateInventory([{ ...order.items[0], quantity: 4 }], [product]), /existencias/);
  assert.match(validateInventory([{ ...order.items[0], productId: 'missing' }], [product]), /ya no está disponible/);
});