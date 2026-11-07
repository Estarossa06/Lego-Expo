import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { colors, EmptyState, LoadingState, Money, Notice, OrderStatus, PageHeader, Screen } from '../../src/ui';

export default function OrdersScreen() {
  const { orders, loading, online } = useStore();
  const pendingCount = orders.filter((order) => order.status === 'pending_sync' || order.status === 'processing').length;

  return (
    <Screen>
      <PageHeader label={`${orders.length} ${orders.length === 1 ? 'compra' : 'compras'}`} title="Pedidos" />
      {pendingCount > 0 ? <Notice>{pendingCount} {pendingCount === 1 ? 'pedido espera' : 'pedidos esperan'} confirmación del servidor{online ? '.' : ' al recuperar conexión.'}</Notice> : null}
      {loading ? <LoadingState label="Cargando pedidos…" /> : !orders.length ? <EmptyState title="Aún no tienes pedidos" detail="Cuando confirmes una compra aparecerá aquí." /> : orders.map((order) => (
        <Pressable accessibilityRole="button" key={order.id} onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })} style={({ pressed }) => ({ padding: 16, gap: 12, backgroundColor: colors.paper, borderColor: pressed ? colors.blue : colors.line, borderWidth: 1, borderRadius: 10, opacity: pressed ? 0.82 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '900' }}>Pedido {order.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>{new Date(order.createdAt).toLocaleDateString('es-MX')}</Text>
            </View>
            <Money cents={order.totalCents} />
          </View>
          <OrderStatus status={order.status} />
          {order.status === 'rejected' && order.rejectionReason ? <Text numberOfLines={2} style={{ color: colors.red, fontSize: 12 }}>{order.rejectionReason}</Text> : null}
        </Pressable>
      ))}
    </Screen>
  );
}