import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../../src/store';
import { useState } from 'react';
import { ActionButton, colors, EmptyState, LoadingState, Money, Notice, OrderStatus, Screen, SectionTitle, StoreHeader } from '../../src/ui';

export default function OrdersScreen() {
  const { orders, cart, loading, online, user, isAdmin, logout } = useStore();
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState('');
  const pendingCount = orders.filter((order) => order.status === 'pending_sync' || order.status === 'processing').length;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Screen>
      <StoreHeader cartCount={itemCount} onCartPress={() => router.push('/(tabs)/cart')} caption="Tus compras" />
      <View style={styles.heading}>
        <Text style={styles.title}>Cuenta y pedidos</Text>
        <Text style={styles.subtitle}>Consulta tus compras o cierra sesión para ingresar con otra cuenta.</Text>
      </View>
      <Text style={styles.accountLabel}>Sesión iniciada como {user?.email}</Text>
      {isAdmin ? <ActionButton label="Abrir panel administrativo" onPress={() => router.push('/admin')} /> : null}
      {accountError ? <Notice tone="error">{accountError}</Notice> : null}
      <ActionButton
        label="Cerrar sesión"
        secondary
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          setAccountError('');
          void logout()
            .then(() => router.replace('/auth'))
            .catch((reason) => setAccountError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión.'))
            .finally(() => setSigningOut(false));
        }}
      />
      {pendingCount > 0 ? <Notice>{pendingCount} {pendingCount === 1 ? 'pedido espera' : 'pedidos esperan'} confirmación del servidor{online ? '.' : ' al recuperar conexión.'}</Notice> : null}
      {loading ? <LoadingState label="Cargando pedidos…" /> : !orders.length ? (
        <EmptyState title="Aún no tienes pedidos" detail="Cuando confirmes una compra aparecerá aquí." />
      ) : (
        <>
          <SectionTitle>{orders.length} {orders.length === 1 ? 'compra' : 'compras'}</SectionTitle>
          {orders.map((order) => {
            const firstItem = order.items[0];
            const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <Pressable
                accessibilityRole="button"
                key={order.id}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                style={({ pressed }) => [styles.orderCard, pressed && styles.orderPressed]}
              >
                <View style={styles.orderTop}>
                  <View style={styles.orderIdentity}>
                    <Text style={styles.orderId}>Pedido {order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.orderDate}>{new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <OrderStatus status={order.status} />
                </View>
                <View style={styles.orderDivider} />
                <View style={styles.orderBottom}>
                  <View style={styles.itemSummary}>
                    {firstItem ? <View style={styles.itemMark}><Text style={styles.itemMarkText}>{firstItem.quantity}×</Text></View> : null}
                    <View style={styles.itemTextBlock}>
                      <Text numberOfLines={1} style={styles.itemName}>{firstItem?.name ?? 'Pedido sin productos'}</Text>
                      <Text style={styles.itemCount}>{totalUnits} {totalUnits === 1 ? 'artículo' : 'artículos'}{order.items.length > 1 ? ` · +${order.items.length - 1} ${order.items.length - 1 === 1 ? 'producto' : 'productos'}` : ''}</Text>
                    </View>
                  </View>
                  <Money cents={order.totalCents} />
                </View>
                {order.status === 'rejected' && order.rejectionReason ? <Text numberOfLines={2} style={styles.rejection}>{order.rejectionReason}</Text> : null}
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = {
  heading: { gap: 4 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900' as const },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  accountLabel: { color: colors.muted, fontSize: 11 },
  orderCard: { padding: 15, gap: 12, borderRadius: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  orderPressed: { opacity: 0.8 },
  orderTop: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, gap: 8 },
  orderIdentity: { flex: 1, gap: 4 },
  orderId: { color: colors.ink, fontSize: 13, fontWeight: '900' as const },
  orderDate: { color: colors.muted, fontSize: 11 },
  orderDivider: { height: 1, backgroundColor: colors.line },
  orderBottom: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 8 },
  itemSummary: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 9 },
  itemMark: { width: 35, height: 35, borderRadius: 9, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.paleYellow },
  itemMarkText: { color: colors.ink, fontSize: 11, fontWeight: '900' as const },
  itemTextBlock: { flex: 1, gap: 3 },
  itemName: { color: colors.ink, fontSize: 12, fontWeight: '800' as const },
  itemCount: { color: colors.muted, fontSize: 10 },
  rejection: { color: colors.red, fontSize: 11, lineHeight: 16 },
};
