import type { PropsWithChildren, ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Product, StoreOrder } from './types';

export const colors = {
  ink: '#17191f',
  muted: '#69717d',
  paper: '#ffffff',
  canvas: '#f5f7fb',
  line: '#e4e8ef',
  yellow: '#ffd500',
  red: '#d71920',
  blue: '#0055bf',
  green: '#247447',
  paleBlue: '#e9f2ff',
  paleYellow: '#fff8d8',
};

export type IconName = 'home' | 'catalog' | 'cart' | 'orders' | 'search' | 'close' | 'back' | 'box' | 'arrow';

const iconNames = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  catalog: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
  cart: { ios: 'cart.fill', android: 'shopping_cart', web: 'shopping_cart' },
  orders: { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  back: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' },
  box: { ios: 'shippingbox', android: 'deployed_code', web: 'deployed_code' },
  arrow: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
} as const;

export function Icon({ name, color = colors.ink, size = 20 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <SymbolView name={iconNames[name]} tintColor={color} size={size} />;
}

export function Screen({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingHorizontal: width > 720 ? 32 : 18 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.content, width > 960 && styles.contentWide]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({ label, title, action }: { label?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.headerCopy}>
        {label ? <Text style={styles.eyebrow}>{label.toUpperCase()}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{children}</Text>
      {action}
    </View>
  );
}

export function ProductCard({ product, onPress, compact = false }: {
  product: Product;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.productCard, compact && styles.productCompact, pressed && styles.productPressed]}>
        <View style={[styles.productImageWrap, compact && styles.productImageCompact]}>
          <Image source={{ uri: product.imageUrl }} style={styles.productImage} resizeMode="contain" />
          <View style={styles.setNumber}><Text style={styles.setNumberText}>{product.id}</Text></View>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productCategory}>{product.category}</Text>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.productDescription} numberOfLines={compact ? 1 : 2}>{product.description}</Text>
          <View style={styles.productFooter}>
            <Money cents={product.priceCents} />
            <Text style={[styles.stock, product.stock === 0 && styles.outOfStock]}>
              {product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function Money({ cents, large = false }: { cents: number; large?: boolean }) {
  return <Text style={large ? styles.moneyLarge : styles.money}>{(cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</Text>;
}

export function ActionButton({ label, onPress, secondary = false, disabled = false, icon, loading = false }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.ink} /> : icon ? <Icon name={icon} color={colors.ink} size={18} /> : null}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function QuantityControl({ quantity, onChange }: { quantity: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.quantity}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reducir cantidad" onPress={() => onChange(quantity - 1)} style={styles.quantityButton}><Text style={styles.quantitySymbol}>−</Text></Pressable>
      <Text style={styles.quantityValue}>{quantity}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Aumentar cantidad" onPress={() => onChange(quantity + 1)} style={styles.quantityButton}><Text style={styles.quantitySymbol}>+</Text></Pressable>
    </View>
  );
}

export function Field({ label, value, onChangeText, keyboardType, autoCapitalize = 'sentences', placeholder, multiline = false, error }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  placeholder?: string;
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea, error && styles.inputError]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.searchBox}>
      <Icon name="search" color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search" />
      {value ? <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => onChangeText('')}><Icon name="close" color={colors.muted} size={18} /></Pressable> : null}
    </View>
  );
}

export function LoadingState({ label = 'Cargando catálogo…' }: { label?: string }) {
  return <View style={styles.loading}><ActivityIndicator color={colors.blue} /><Text style={styles.loadingText}>{label}</Text></View>;
}

export function Notice({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'error' }>) {
  return <View style={[styles.notice, tone === 'success' && styles.noticeSuccess, tone === 'error' && styles.noticeError]}><Text style={styles.noticeText}>{children}</Text></View>;
}

export function OrderStatus({ status }: { status: StoreOrder['status'] }) {
  const labels = {
    pending_sync: 'Pendiente de sincronizar',
    processing: 'Procesando',
    completed: 'Completado',
    rejected: 'Rechazado',
  };
  return <Text style={[styles.status, status === 'completed' && styles.statusDone, status === 'rejected' && styles.statusRejected]}>{labels[status]}</Text>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}><Icon name="box" color={colors.blue} size={26} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  screen: { width: '100%', alignItems: 'center', paddingTop: 16, paddingBottom: 34 },
  content: { width: '100%', maxWidth: 720, gap: 18 },
  contentWide: { maxWidth: 920 },
  pageHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.red, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionText: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  productCard: { flexDirection: 'row', overflow: 'hidden', backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 12, minHeight: 150 },
  productPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  productCompact: { flexDirection: 'column', minHeight: 0, flex: 1 },
  productImageWrap: { width: 132, minHeight: 148, backgroundColor: colors.paleYellow, padding: 10, position: 'relative' },
  productImageCompact: { width: '100%', aspectRatio: 1, minHeight: 0 },
  productImage: { width: '100%', height: '100%' },
  setNumber: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.paper, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  setNumberText: { color: colors.ink, fontSize: 9, fontWeight: '900' },
  productInfo: { flex: 1, minWidth: 0, padding: 14, justifyContent: 'center', gap: 6 },
  productCategory: { color: colors.blue, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  productName: { color: colors.ink, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  productDescription: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  productFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 4 },
  stock: { color: colors.green, fontSize: 10, fontWeight: '800' },
  outOfStock: { color: colors.red },
  money: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  moneyLarge: { color: colors.ink, fontSize: 23, fontWeight: '900' },
  button: { minHeight: 52, flexDirection: 'row', gap: 9, backgroundColor: colors.yellow, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonSecondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.ink, fontSize: 14, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  buttonTextSecondary: { color: colors.ink },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 7, borderWidth: 1, borderColor: colors.line, padding: 3 },
  quantityButton: { width: 34, height: 34, borderRadius: 5, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  quantitySymbol: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  quantityValue: { minWidth: 22, textAlign: 'center', color: colors.ink, fontWeight: '900' },
  field: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 7, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.paper, fontSize: 15 },
  inputError: { borderColor: colors.red },
  fieldError: { color: colors.red, fontSize: 12 },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  searchBox: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.paper },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  status: { alignSelf: 'flex-start', color: colors.blue, backgroundColor: colors.paleBlue, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, fontSize: 11, fontWeight: '900' },
  statusDone: { backgroundColor: '#e4f4e9', color: colors.green },
  statusRejected: { backgroundColor: '#fde9e8', color: colors.red },
  empty: { alignItems: 'center', paddingVertical: 42, paddingHorizontal: 16, gap: 10 },
  emptyMark: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyDetail: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  notice: { padding: 13, borderRadius: 8, backgroundColor: colors.paleBlue, borderLeftWidth: 4, borderLeftColor: colors.blue },
  noticeSuccess: { backgroundColor: '#e4f4e9', borderLeftColor: colors.green },
  noticeError: { backgroundColor: '#fde9e8', borderLeftColor: colors.red },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
});