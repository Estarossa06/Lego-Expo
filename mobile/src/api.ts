import { Platform } from 'react-native';
import type { OrderPayload, Product, StoreOrder } from './types';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? 'No se pudo conectar con el servidor.') as Error & { status: number };
    error.status = response.status;
    throw error;
  }
  return data as T;
}

export async function fetchProducts() {
  const data = await request<{ products: Product[] }>('/products');
  return data.products;
}

export async function sendOrder(payload: OrderPayload) {
  return request<{ order: StoreOrder }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}