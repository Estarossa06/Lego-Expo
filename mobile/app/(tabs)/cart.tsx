import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useStore } from '../../src/store';
import { ActionButton, colors, EmptyState, Icon, Money, Notice, PageHeader, ProductImage, QuantityControl, Screen, SectionTitle } from '../../src/ui';

export default function CartScreen() {
  const { cart, setCartQuantity, removeFromCart } = useStore();
  const [error, setError] = useState('');
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const overStock = cart.find((item) => item.quantity > item.stock);

  const updateQuantity = async (productId: string, quantity: number) => {
    setError('');
    try {
      await setCartQuantity(productId, quantity);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la cantidad.');
    }
  };

  return (
    <Screen>
      <PageHeader label={`${itemCount} ${itemCount === 1 ? 'pieza' : 'piezas'}`} title="Carrito" />
      {!cart.length ? (
        <>
          <EmptyState title="Tu carrito está vacío" detail="Explora el catálogo y agrega tus sets favoritos." />
          <ActionButton label="Explorar catálogo" icon="arrow" onPress={() => router.push('/(tabs)/catalog')} />
        </>
      ) : (
        <>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {overStock ? (
            <Notice tone="error">
              {overStock.name}: solicitas {overStock.quantity}, pero solo hay {overStock.stock}. Ajusta la cantidad antes de comprar.
            </Notice>
          ) : null}
          <View style={styles.cartList}>
            {cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${item.name}`} onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })} style={styles.imageWrap}>
                  <ProductImage uri={item.imageUrl} label={item.name} style={styles.image} />
                </Pressable>
                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemNameBlock}>
                      <Text style={styles.itemMeta}>{item.id} · {item.category}</Text>
                      <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${item.name}`} onPress={() => void removeFromCart(item.id)} hitSlop={8} style={styles.removeButton}>
                      <Icon name="close" color={colors.muted} size={17} />
                    </Pressable>
                  </View>
                  <View style={styles.itemFooter}>
                    <View style={styles.quantityBlock}>
                      <Text style={styles.unitPrice}><Money cents={item.priceCents} /> <Text style={styles.unitLabel}>por set</Text></Text>
                      <QuantityControl
                        quantity={item.quantity}
                        max={Math.min(99, item.stock)}
                        onChange={(value) => void updateQuantity(item.id, value)}
                      />
                    </View>
                    <Money cents={item.priceCents * item.quantity} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryCard}>
            <SectionTitle>Resumen de compra</SectionTitle>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Productos ({itemCount})</Text><Money cents={subtotal} /></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Envío</Text><Text style={styles.shippingNote}>Se coordina por fuera</Text></View>
            <View style={styles.totalRow}><Text style={styles.totalText}>Subtotal</Text><Money cents={subtotal} large /></View>
            <Text style={styles.paymentNote}>Pago de demostración. No se solicitan datos bancarios.</Text>
          </View>
          <ActionButton
            label={overStock ? 'Ajusta el stock antes de comprar' : 'Continuar con la compra'}
            icon="arrow"
            disabled={Boolean(overStock)}
            onPress={() => router.push('/checkout')}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cartList: { gap: 10 },
  cartItem: { flexDirection: 'row' as const, gap: 12, padding: 12, borderRadius: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  imageWrap: { width: 88, height: 88, borderRadius: 9, backgroundColor: colors.canvas, padding: 5 },
  image: { width: '100%' as const, height: '100%' as const },
  itemInfo: { flex: 1, minWidth: 0, justifyContent: 'space-between', gap: 10 },
  itemHeader: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, gap: 8 },
  itemNameBlock: { flex: 1, gap: 4 },
  itemMeta: { color: colors.muted, fontSize: 10, fontWeight: '700' as const },
  itemName: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: '900' as const },
  removeButton: { width: 32, height: 32, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 16, backgroundColor: colors.canvas },
  itemFooter: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'space-between' as const, gap: 8 },
  quantityBlock: { gap: 5 },
  unitPrice: { color: colors.ink, fontSize: 11, fontWeight: '800' as const },
  unitLabel: { color: colors.muted, fontSize: 10, fontWeight: '400' as const },
  summaryCard: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  summaryRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  summaryLabel: { color: colors.muted, fontSize: 13 },
  shippingNote: { color: colors.muted, fontSize: 11 },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, borderTopWidth: 1, borderColor: colors.line, paddingTop: 13 },
  totalText: { color: colors.ink, fontSize: 17, fontWeight: '900' as const },
  paymentNote: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
