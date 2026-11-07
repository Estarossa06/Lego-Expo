import { Tabs } from 'expo-router';
import { useStore } from '../../src/store';
import { colors, Icon } from '../../src/ui';

export default function TabLayout() {
  const { cart } = useStore();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 9, backgroundColor: colors.paper, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarBadgeStyle: { backgroundColor: colors.red, color: colors.paper, fontSize: 10, fontWeight: '900' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color }) => <Icon name="home" color={color ?? colors.ink} /> }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catálogo', tabBarIcon: ({ color }) => <Icon name="catalog" color={color ?? colors.ink} /> }} />
      <Tabs.Screen name="cart" options={{
        title: 'Carrito',
        tabBarIcon: ({ color }) => <Icon name="cart" color={color ?? colors.ink} />,
        tabBarBadge: itemCount ? (itemCount > 99 ? '99+' : itemCount) : undefined,
      }} />
      <Tabs.Screen name="orders" options={{ title: 'Pedidos', tabBarIcon: ({ color }) => <Icon name="orders" color={color ?? colors.ink} /> }} />
    </Tabs>
  );
}