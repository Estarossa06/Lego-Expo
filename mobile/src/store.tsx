import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { useSQLiteContext } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { fetchAdminProducts, fetchCurrentUser, fetchProducts, loginAccount, logoutAccount, registerAccount, sendOrder, updateAdminProduct } from './api';
import { getDeviceId, readCart, readOrders, readProducts, saveProducts } from './database';
import type { CartItem, Customer, OrderItem, OrderPayload, Product, StoreOrder, User } from './types';

type Session = { token: string; user: User };

type StoreContextValue = {
  products: Product[];
  cart: CartItem[];
  orders: StoreOrder[];
  online: boolean;
  serverAvailable: boolean;
  catalogError: string | null;
  loading: boolean;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authReady: boolean;
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  setCartQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  placeOrder: (customer: Customer) => Promise<string>;
  refresh: (ownerUserId?: string | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    adminInvitationCode?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadAdminProducts: () => Promise<Product[]>;
  updateAdminStock: (productId: string, stock: number) => Promise<Product>;
};

const SESSION_KEY = 'lego_session';

function isStoredSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  const user = session.user;
  return typeof session.token === 'string' &&
    Boolean(user && typeof user === 'object') &&
    typeof user?.id === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'admin');
}

const safeStorage = {
  async getItemAsync(key: string) {
    if (Platform.OS === 'web') {
      try {
        return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
        return;
      } catch {
        return;
      }
    }
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem(key);
        return;
      } catch {
        return;
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
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
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const syncing = useRef(false);

  const persistSession = useCallback(async (session: Session | null) => {
    if (session) {
      await safeStorage.setItemAsync(SESSION_KEY, JSON.stringify(session));
    } else {
      await safeStorage.deleteItemAsync(SESSION_KEY);
    }
    setUser(session?.user ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const rawSession = await safeStorage.getItemAsync(SESSION_KEY);
      let session: Session | null = null;
      if (rawSession) {
        try {
          const parsed: unknown = JSON.parse(rawSession);
          if (!isStoredSession(parsed)) throw new Error('La sesión guardada no tiene un formato válido.');
          session = parsed;
        } catch {
          await safeStorage.deleteItemAsync(SESSION_KEY);
        }
      }
      if (active && session) {
        try {
          const currentUser = await fetchCurrentUser(session.token);
          if (active) {
            setUser(currentUser);
            await safeStorage.setItemAsync(SESSION_KEY, JSON.stringify({ token: session.token, user: currentUser }));
          }
        } catch (reason) {
          const status = (reason as Error & { status?: number }).status;
          if (status === 401 || status === 403) {
            await safeStorage.deleteItemAsync(SESSION_KEY);
            if (active) setUser(null);
          } else if (active) {
            setUser(session.user);
          }
        }
      }
      if (active) setAuthReady(true);
    })();

    return () => { active = false; };
  }, []);

  const refresh = useCallback(async (ownerUserId: string | null = user?.id ?? null) => {
    const [nextProducts, nextCart, nextOrders] = await Promise.all([
      readProducts(db),
      readCart(db, ownerUserId),
      readOrders(db, ownerUserId),
    ]);
    setProducts(nextProducts);
    setCart(nextCart);
    setOrders(nextOrders);
  }, [db, user?.id]);

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
    if (!user) return;
    const row = await db.getFirstAsync<{ payload_json: string; owner_user_id: string | null }>(
      'SELECT payload_json, owner_user_id FROM orders WHERE id = ?',
      id,
    );
    if (!row || row.owner_user_id !== user.id) return;
    const sessionRaw = await safeStorage.getItemAsync(SESSION_KEY);
    const parsed: unknown = sessionRaw ? JSON.parse(sessionRaw) : null;
    if (!isStoredSession(parsed) || parsed.user.id !== user.id) return;

    await db.runAsync("UPDATE orders SET status = 'processing' WHERE id = ?", id);
    await refresh();
    try {
      const { order } = await sendOrder(JSON.parse(row.payload_json) as OrderPayload, parsed.token);
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
          for (const item of order.items) {
            await db.runAsync(
              'DELETE FROM cart WHERE owner_user_id = ? AND product_id = ? AND quantity <= ?',
              user.id,
              item.productId,
              item.quantity,
            );
            await db.runAsync(
              'UPDATE cart SET quantity = quantity - ? WHERE owner_user_id = ? AND product_id = ? AND quantity > ?',
              item.quantity,
              user.id,
              item.productId,
              item.quantity,
            );
          }
        }
      });
      if (order.status === 'completed') {
        try {
          await syncCatalog();
        } catch {
          // syncCatalog records the refresh failure without changing the confirmed order.
        }
      }
    } catch (reason) {
      const error = reason as Error & { status?: number };
      if (error.status === 401 || error.status === 403) {
        setServerAvailable(true);
        await db.runAsync("UPDATE orders SET status = 'pending_sync' WHERE id = ?", id);
      } else if (error.status && error.status < 500) {
        setServerAvailable(true);
        await db.runAsync("UPDATE orders SET status = 'rejected', rejection_reason = ? WHERE id = ?", error.message, id);
      } else {
        setServerAvailable(false);
        await db.runAsync("UPDATE orders SET status = 'pending_sync' WHERE id = ?", id);
      }
    }
    await refresh();
  }, [db, refresh, syncCatalog, user]);

  const syncPending = useCallback(async () => {
    if (!user) return;
    const pending = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM orders WHERE owner_user_id = ? AND status = 'pending_sync' ORDER BY created_at",
      user.id,
    );
    for (const order of pending) await syncOrder(order.id);
  }, [db, syncOrder, user]);

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
    if (!user) throw new Error('Inicia sesión antes de agregar productos al carrito.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('La cantidad debe ser un entero entre 1 y 99.');
    }
    const inventory = await db.getFirstAsync<{ stock: number }>(
      'SELECT stock FROM products WHERE id = ?',
      product.id,
    );
    if (!inventory || inventory.stock < 1) throw new Error('Este producto no tiene existencias.');
    const current = await db.getFirstAsync<{ quantity: number }>(
      'SELECT quantity FROM cart WHERE owner_user_id = ? AND product_id = ?',
      user.id,
      product.id,
    );
    const nextQuantity = (current?.quantity ?? 0) + quantity;
    if (nextQuantity > inventory.stock || nextQuantity > 99) {
      throw new Error(`Solo hay ${inventory.stock} unidades disponibles; ya tienes ${current?.quantity ?? 0} en tu carrito.`);
    }
    await db.runAsync(
      `INSERT INTO cart (owner_user_id, product_id, quantity) VALUES (?, ?, ?)
       ON CONFLICT(owner_user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`,
      user.id,
      product.id,
      quantity,
    );
    await refresh();
  };

  const setCartQuantity = async (productId: string, quantity: number) => {
    if (!user) throw new Error('Inicia sesión para modificar tu carrito.');
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    if (!Number.isInteger(quantity) || quantity > 99) {
      throw new Error('La cantidad debe ser un entero entre 1 y 99.');
    }
    const inventory = await db.getFirstAsync<{ stock: number }>(
      'SELECT stock FROM products WHERE id = ?',
      productId,
    );
    if (!inventory || quantity > inventory.stock) {
      throw new Error(`Solo hay ${inventory?.stock ?? 0} unidades disponibles.`);
    }
    await db.runAsync(
      'UPDATE cart SET quantity = ? WHERE owner_user_id = ? AND product_id = ?',
      quantity,
      user.id,
      productId,
    );
    await refresh();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) throw new Error('Inicia sesión para modificar tu carrito.');
    await db.runAsync('DELETE FROM cart WHERE owner_user_id = ? AND product_id = ?', user.id, productId);
    await refresh();
  };

  const placeOrder = async (customer: Customer) => {
    if (!user) throw new Error('Inicia sesión antes de confirmar una compra.');
    await syncCatalog();
    const checkoutCart = await readCart(db, user.id);
    if (!checkoutCart.length) throw new Error('El carrito está vacío.');
    const unavailable = checkoutCart.find((item) => item.quantity > item.stock);
    if (unavailable) {
      throw new Error(`Solo hay ${unavailable.stock} unidades de ${unavailable.name}; ajusta la cantidad del carrito.`);
    }
    const id = Crypto.randomUUID();
    const deviceId = await getDeviceId(db);
    const items: OrderItem[] = checkoutCart.map((item) => ({
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
        `INSERT INTO orders (id, device_id, owner_user_id, status, created_at, customer_json, payload_json, subtotal_cents, total_cents)
         VALUES (?, ?, ?, 'pending_sync', ?, ?, ?, ?, ?)`,
        id,
        deviceId,
        user.id,
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
    });
    await refresh();
    await syncOrder(id);
    return id;
  };

  const login = async (email: string, password: string) => {
    const { token, user: nextUser } = await loginAccount({ email, password });
    await persistSession({ token, user: nextUser });
    await refresh(nextUser.id);
  };

  const register = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'user' | 'admin';
    adminInvitationCode?: string;
  }) => {
    const { token, user: nextUser } = await registerAccount(payload);
    await persistSession({ token, user: nextUser });
    await refresh(nextUser.id);
  };

  const logout = async () => {
    const raw = await safeStorage.getItemAsync(SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    await persistSession(null);
    await refresh(null);
    if (isStoredSession(parsed)) await logoutAccount(parsed.token);
  };

  const loadAdminProducts = useCallback(async () => {
    if (user?.role !== 'admin') throw new Error('Solo un administrador puede consultar el inventario.');
    const raw = await safeStorage.getItemAsync(SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!isStoredSession(parsed) || parsed.user.id !== user.id) {
      throw new Error('La sesión administrativa no está disponible. Inicia sesión nuevamente.');
    }
    return fetchAdminProducts(parsed.token);
  }, [user]);

  const updateAdminStock = useCallback(async (productId: string, stock: number) => {
    if (user?.role !== 'admin') throw new Error('Solo un administrador puede modificar existencias.');
    if (!Number.isInteger(stock) || stock < 0) throw new Error('La existencia debe ser un entero no negativo.');
    const raw = await safeStorage.getItemAsync(SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!isStoredSession(parsed) || parsed.user.id !== user.id) {
      throw new Error('La sesión administrativa no está disponible. Inicia sesión nuevamente.');
    }
    const product = await updateAdminProduct(parsed.token, productId, { stock });
    await saveProducts(db, [product]);
    await refresh();
    return product;
  }, [db, refresh, user]);

  return (
    <StoreContext.Provider value={{
      products,
      cart,
      orders,
      online,
      serverAvailable,
      catalogError,
      loading,
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      authReady,
      addToCart,
      setCartQuantity,
      removeFromCart,
      placeOrder,
      refresh,
      login,
      register,
      logout,
      loadAdminProducts,
      updateAdminStock,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore requiere StoreProvider.');
  return context;
}