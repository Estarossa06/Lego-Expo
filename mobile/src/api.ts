import { Platform } from 'react-native';
import type { OrderPayload, Product, StoreOrder, User } from './types';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15000;

type Json = Record<string, unknown>;

async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
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

export async function registerAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  adminInvitationCode?: string;
}) {
  const data: unknown = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readAuthResponse(data);
}

export async function loginAccount(input: { email: string; password: string }) {
  const data: unknown = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readAuthResponse(data);
}

export async function fetchCurrentUser(token: string) {
  const data = await request<{ user: unknown }>('/auth/me', undefined, token);
  if (!isUser(data.user)) throw new Error('La tienda devolvió una sesión con formato inválido.');
  return data.user;
}

export async function logoutAccount(token: string) {
  await request<{ ok: boolean }>('/auth/logout', { method: 'POST' }, token);
}

export async function fetchAdminProducts(token: string) {
  const data = await request<{ products: unknown }>('/admin/products', undefined, token);
  if (!Array.isArray(data.products) || !data.products.every(isProduct)) {
    throw new Error('La respuesta del panel no contiene productos con el formato esperado.');
  }
  return data.products;
}

export async function createAdminProduct(token: string, product: Partial<Product> & Pick<Product, 'id' | 'name' | 'description' | 'category' | 'imageUrl'> & { priceCents: number; stock: number }) {
  const data = await request<{ product: Product }>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }, token);
  return data.product;
}

export async function updateAdminProduct(token: string, id: string, patch: Partial<Product>) {
  const data = await request<{ product: Product }>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }, token);
  return data.product;
}

export async function deleteAdminProduct(token: string, id: string) {
  const data = await request<{ deleted: boolean; product: Product }>(`/admin/products/${id}`, {
    method: 'DELETE',
  }, token);
  return data;
}

export async function sendOrder(payload: OrderPayload, token?: string) {
  return request<{ order: StoreOrder }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

function isProduct(product: unknown): product is Product {
  if (typeof product !== 'object' || product === null) return false;
  const item = product as Json;
  return typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.description === 'string' &&
    Number.isInteger(item.priceCents) &&
    Number.isInteger(item.stock) &&
    typeof item.imageUrl === 'string' && /^https?:\/\//.test(item.imageUrl) &&
    typeof item.category === 'string';
}

function readAuthResponse(data: unknown): { token: string; user: User } {
  if (typeof data !== 'object' || data === null || !('token' in data) || !('user' in data)) {
    throw new Error('La tienda devolvió una respuesta de autenticación inválida.');
  }
  const result = data as { token: unknown; user: unknown };
  if (typeof result.token !== 'string' || !result.token || !isUser(result.user)) {
    throw new Error('La tienda devolvió una sesión con formato inválido.');
  }
  return { token: result.token, user: result.user };
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'admin') &&
    typeof user.isActive === 'boolean' &&
    typeof user.createdAt === 'string';
}