import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { useStore } from '../../src/store';
import { colors, EmptyState, LoadingState, Notice, PageHeader, ProductCard, Screen, SearchField } from '../../src/ui';

export default function CatalogScreen() {
  const { products, loading, serverAvailable, online } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todo');
  const categories = ['Todo', ...new Set(products.map((product) => product.category))];
  const filtered = useMemo(() => products.filter((product) => {
    const matchesText = `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (category === 'Todo' || product.category === category);
  }), [products, query, category]);

  return (
    <Screen>
      <PageHeader label="Sets y novedades" title="Catálogo" />
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar sets o número" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {categories.map((item) => (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: category === item }} key={item} onPress={() => setCategory(item)} style={{ backgroundColor: category === item ? colors.ink : colors.canvas, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 }}>
            <Text style={{ color: category === item ? colors.paper : colors.ink, fontSize: 12, fontWeight: '800' }}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!serverAvailable ? <Notice tone={online ? 'info' : 'error'}>{online ? 'Se muestra la última disponibilidad guardada.' : 'Sin conexión: los cambios de inventario se comprobarán al comprar.'}</Notice> : null}
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>{filtered.length} {filtered.length === 1 ? 'set' : 'sets'}</Text>
      {loading && !products.length ? <LoadingState /> : filtered.length ? filtered.map((product) => (
        <ProductCard key={product.id} product={product} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} />
      )) : <EmptyState title={products.length ? 'No encontramos sets' : 'Catálogo vacío'} detail={products.length ? 'Prueba otra búsqueda o categoría.' : 'Cuando haya productos disponibles aparecerán aquí.'} />}
    </Screen>
  );
}