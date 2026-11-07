import { Platform } from 'react-native';
import type { OrderPayload, Product, StoreOrder } from './types';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      signal: controller.signal,
    });
  } catch (reason) {
    if (controller.signal.aborted) throw new Error('La tienda tardó demasiado en responder.');
    throw new Error(reason instanceof Error ? `No se pudo conectar con la tienda: ${reason.message}` : 'No se pudo conectar con la tienda.');
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : undefined;
  } catch {
    data = undefined;
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
      ? data.error
      : `La tienda respondió con el estado ${response.status}.`;
    const error = new Error(message) as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  if (data === undefined) throw new Error('La tienda devolvió una respuesta vacía o con formato inválido.');
  return data as T;
}

export async function fetchProducts() {
  const data = await request<{ products: unknown }>('/products');
  if (!Array.isArray(data.products) || !data.products.every(isProduct)) {
    throw new Error('La respuesta del catálogo no contiene productos con el formato esperado.');
  }
  return data.products;
}

export async function sendOrder(payload: OrderPayload) {
  return request<{ order: StoreOrder }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function isProduct(product: unknown): product is Product {
  if (typeof product !== 'object' || product === null) return false;
  const item = product as Record<string, unknown>;
  return typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.description === 'string' &&
    Number.isInteger(item.priceCents) &&
    Number.isInteger(item.stock) &&
    typeof item.imageUrl === 'string' && /^https?:\/\//.test(item.imageUrl) &&
    typeof item.category === 'string';
}