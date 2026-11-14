import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useStore } from '../../src/store';
import { ActionButton, colors, EmptyState, LoadingState, Money, Notice, ProductGrid, ProductImage, QuantityControl, Screen, SectionTitle, StoreHeader, StoreNote } from '../../src/ui';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { products, cart, loading, addToCart } = useStore();
  const product = products.find((item) => item.id === id);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [adding, setAdding] = useState(false);
  const related = useMemo(
    () => product ? products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4) : [],
    [products, product],
  );

  if (!product && loading) return <Screen><LoadingState label="Cargando producto…" /></Screen>;
  if (!product) {
    return <Screen><EmptyState title="Set no disponible" detail="Este producto no está en el catálogo local." /><ActionButton label="Volver al catálogo" secondary onPress={() => router.replace('/(tabs)/catalog')} /></Screen>;
  }

  const inCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;
  const remainingStock = Math.max(0, product.stock - inCart);
  const imageWidth = Math.min(width - 32, 500);
  const addProduct = async () => {
    setAdding(true);
    setMessage(null);
    try {
      await addToCart(product, quantity);
      setMessage({ text: `${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito.`, tone: 'success' });
    } catch (reason) {
      setMessage({ text: reason instanceof Error ? reason.message : 'No se pudo agregar el producto.', tone: 'error' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen>
      <StoreHeader cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCartPress={() => router.push('/(tabs)/cart')} caption="Detalle del set" />

      <View style={[styles.productImageBox, { width: imageWidth }]}>
        <ProductImage uri={product.imageUrl} label={product.name} style={styles.productImage} />
        <View style={styles.setNumber}><Text style={styles.setNumberText}>SET LEGO® {product.id}</Text></View>
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.category}>{product.category.toUpperCase()}</Text>
        <Text style={styles.name}>{product.name}</Text>
        <View style={styles.priceAvailability}>
          <Money cents={product.priceCents} large />
          <View style={[styles.stockPill, product.stock === 0 && styles.stockPillEmpty]}>
            <View style={[styles.stockDot, product.stock === 0 && styles.stockDotEmpty]} />
            <Text style={[styles.stockText, product.stock === 0 && styles.stockTextEmpty]}>
              {product.stock ? `${product.stock} disponibles` : 'Agotado'}
            </Text>
          </View>
        </View>
        <Text style={styles.setDescription}>{product.description}</Text>
      </View>

      <View style={styles.purchaseCard}>
        <View style={styles.purchaseRow}>
          <Text style={styles.purchaseLabel}>Precio por set</Text>
          <Money cents={product.priceCents} />
        </View>
        <View style={styles.purchaseRow}>
          <Text style={styles.purchaseLabel}>Cantidad</Text>
          <QuantityControl
            quantity={quantity}
            max={Math.max(1, Math.min(99, remainingStock))}
            onChange={(value) => setQuantity(Math.max(1, Math.min(Math.max(remainingStock, 1), 99, value)))}
          />
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Money cents={product.priceCents * quantity} />
        </View>
        {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
        <ActionButton
          label={remainingStock > 0 ? 'Agregar al carrito' : product.stock > 0 ? 'Stock agregado al carrito' : 'Sin existencias'}
          disabled={remainingStock === 0}
          icon="cart"
          loading={adding}
          onPress={() => void addProduct()}
        />
        <StoreNote>El inventario se confirma con la tienda al sincronizar tu compra.</StoreNote>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Sobre este set</Text>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Número de set</Text><Text style={styles.infoValue}>{product.id}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Colección</Text><Text style={styles.infoValue}>{product.category}</Text></View>
        <View style={styles.infoRow}><Text style={styles.infoLabel}>Precio</Text><Text style={styles.infoValue}>Precio de demostración</Text></View>
      </View>

      {related.length ? (
        <View style={styles.related}>
          <SectionTitle>Más de {product.category}</SectionTitle>
          <ProductGrid
            products={related}
            onProductPress={(item) => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
            onAdd={addToCart}
          />
        </View>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backLink}>
        <Text style={styles.backText}>← Volver a la tienda</Text>
      </Pressable>
    </Screen>
  );
}

const styles = {
  productImageBox: { alignSelf: 'center' as const, aspectRatio: 1, padding: 18, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  productImage: { width: '100%' as const, height: '100%' as const },
  setNumber: { position: 'absolute' as const, left: 12, top: 12, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 7, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  setNumberText: { color: colors.ink, fontSize: 10, fontWeight: '900' as const },
  productInfo: { gap: 8 },
  category: { color: colors.red, fontSize: 11, fontWeight: '900' as const, letterSpacing: 0.8 },
  name: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900' as const },
  priceAvailability: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 10 },
  stockPill: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18, backgroundColor: '#edf7ef' },
  stockPillEmpty: { backgroundColor: colors.paleRed },
  stockDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  stockDotEmpty: { backgroundColor: colors.red },
  stockText: { color: colors.green, fontSize: 11, fontWeight: '800' as const },
  stockTextEmpty: { color: colors.red },
  setDescription: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  purchaseCard: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  purchaseRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
  purchaseLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' as const },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 },
  totalLabel: { color: colors.ink, fontSize: 15, fontWeight: '900' as const },
  infoCard: { gap: 12, padding: 16, borderRadius: 14, backgroundColor: colors.paper },
  infoTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' as const },
  infoRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 10 },
  infoLabel: { color: colors.muted, fontSize: 12 },
  infoValue: { color: colors.ink, fontSize: 12, fontWeight: '800' as const, textAlign: 'right' as const, flexShrink: 1 },
  related: { gap: 12 },
  backLink: { alignSelf: 'flex-start' as const, paddingVertical: 8 },
  backText: { color: colors.blue, fontSize: 13, fontWeight: '800' as const },
};
