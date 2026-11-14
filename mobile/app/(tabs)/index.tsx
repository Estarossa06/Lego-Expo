import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { ActionButton, colors, EmptyState, Icon, LoadingState, Money, Notice, ProductGrid, Screen, SearchField, SectionTitle, StoreHeader } from '../../src/ui';

export default function HomeScreen() {
  const { products, cart, online, serverAvailable, catalogError, loading, addToCart } = useStore();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const matchingProducts = useMemo(
    () => products.filter((product) => `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(normalizedQuery)),
    [products, normalizedQuery],
  );
  const featured = products.slice(0, 4);
  const explore = products.slice(4, 8);
  const heroProduct = products[0];
  const openProduct = (product: (typeof products)[number]) =>
    router.push({ pathname: '/product/[id]', params: { id: product.id } });

  return (
    <Screen>
      <StoreHeader cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartPress={() => router.push('/(tabs)/cart')} caption="Sets para construir e imaginar" />
      <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por nombre o número de set" />

      {serverAvailable
        ? <Notice tone="success">Catálogo sincronizado con la tienda.</Notice>
        : <Notice tone={online ? 'info' : 'error'}>{catalogError ?? (online ? 'Mostrando el catálogo guardado.' : 'Sin conexión. Puedes seguir explorando tu catálogo guardado.')}</Notice>}

      {normalizedQuery ? (
        <>
          <SectionTitle>{`Resultados (${matchingProducts.length})`}</SectionTitle>
          {loading && !products.length ? <LoadingState /> : matchingProducts.length ? (
            <ProductGrid products={matchingProducts} onProductPress={openProduct} onAdd={addToCart} />
          ) : <EmptyState title="No encontramos sets" detail="Prueba con otro nombre, número de set o categoría." />}
          <ActionButton label="Ver catálogo completo" secondary onPress={() => router.push('/(tabs)/catalog')} />
        </>
      ) : (
        <>
          {heroProduct ? (
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>LEGO · CATÁLOGO</Text></View>
                <Text style={styles.heroTitle}>Grandes ideas. Una pieza a la vez.</Text>
                <Text style={styles.heroBody}>Encuentra sets para construir, jugar y exhibir.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/catalog')} style={({ pressed }) => [styles.heroButton, pressed && styles.heroButtonPressed]}>
                  <Text style={styles.heroButtonText}>Explorar catálogo</Text>
                  <Icon name="arrow" color={colors.ink} size={17} />
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${heroProduct.name}`} onPress={() => openProduct(heroProduct)} style={styles.heroProduct}>
                <Image source={{ uri: heroProduct.imageUrl }} resizeMode="contain" style={styles.heroImage} />
                <View style={styles.heroProductInfo}>
                  <Text numberOfLines={1} style={styles.heroProductName}>{heroProduct.name}</Text>
                  <Money cents={heroProduct.priceCents} />
                </View>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionTitle action={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/catalog')}><Text style={styles.linkText}>Ver todos</Text></Pressable>}>Selección para explorar</SectionTitle>
            {loading && !products.length ? <LoadingState /> : featured.length ? (
              <ProductGrid products={featured} onProductPress={openProduct} onAdd={addToCart} />
            ) : <EmptyState title="Catálogo vacío" detail="Cuando haya productos disponibles aparecerán aquí." />}
          </View>

          {explore.length ? (
            <View style={styles.section}>
              <SectionTitle action={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/catalog')}><Text style={styles.linkText}>Descubrir sets</Text></Pressable>}>Más para descubrir</SectionTitle>
              <ProductGrid products={explore} onProductPress={openProduct} onAdd={addToCart} />
            </View>
          ) : null}

          <View style={styles.priceNote}>
            <View style={styles.priceNoteIcon}><Icon name="shield" color={colors.green} size={21} /></View>
            <View style={styles.priceNoteCopy}>
              <Text style={styles.priceNoteTitle}>Precios y promociones</Text>
              <Text style={styles.priceNoteBody}>Los precios son de demostración. El catálogo no incluye datos de descuentos; la disponibilidad se consulta con la tienda al sincronizar o comprar.</Text>
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = {
  hero: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.yellow, overflow: 'hidden' as const },
  heroCopy: { flex: 1, gap: 10 },
  demoBadge: { alignSelf: 'flex-start' as const, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.68)' },
  demoBadgeText: { color: colors.ink, fontSize: 8, fontWeight: '900' as const, letterSpacing: 0.4 },
  heroTitle: { maxWidth: 350, color: colors.ink, fontSize: 25, lineHeight: 30, fontWeight: '900' as const },
  heroBody: { color: colors.ink, fontSize: 13, lineHeight: 19 },
  heroButton: { minHeight: 42, alignSelf: 'flex-start' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, paddingHorizontal: 13, borderRadius: 8, backgroundColor: colors.paper },
  heroButtonPressed: { opacity: 0.78 },
  heroButtonText: { color: colors.ink, fontSize: 12, fontWeight: '900' as const },
  heroProduct: { width: '36%' as const, minWidth: 112, maxWidth: 220, padding: 8, borderRadius: 12, backgroundColor: colors.paper },
  heroImage: { width: '100%' as const, aspectRatio: 1 },
  heroProductInfo: { gap: 2, paddingHorizontal: 3, paddingBottom: 3 },
  heroProductName: { color: colors.muted, fontSize: 10, fontWeight: '700' as const },
  section: { gap: 12 },
  linkText: { color: colors.red, fontSize: 12, fontWeight: '900' as const },
  priceNote: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.paper },
  priceNoteIcon: { width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 20, backgroundColor: '#edf7ef' },
  priceNoteCopy: { flex: 1, gap: 4 },
  priceNoteTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' as const },
  priceNoteBody: { color: colors.muted, fontSize: 11, lineHeight: 16 },
};
