import * as Network from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { fetchProducts, sendOrder } from './api';
import { getDeviceId, readCart, readOrders, readProducts, saveProducts } from './database';
import type { CartItem, Customer, OrderItem, OrderPayload, Product, StoreOrder } from './types';

type StoreContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: StoreOrder[];
  online: boolean;
  serverAvailable: boolean;
  catalogError: string | null;
  loading: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  setCartQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  placeOrder: (customer: Customer) => Promise<string>;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [online, setOnline] = useState(false);
  const [serverAvailable, setServerAvailable] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const syncing = useRef(false);

  const refresh = useCallback(async () => {
    const [nextProducts, nextCart, nextOrders] = await Promise.all([
      readProducts(db),
      readCart(db),
      readOrders(db),
    ]);
    setProducts(nextProducts);
    setCart(nextCart);
    setOrders(nextOrders);
  }, [db]);

  const syncCatalog = useCallback(async () => {
    try {
      const latest = await fetchProducts();
      await saveProducts(db, latest);
      setServerAvailable(true);
      setCatalogError(null);
      await refresh();
    } catch (reason) {
      setServerAvailable(false);
      setCatalogError(reason instanceof Error ? reason.message : 'No se pudo actualizar el catálogo.');
      throw reason;
    }
  }, [db, refresh]);

  const syncOrder = useCallback(async (id: string) => {
    const row = await db.getFirstAsync<{ payload_json: string }>(
      'SELECT payload_json FROM orders WHERE id = ?',
      id,
    );
    if (!row) return;

    await db.runAsync("UPDATE orders SET status = 'processing' WHERE id = ?", id);
    await refresh();
    try {
      const { order } = await sendOrder(JSON.parse(row.payload_json) as OrderPayload);
      setServerAvailable(true);
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          'UPDATE orders SET status = ?, subtotal_cents = ?, total_cents = ?, rejection_reason = ? WHERE id = ?',
          order.status,
          order.subtotalCents,
          order.totalCents,
          order.rejectionReason,
          id,
        );
        if (order.status === 'completed') {
          await db.runAsync('DELETE FROM order_items WHERE order_id = ?', id);
          for (const item of order.items) {
            await db.runAsync(
              `INSERT INTO order_items (order_id, product_id, name, quantity, price_cents, image_url)
               VALUES (?, ?, ?, ?, ?, ?)`,
              id,
              item.productId,
              item.name,
              item.quantity,
              item.priceCents,
              item.imageUrl,
            );
          }
        }
      });
      if (order.status === 'completed') await syncCatalog();
    } catch (reason) {
      const error = reason as Error & { status?: number };
      if (error.status && error.status < 500) {
        setServerAvailable(true);
        await db.runAsync("UPDATE orders SET status = 'rejected', rejection_reason = ? WHERE id = ?", error.message, id);
      } else {
        setServerAvailable(false);
        await db.runAsync("UPDATE orders SET status = 'pending_sync' WHERE id = ?", id);
      }
    }
    await refresh();
  }, [db, refresh, syncCatalog]);

  const syncPending = useCallback(async () => {
    const pending = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM orders WHERE status = 'pending_sync' ORDER BY created_at",
    );
    for (const order of pending) await syncOrder(order.id);
  }, [db, syncOrder]);

  const syncWhenOnline = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      await syncCatalog();
      await syncPending();
    } catch {
      // El catálogo local sigue disponible cuando falla la red o el API.
    } finally {
      syncing.current = false;
    }
  }, [syncCatalog, syncPending]);

  useEffect(() => {
    let active = true;
    const subscription = Network.addNetworkStateListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(connected);
      if (connected) void syncWhenOnline();
    });

    void (async () => {
      await refresh();
      if (active) setLoading(false);
      const state = await Network.getNetworkStateAsync();
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (active) setOnline(connected);
      await syncWhenOnline();
    })();

    return () => {
      active = false;
      subscription.remove();
    };
  }, [db, refresh, syncWhenOnline]);

  const addToCart = async (product: Product, quantity = 1) => {
    if (product.stock < 1) throw new Error('Este producto no tiene existencias.');
    await db.runAsync(
      `INSERT INTO cart (product_id, quantity) VALUES (?, ?)
       ON CONFLICT(product_id) DO UPDATE SET quantity = MIN(99, quantity + excluded.quantity)`,
      product.id,
      quantity,
    );
    await refresh();
  };

  const setCartQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    await db.runAsync('UPDATE cart SET quantity = MIN(99, ?) WHERE product_id = ?', quantity, productId);
    await refresh();
  };

  const removeFromCart = async (productId: string) => {
    await db.runAsync('DELETE FROM cart WHERE product_id = ?', productId);
    await refresh();
  };

  const placeOrder = async (customer: Customer) => {
    if (!cart.length) throw new Error('El carrito está vacío.');
    const id = Crypto.randomUUID();
    const deviceId = await getDeviceId(db);
    const items: OrderItem[] = cart.map((item) => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents,
      imageUrl: item.imageUrl,
    }));
    const payload: OrderPayload = {
      id,
      deviceId,
      customer,
      items: items.map(({ productId, quantity, priceCents }) => ({ productId, quantity, priceCents })),
    };
    const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO orders (id, device_id, status, created_at, customer_json, payload_json, subtotal_cents, total_cents)
         VALUES (?, ?, 'pending_sync', ?, ?, ?, ?, ?)`,
        id,
        deviceId,
        new Date().toISOString(),
        JSON.stringify(customer),
        JSON.stringify(payload),
        subtotal,
        subtotal,
      );
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO order_items (order_id, product_id, name, quantity, price_cents, image_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          id,
          item.productId,
          item.name,
          item.quantity,
          item.priceCents,
          item.imageUrl,
        );
      }
      await db.runAsync('DELETE FROM cart');
    });
    await refresh();
    if (online) await syncOrder(id);
    return id;
  };

  return (
    <StoreContext.Provider value={{ products, cart, orders, online, serverAvailable, catalogError, loading, addToCart, setCartQuantity, removeFromCart, placeOrder, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore requiere StoreProvider.');
  return context;
}