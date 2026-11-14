import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../src/store';
import { ActionButton, Field, Notice, PageHeader, Screen, StoreHeader } from '../src/ui';

export default function AuthScreen() {
  const { login, register } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'admin',
    adminInvitationCode: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    setError('');
    const email = form.email.trim();
    const password = form.password;
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const adminInvitationCode = form.adminInvitationCode.trim();

    if (!email || !password || (mode === 'register' && (!firstName || !lastName))) {
      setError('Completa los campos obligatorios para continuar.');
      return;
    }
    if (mode === 'register' && form.role === 'admin' && !adminInvitationCode) {
      setError('Introduce el código de invitación para crear una cuenta administrativa.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Introduce un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (mode === 'register' && password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          firstName,
          lastName,
          email,
          password,
          role: form.role,
          ...(form.role === 'admin' ? { adminInvitationCode } : {}),
        });
      }
      router.replace('/(tabs)/catalog');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <StoreHeader cartCount={0} onCartPress={() => router.push('/(tabs)/cart')} caption="Acceso seguro" />
      <PageHeader label={mode === 'login' ? 'BIENVENIDO' : 'CREAR CUENTA'} title={mode === 'login' ? 'Iniciar sesión' : 'Registrarse'} />

      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <ActionButton label="Iniciar sesión" secondary={mode !== 'login'} onPress={() => setMode('login')} />
          <ActionButton label="Registrarse" secondary={mode !== 'register'} onPress={() => setMode('register')} />
        </View>

        {mode === 'register' ? (
          <>
            <Field label="Nombre" value={form.firstName} onChangeText={(value) => update('firstName', value)} placeholder="Tu nombre" />
            <Field label="Apellido" value={form.lastName} onChangeText={(value) => update('lastName', value)} placeholder="Tu apellido" />
          </>
        ) : null}

        <Field label="Correo electrónico" value={form.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="usuario@ejemplo.com" />
        <Field label="Contraseña" value={form.password} onChangeText={(value) => update('password', value)} placeholder="Mínimo 8 caracteres" secureTextEntry />

        {mode === 'register' ? (
          <>
            <Field label="Confirmar contraseña" value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} placeholder="Repite tu contraseña" secureTextEntry />
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#202124', fontSize: 14, fontWeight: '900' }}>Tipo de cuenta</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <ActionButton label="Usuario" secondary={form.role !== 'user'} onPress={() => update('role', 'user')} />
                <ActionButton label="Administrador" secondary={form.role !== 'admin'} onPress={() => update('role', 'admin')} />
              </View>
              <Text style={{ color: '#656b73', fontSize: 12, lineHeight: 18 }}>
                Para crear una cuenta administrativa se requiere un código de invitación válido configurado por el administrador del sistema.
              </Text>
            </View>
            {form.role === 'admin' ? (
              <Field
                label="Código de invitación administrativa"
                value={form.adminInvitationCode}
                onChangeText={(value) => update('adminInvitationCode', value)}
                placeholder="Introduce tu código de invitación"
                autoCapitalize="none"
                secureTextEntry
              />
            ) : null}
          </>
        ) : null}

        {error ? <Notice tone="error">{error}</Notice> : null}
        <ActionButton label={mode === 'login' ? 'Entrar' : 'Crear cuenta'} loading={saving} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}
