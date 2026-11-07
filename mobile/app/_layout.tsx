import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../src/store';
import { initializeDatabase } from '../src/database';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="lego-store.db" onInit={initializeDatabase}>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </StoreProvider>
    </SQLiteProvider>
  );
}
