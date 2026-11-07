import { router } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { ActionButton, colors, EmptyState, Icon, Money, PageHeader, QuantityControl, Screen, SectionTitle } from '../../src/ui';

export default function CartScreen() {
  const { cart, setCartQuantity, removeFromCart } = useStore();
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <Screen>
      <PageHeader label={`${cart.reduce((sum, item) => sum + item.quantity, 0)} piezas`} title="Carrito" />
      {!cart.length ? <EmptyState title="Tu carrito está vacío" detail="Explora el catálogo y agrega tus sets favoritos." /> : <>
        {cart.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}>
            <Image source={{ uri: item.imageUrl }} resizeMode="contain" style={{ width: 82, height: 82, backgroundColor: colors.canvas, borderRadius: 5 }} />
            <View style={{ flex: 1, justifyContent: 'space-between', gap: 8 }}>
              <View>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{item.id} · {item.category}</Text>
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 15 }}>{item.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <QuantityControl quantity={item.quantity} onChange={(value) => void setCartQuantity(item.id, value)} />
                <Money cents={item.priceCents * item.quantity} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.name}`} onPress={() => void removeFromCart(item.id)} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 }}>
                <Icon name="close" color={colors.red} size={15} />
                <Text style={{ color: colors.red, fontSize: 11, fontWeight: '800' }}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <SectionTitle>Resumen</SectionTitle>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.muted }}>Subtotal</Text><Money cents={subtotal} /></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '900' }}>Total</Text><Money cents={subtotal} large /></View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>El pago es simulado. El servidor confirmará existencias al enviar el pedido.</Text>
        <ActionButton label="Continuar con la compra" icon="arrow" onPress={() => router.push('/checkout')} />
      </>}
    </Screen>
  );
}