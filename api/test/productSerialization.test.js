import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeProduct } from '../src/productSerialization.js';

test('serializes products returned with PostgreSQL column names', () => {
  assert.deepEqual(sanitizeProduct({
    id: '60401',
    name: 'Road Roller',
    description: 'A construction vehicle.',
    price_cents: '2799',
    stock: '9',
    image_url: 'https://example.com/road-roller.png',
    category: 'City',
    is_active: true,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-02T00:00:00.000Z',
  }), {
    id: '60401',
    name: 'Road Roller',
    description: 'A construction vehicle.',
    priceCents: 2799,
    stock: 9,
    imageUrl: 'https://example.com/road-roller.png',
    category: 'City',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  });
});

test('serializes products returned with camel-case aliases', () => {
  assert.deepEqual(sanitizeProduct({
    id: '60401',
    name: 'Road Roller',
    description: 'A construction vehicle.',
    priceCents: 2799,
    stock: 9,
    imageUrl: 'https://example.com/road-roller.png',
    category: 'City',
    isActive: true,
  }), {
    id: '60401',
    name: 'Road Roller',
    description: 'A construction vehicle.',
    priceCents: 2799,
    stock: 9,
    imageUrl: 'https://example.com/road-roller.png',
    category: 'City',
    isActive: true,
    createdAt: undefined,
    updatedAt: undefined,
  });
});
