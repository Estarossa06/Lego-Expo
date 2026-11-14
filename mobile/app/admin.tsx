import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../src/store';
import { ActionButton, colors, Field, LoadingState, Notice, PageHeader, Screen, SectionTitle, StoreHeader } from '../src/ui';
import type { Product } from '../src/types';

export default function AdminScreen() {
  const { cart, isAdmin, loadAdminProducts, updateAdminStock } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = await loadAdminProducts();
      setProducts(current);
      setStockDrafts(Object.fromEntries(current.map((product) => [product.id, String(product.stock)])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }, [loadAdminProducts]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/catalog');
      return;
    }
    let active = true;
    loadAdminProducts()
      .then((current) => {
        if (!active) return;
        setProducts(current);
        setStockDrafts(Object.fromEntries(current.map((product) => [product.id, String(product.stock)])));
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el inventario.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isAdmin, loadAdminProducts]);

  const saveStock = async (product: Product) => {
    const stock = Number(stockDrafts[product.id]);
    if (!Number.isInteger(stock) || stock < 0) {
      setError('La existencia debe ser un entero no negativo.');
      return;
    }
    setSavingId(product.id);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminStock(product.id, stock);
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStockDrafts((current) => ({ ...current, [updated.id]: String(updated.stock) }));
      setNotice(`Existencias guardadas para ${updated.name}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar las existencias.');
    } finally {
      setSavingId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <Screen>
      <StoreHeader cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartPress={() => router.push('/(tabs)/cart')} caption="Administración" />
      <PageHeader label="SOLO ADMINISTRADORES" title="Panel administrativo" />
      <SectionTitle>Inventario de productos</SectionTitle>
      <Text style={styles.description}>Las existencias actuales se consultan y actualizan en PostgreSQL.</Text>
      <ActionButton label="Actualizar inventario" secondary onPress={() => void loadProducts()} loading={loading} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {loading ? <LoadingState label="Consultando inventario…" /> : products.length ? (
        <View style={styles.productList}>
          {products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeading}>
                <View style={styles.productCopy}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productMeta}>Set {product.id} · {product.category}</Text>
                </View>
                <Text style={styles.currentStock}>{product.stock} disponibles</Text>
              </View>
              <View style={styles.stockForm}>
                <Field
                  label="Nueva existencia"
                  value={stockDrafts[product.id] ?? ''}
                  onChangeText={(value) => setStockDrafts((current) => ({ ...current, [product.id]: value }))}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                />
                <ActionButton label="Guardar stock" loading={savingId === product.id} disabled={savingId !== null && savingId !== product.id} onPress={() => void saveStock(product)} />
              </View>
            </View>
          ))}
        </View>
      ) : <Text style={styles.empty}>No hay productos para administrar.</Text>}
    </Screen>
  );
}

const styles = {
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  productList: { gap: 12 },
  productCard: { gap: 13, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  productHeading: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, gap: 12 },
  productCopy: { flex: 1, gap: 4 },
  productName: { color: colors.ink, fontSize: 14, fontWeight: '900' as const },
  productMeta: { color: colors.muted, fontSize: 11 },
  currentStock: { color: colors.green, fontSize: 11, fontWeight: '900' as const },
  stockForm: { gap: 8 },
  empty: { color: colors.muted, fontSize: 13 },
};
