import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { CategoryPill, colors, EmptyState, Icon, LoadingState, Notice, ProductGrid, Screen, SearchField, SectionTitle, StoreHeader } from '../../src/ui';

type SortMode = 'recommended' | 'price-low' | 'price-high' | 'name';

const sortLabels: { id: SortMode; label: string }[] = [
  { id: 'recommended', label: 'Orden original' },
  { id: 'price-low', label: 'Menor precio' },
  { id: 'price-high', label: 'Mayor precio' },
  { id: 'name', label: 'Nombre A–Z' },
];

export default function CatalogScreen() {
  const { products, cart, loading, serverAvailable, catalogError, online, addToCart } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const categories = useMemo(() => ['Todo', ...new Set(products.map((product) => product.category))], [products]);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const matchesText = `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(search);
      return matchesText && (category === 'Todo' || product.category === category);
    });
    if (sortMode === 'price-low') return [...result].sort((a, b) => a.priceCents - b.priceCents);
    if (sortMode === 'price-high') return [...result].sort((a, b) => b.priceCents - a.priceCents);
    if (sortMode === 'name') return [...result].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return result;
  }, [products, query, category, sortMode]);

  return (
    <Screen>
      <StoreHeader cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartPress={() => router.push('/(tabs)/cart')} caption="Sets y novedades" />
      <View style={styles.heading}>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>Encuentra tu próximo set para construir.</Text>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar sets o número" />

      {!serverAvailable
        ? <Notice tone={online ? 'info' : 'error'}>{catalogError ?? (online ? 'Se muestra la última disponibilidad guardada.' : 'Sin conexión: el catálogo local sigue disponible.')}</Notice>
        : <View style={styles.syncLine}><View style={styles.syncDot} /><Text style={styles.syncText}>Disponibilidad sincronizada</Text></View>}

      <View style={styles.filterSection}>
        <SectionTitle>Categorías</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {categories.map((item) => (
            <CategoryPill key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sortSection}>
        <View style={styles.resultHeading}>
          <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? 'set' : 'sets'}</Text>
          <View style={styles.sortLabel}><Icon name="sort" size={16} color={colors.muted} /><Text style={styles.sortLabelText}>Ordenar</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {sortLabels.map((option) => (
            <CategoryPill key={option.id} label={option.label} selected={sortMode === option.id} onPress={() => setSortMode(option.id)} />
          ))}
        </ScrollView>
      </View>

      {loading && !products.length ? <LoadingState /> : filtered.length ? (
        <ProductGrid
          products={filtered}
          onProductPress={(product) => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
          onAdd={addToCart}
        />
      ) : <EmptyState title={products.length ? 'No encontramos sets' : 'Catálogo vacío'} detail={products.length ? 'Prueba otra búsqueda o categoría.' : 'Cuando haya productos disponibles aparecerán aquí.'} />}
    </Screen>
  );
}

const styles = {
  heading: { gap: 4 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900' as const },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  filterSection: { gap: 10 },
  chipRow: { gap: 8, paddingRight: 10 },
  syncLine: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7 },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  syncText: { color: colors.green, fontSize: 11, fontWeight: '800' as const },
  sortSection: { gap: 9 },
  resultHeading: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  resultCount: { color: colors.ink, fontSize: 14, fontWeight: '900' as const },
  sortLabel: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5 },
  sortLabelText: { color: colors.muted, fontSize: 11, fontWeight: '700' as const },
};
