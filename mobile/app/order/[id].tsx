import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { shareInvoice } from '../../src/invoice';
import { useStore } from '../../src/store';
import { ActionButton, colors, EmptyState, LoadingState, Money, Notice, OrderStatus, PageHeader, ProductImage, Screen, SectionTitle, StoreHeader } from '../../src/ui';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, cart, loading } = useStore();
  const order = orders.find((item) => item.id === id);
  const [error, setError] = useState('');
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!order && loading) return <Screen><LoadingState label="Cargando pedido…" /></Screen>;
  if (!order) return <Screen><EmptyState title="No encontramos este pedido" detail="No aparece en los pedidos guardados en este dispositivo." /><ActionButton label="Volver a la tienda" secondary onPress={() => router.replace('/')} /></Screen>;

  const date = new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Screen>
      <StoreHeader cartCount={cartCount} onCartPress={() => router.push('/(tabs)/cart')} caption="Detalle de compra" />
      <PageHeader label={`PEDIDO ${order.id.slice(0, 8).toUpperCase()}`} title={order.status === 'completed' ? '¡Compra confirmada!' : order.status === 'rejected' ? 'Compra no completada' : 'Pedido registrado'} />
      <View style={styles.statusCard}>
        <OrderStatus status={order.status} />
        <Text style={styles.orderDate}>Realizado el {date}</Text>
      </View>
      {order.status === 'pending_sync' ? <Notice>Tu pedido está guardado en este dispositivo. El inventario se descuenta solo cuando el servidor lo confirma.</Notice> : null}
      {order.status === 'processing' ? <Notice>El servidor está validando el inventario de tu pedido.</Notice> : null}
      {order.status === 'rejected' ? <Notice tone="error">{order.rejectionReason ?? 'No se pudo confirmar el pedido.'}</Notice> : null}

      <View style={styles.orderCard}>
        <SectionTitle>Productos</SectionTitle>
        {order.items.map((item) => (
          <View key={item.productId} style={styles.orderItem}>
            <ProductImage uri={item.imageUrl} label={item.name} style={styles.image} />
            <View style={styles.itemText}>
              <Text numberOfLines={2} style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.productId} · Cantidad: {item.quantity}</Text>
            </View>
            <Money cents={item.priceCents * item.quantity} />
          </View>
        ))}
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Money cents={order.totalCents} large /></View>
      </View>

      <View style={styles.customerCard}>
        <SectionTitle>Datos de entrega</SectionTitle>
        <Text style={styles.customerName}>{order.customer.name}</Text>
        <Text style={styles.customerText}>{order.customer.phone}</Text>
        <Text style={styles.customerText}>{order.customer.email}</Text>
        <Text style={styles.customerText}>{order.customer.address}</Text>
      </View>

      {order.status === 'completed' ? <ActionButton label="Descargar factura PDF" onPress={() => void shareInvoice(order).catch(() => setError('No se pudo generar la factura.'))} /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ActionButton label="Volver a la tienda" icon="back" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}

const styles = {
  statusCard: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, flexWrap: 'wrap' as const, gap: 10, padding: 14, borderRadius: 13, backgroundColor: colors.paper },
  orderDate: { color: colors.muted, fontSize: 11 },
  orderCard: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orderItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  image: { width: 58, height: 58, borderRadius: 8, backgroundColor: colors.canvas },
  itemText: { flex: 1, gap: 4 },
  itemName: { color: colors.ink, fontSize: 12, fontWeight: '800' as const },
  itemMeta: { color: colors.muted, fontSize: 10 },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingTop: 12, borderTopWidth: 1, borderColor: colors.line },
  totalLabel: { color: colors.ink, fontWeight: '900' as const, fontSize: 17 },
  customerCard: { gap: 8, padding: 16, borderRadius: 14, backgroundColor: colors.paper },
  customerName: { color: colors.ink, fontWeight: '900' as const, fontSize: 14 },
  customerText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
};
