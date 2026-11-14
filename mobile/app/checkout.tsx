import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../src/store';
import { ActionButton, colors, EmptyState, Field, Money, Notice, PageHeader, ProductImage, Screen, SectionTitle, StoreNote } from '../src/ui';
import type { Customer } from '../src/types';

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };

export default function CheckoutScreen() {
  const { cart, serverAvailable, placeOrder } = useStore();
  const [customer, setCustomer] = useState(emptyCustomer);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Customer, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const update = (key: keyof Customer, value: string) => {
    setCustomer((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async () => {
    const clean = Object.fromEntries(Object.entries(customer).map(([key, value]) => [key, value.trim()])) as Customer;
    const nextErrors: Partial<Record<keyof Customer, string>> = {};
    for (const [key, value] of Object.entries(clean) as [keyof Customer, string][]) {
      if (!value) nextErrors[key] = 'Este dato es obligatorio.';
    }
    if (clean.email && !/^\S+@\S+\.\S+$/.test(clean.email)) nextErrors.email = 'Escribe un correo válido.';
    if (clean.phone && clean.phone.replace(/\D/g, '').length < 7) nextErrors.phone = 'Escribe un teléfono válido.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    setError('');
    try {
      const id = await placeOrder(clean);
      router.replace({ pathname: '/order/[id]', params: { id } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar el pedido.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <PageHeader label="Compra como invitado" title="Entrega" />
      {!cart.length ? (
        <>
          <EmptyState title="Tu carrito está vacío" detail="Agrega productos antes de continuar con la compra." />
          <ActionButton label="Volver al catálogo" secondary onPress={() => router.replace('/(tabs)/catalog')} />
        </>
      ) : (
      <>
      <Notice tone={serverAvailable ? 'success' : 'info'}>
        {serverAvailable ? 'La tienda validará el inventario antes de confirmar.' : 'El pedido quedará pendiente hasta que el servidor pueda validar el inventario.'}
      </Notice>
      <View style={styles.summaryCard}>
        <SectionTitle>Resumen de tu compra</SectionTitle>
        {cart.map((item) => (
          <View key={item.id} style={styles.summaryItem}>
            <ProductImage uri={item.imageUrl} label={item.name} style={styles.summaryImage} />
            <View style={styles.summaryItemText}>
              <Text numberOfLines={2} style={styles.summaryName}>{item.name}</Text>
              <Text style={styles.summaryQuantity}>{item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}</Text>
            </View>
            <Money cents={item.priceCents * item.quantity} />
          </View>
        ))}
        <View style={styles.summaryTotal}>
          <Text style={styles.totalLabel}>Total</Text>
          <Money cents={subtotal} large />
        </View>
      </View>
      <View style={styles.formCard}>
        <SectionTitle>Datos de entrega</SectionTitle>
      <Field label="Nombre completo" value={customer.name} onChangeText={(value) => update('name', value)} autoCapitalize="words" placeholder="Nombre y apellidos" error={fieldErrors.name} />
      <Field label="Teléfono" value={customer.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" placeholder="Teléfono de contacto" error={fieldErrors.phone} />
      <Field label="Correo electrónico" value={customer.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="nombre@correo.com" error={fieldErrors.email} />
      <Field label="Dirección" value={customer.address} onChangeText={(value) => update('address', value)} multiline placeholder="Calle, número, ciudad y código postal" error={fieldErrors.address} />
      </View>
      <StoreNote>Pago de demostración. No se solicitan datos bancarios; el pedido solo se completa si el servidor confirma existencias.</StoreNote>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ActionButton label="Confirmar pedido" icon="arrow" loading={saving} onPress={() => void submit()} />
      <ActionButton label="Volver al carrito" icon="back" secondary onPress={() => router.back()} />
      </>
      )}
    </Screen>
  );
}

const styles = {
  summaryCard: { gap: 14, padding: 16, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  summaryItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  summaryImage: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.canvas },
  summaryItemText: { flex: 1, gap: 3 },
  summaryName: { color: colors.ink, fontSize: 12, fontWeight: '800' as const },
  summaryQuantity: { color: colors.muted, fontSize: 10 },
  summaryTotal: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, borderTopWidth: 1, borderColor: colors.line, paddingTop: 12 },
  totalLabel: { color: colors.ink, fontSize: 16, fontWeight: '900' as const },
  formCard: { gap: 16, padding: 16, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
};