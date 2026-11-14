import { Stack, useRouter, useSegments } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StoreProvider, useStore } from '../src/store';
import { initializeDatabase } from '../src/database';
import { LoadingState } from '../src/ui';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="lego-store.db" onInit={initializeDatabase}>
      <StoreProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </StoreProvider>
    </SQLiteProvider>
  );
}

function AppNavigator() {
  const { authReady, isAuthenticated } = useStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!authReady) return;
    const onAuthScreen = segments[0] === 'auth';
    if (!isAuthenticated && !onAuthScreen) {
      router.replace('/auth');
    } else if (isAuthenticated && onAuthScreen) {
      router.replace('/(tabs)/catalog');
    }
  }, [authReady, isAuthenticated, router, segments]);

  if (!authReady) return <LoadingState label="Restaurando sesión…" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
