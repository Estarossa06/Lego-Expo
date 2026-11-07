import { router } from 'expo-router';
import { useState } from 'react';
import { useStore } from '../src/store';
import { ActionButton, Field, Notice, PageHeader, Screen } from '../src/ui';
import type { Customer } from '../src/types';

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };

export default function CheckoutScreen() {
  const { serverAvailable, placeOrder } = useStore();
  const [customer, setCustomer] = useState(emptyCustomer);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Customer, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
      <Notice tone={serverAvailable ? 'success' : 'info'}>
        {serverAvailable ? 'La tienda validará el inventario antes de confirmar.' : 'El pedido quedará pendiente hasta que el servidor pueda validar el inventario.'}
      </Notice>
      <Field label="Nombre completo" value={customer.name} onChangeText={(value) => update('name', value)} autoCapitalize="words" placeholder="Nombre y apellidos" error={fieldErrors.name} />
      <Field label="Teléfono" value={customer.phone} onChangeText={(value) => update('phone', value)} keyboardType="phone-pad" placeholder="Teléfono de contacto" error={fieldErrors.phone} />
      <Field label="Correo electrónico" value={customer.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="nombre@correo.com" error={fieldErrors.email} />
      <Field label="Dirección" value={customer.address} onChangeText={(value) => update('address', value)} multiline placeholder="Calle, número, ciudad y código postal" error={fieldErrors.address} />
      <Notice>Pago simulado. No se solicitan datos bancarios; el pedido solo se completa si el servidor confirma stock.</Notice>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <ActionButton label="Confirmar pedido" icon="arrow" loading={saving} onPress={() => void submit()} />
      <ActionButton label="Volver al carrito" icon="back" secondary onPress={() => router.back()} />
    </Screen>
  );
}