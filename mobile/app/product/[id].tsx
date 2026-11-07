import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { ActionButton, colors, LoadingState, Money, Notice, PageHeader, QuantityControl, Screen } from '../../src/ui';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, loading, addToCart } = useStore();
  const product = products.find((item) => item.id === id);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [adding, setAdding] = useState(false);

  if (!product && loading) return <Screen><LoadingState label="Cargando producto…" /></Screen>;
  if (!product) {
    return <Screen><PageHeader title="Set no disponible" /><Text>Este producto no está en el catálogo local.</Text></Screen>;
  }

  return (
    <Screen>
      <PageHeader label={product.category} title={product.name} />
      <View style={{ backgroundColor: colors.canvas, borderRadius: 8, aspectRatio: 1, padding: 18 }}>
        <Image source={{ uri: product.imageUrl }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>{product.description}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Money cents={product.priceCents} large />
        <Text style={{ color: product.stock ? colors.green : colors.red, fontWeight: '800' }}>
          {product.stock ? `${product.stock} disponibles` : 'Agotado'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.ink, fontWeight: '800' }}>Cantidad</Text>
        <QuantityControl quantity={quantity} onChange={(value) => setQuantity(Math.max(1, Math.min(99, value)))} />
      </View>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <ActionButton
        label="Agregar al carrito"
        disabled={product.stock === 0}
        icon="cart"
        loading={adding}
        onPress={() => {
          setAdding(true);
          void addToCart(product, quantity)
            .then(() => setMessage({ text: `${quantity} ${quantity === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito.`, tone: 'success' }))
            .catch((reason: unknown) => setMessage({ text: reason instanceof Error ? reason.message : 'No se pudo agregar el producto.', tone: 'error' }))
            .finally(() => setAdding(false));
        }}
      />
      <ActionButton label="Volver al catálogo" icon="back" secondary onPress={() => router.back()} />
    </Screen>
  );
}