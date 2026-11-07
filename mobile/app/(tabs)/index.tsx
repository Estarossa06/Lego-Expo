import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { ActionButton, colors, LoadingState, Notice, PageHeader, ProductCard, Screen, SectionTitle } from '../../src/ui';

export default function HomeScreen() {
  const { products, online, serverAvailable, catalogError, loading } = useStore();
  const featured = products.slice(0, 3);

  return (
    <Screen>
      <PageHeader label="LEGO STORE · CONSTRUYE A TU MANERA" title="Ideas grandes. Piezas pequeñas." />
      <View style={{ backgroundColor: colors.yellow, borderRadius: 14, padding: 20, gap: 12, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text style={{ color: colors.ink, fontSize: 11, fontWeight: '900' }}>UNIVERSOS PARA EXPLORAR</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: colors.red }} /><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: colors.blue }} /></View>
        </View>
        <Text style={{ color: colors.ink, fontSize: 17, lineHeight: 24, fontWeight: '600', maxWidth: 420 }}>Encuentra tu próximo set y haz espacio para imaginar.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/catalog')} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <Text style={{ color: colors.red, fontWeight: '900', fontSize: 13 }}>EXPLORAR CATÁLOGO  →</Text>
        </Pressable>
      </View>
      <Notice tone={serverAvailable ? 'success' : online ? 'info' : 'error'}>
        {serverAvailable ? 'Inventario actualizado desde la tienda.' : catalogError ?? (online ? 'Mostrando el catálogo guardado; el servidor no responde.' : 'Sin conexión. El catálogo guardado sigue disponible.')}
      </Notice>
      <SectionTitle action={<Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/catalog')}><Text style={{ color: colors.blue, fontWeight: '900' }}>Ver catálogo</Text></Pressable>}>Para empezar</SectionTitle>
      {loading && !products.length ? <LoadingState /> : featured.map((product) => (
        <ProductCard key={product.id} product={product} onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} />
      ))}
      {!loading && !products.length ? <Text style={{ color: colors.muted }}>No hay productos guardados.</Text> : null}
      <ActionButton label="Explorar todos los sets" icon="arrow" onPress={() => router.push('/(tabs)/catalog')} />
    </Screen>
  );
}