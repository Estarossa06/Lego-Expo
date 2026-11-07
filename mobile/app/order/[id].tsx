import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { shareInvoice } from '../../src/invoice';
import { useStore } from '../../src/store';
import { ActionButton, colors, LoadingState, Money, Notice, OrderStatus, PageHeader, Screen } from '../../src/ui';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders, loading } = useStore();
  const order = orders.find((item) => item.id === id);
  const [error, setError] = useState('');

  if (!order && loading) return <Screen><LoadingState label="Cargando pedido…" /></Screen>;
  if (!order) return <Screen><PageHeader title="Pedido" /><Text>No encontramos este pedido en el dispositivo.</Text></Screen>;

  return (
    <Screen>
      <PageHeader label={`Pedido ${order.id.slice(0, 8).toUpperCase()}`} title={order.status === 'completed' ? '¡Compra confirmada!' : order.status === 'rejected' ? 'Compra no completada' : 'Pedido registrado'} />
      <OrderStatus status={order.status} />
      {order.status === 'pending_sync' ? <Notice>La compra está guardada en este dispositivo. El inventario central no se descuenta hasta que el servidor la confirme.</Notice> : null}
      {order.status === 'rejected' ? <Notice tone="error">{order.rejectionReason ?? 'No se pudo confirmar el pedido.'}</Notice> : null}
      <View style={{ gap: 12 }}>
        {order.items.map((item) => (
          <View key={item.productId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={{ uri: item.imageUrl }} resizeMode="contain" style={{ width: 58, height: 58, backgroundColor: colors.canvas, borderRadius: 4 }} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{item.name}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Cantidad: {item.quantity}</Text></View>
            <Money cents={item.priceCents * item.quantity} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: colors.line }}><Text style={{ color: colors.ink, fontWeight: '900', fontSize: 18 }}>Total</Text><Money cents={order.totalCents} large /></View>
      <View style={{ gap: 3 }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{order.customer.name}</Text><Text style={{ color: colors.muted }}>{order.customer.email}</Text><Text style={{ color: colors.muted }}>{order.customer.address}</Text></View>
      {order.status === 'completed' ? <ActionButton label="Descargar factura PDF" onPress={() => void shareInvoice(order).catch(() => setError('No se pudo generar la factura.'))} /> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ActionButton label="Volver a la tienda" icon="back" secondary onPress={() => router.replace('/')} />
    </Screen>
  );
}