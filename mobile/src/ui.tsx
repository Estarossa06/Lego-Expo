import type { PropsWithChildren, ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { ColorValue, ViewStyle } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CartItem, Product, StoreOrder } from './types';

export const colors = {
  ink: '#202124',
  muted: '#656b73',
  paper: '#ffffff',
  canvas: '#f4f5f7',
  line: '#e7e8eb',
  yellow: '#ffcf00',
  red: '#e3000b',
  blue: '#2457a6',
  green: '#247a45',
  paleBlue: '#eef3fb',
  paleYellow: '#fff8dc',
  paleRed: '#fff0f0',
};

export const design = {
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 8, md: 12, lg: 18, pill: 999 },
};

export type IconName = 'home' | 'catalog' | 'cart' | 'orders' | 'search' | 'close' | 'back' | 'box' | 'arrow' | 'location' | 'shield' | 'sort';

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
  location: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  sort: { ios: 'arrow.up.arrow.down', android: 'sort', web: 'sort' },
} as const;

export function Icon({ name, color = colors.ink, size = 20 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <SymbolView name={iconNames[name]} tintColor={color} size={size} />;
}

export function ProductImage({ uri, style, label }: { uri: string; style: ViewStyle; label: string }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const failed = failedUri === uri;
  const loaded = loadedUri === uri;

  return (
    <View accessibilityLabel={failed ? `Imagen no disponible: ${label}` : label} accessibilityRole="image" style={[style, styles.imageFrame]}>
      {failed ? (
        <View style={styles.imageFallback}><Icon name="box" color={colors.muted} size={25} /><Text style={styles.imageFallbackText}>Imagen no disponible</Text></View>
      ) : (
        <>
          {!loaded ? <View style={styles.imageLoading}><ActivityIndicator size="small" color={colors.red} /></View> : null}
          <Image
            source={{ uri }}
            resizeMode="contain"
            onLoad={() => setLoadedUri(uri)}
            onError={() => setFailedUri(uri)}
            style={[StyleSheet.absoluteFill, !loaded && styles.imageHidden]}
          />
        </>
      )}
    </View>
  );
}

export function Screen({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.screen, { paddingHorizontal: width > 720 ? 32 : 16 }]}
        keyboardShouldPersistTaps="handled"
      >
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

export function StoreHeader({ cartCount, onCartPress, caption }: { cartCount: number; onCartPress: () => void; caption?: string }) {
  return (
    <View style={styles.storeHeader}>
      <View style={styles.brandLockup}>
        <Image
          accessibilityLabel="Logotipo oficial de LEGO"
          source={require('../assets/images/lego-logo.png')}
          resizeMode="contain"
          style={styles.brandLogo}
        />
        {caption ? <Text style={styles.brandCaption}>{caption}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir carrito, ${cartCount} ${cartCount === 1 ? 'artículo' : 'artículos'}`} onPress={onCartPress} style={({ pressed }) => [styles.headerCart, pressed && styles.productPressed]}>
        <Icon name="cart" color={colors.ink} size={22} />
        {cartCount ? <View style={styles.headerCartBadge}><Text style={styles.headerCartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text></View> : null}
      </Pressable>
    </View>
  );
}

export function ProductGrid({ products, cart, onProductPress, onAdd, limit }: {
  products: Product[];
  cart: CartItem[];
  onProductPress: (product: Product) => void;
  onAdd: (product: Product) => Promise<void>;
  limit?: number;
}) {
  const { width } = useWindowDimensions();
  const columns = width < 560 ? 2 : width < 900 ? 3 : 4;
  const horizontalPadding = width > 720 ? 64 : 32;
  const gridWidth = Math.min(width - horizontalPadding, 920);
  const gap = 12;
  const cardWidth = (gridWidth - gap * (columns - 1)) / columns;
  const visibleProducts = limit ? products.slice(0, limit) : products;

  return (
    <View style={styles.productGrid}>
      {visibleProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantityInCart={cart.find((item) => item.id === product.id)?.quantity ?? 0}
          onPress={() => onProductPress(product)}
          onAdd={() => onAdd(product)}
          style={{ width: cardWidth }}
        />
      ))}
    </View>
  );
}

export function CategoryPill({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.categoryPill, selected && styles.categoryPillSelected, pressed && styles.productPressed]}
    >
      <Text style={[styles.categoryPillText, selected && styles.categoryPillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function StoreNote({ children }: PropsWithChildren) {
  return (
    <View style={styles.storeNote}>
      <Icon name="shield" color={colors.green} size={19} />
      <Text style={styles.storeNoteText}>{children}</Text>
    </View>
  );
}

export function ProductCard({ product, quantityInCart, onPress, onAdd, compact = false, style }: {
  product: Product;
  quantityInCart: number;
  onPress: () => void;
  onAdd: () => Promise<void>;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState('');
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingStock = Math.max(0, product.stock - quantityInCart);

  useEffect(() => () => {
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
  }, []);

  const addProduct = async () => {
    if (adding || remainingStock < 1) return;
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    setAdding(true);
    setAdded(false);
    setAddError('');
    try {
      await onAdd();
      setAdded(true);
      feedbackTimeout.current = setTimeout(() => {
        setAdded(false);
        feedbackTimeout.current = null;
      }, 1200);
    } catch (reason) {
      setAddError(reason instanceof Error ? reason.message : 'No se pudo agregar el producto.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={style}>
      <View style={[styles.productCard, compact && styles.productCompact]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver ${product.name}`} onPress={onPress} style={({ pressed }) => [styles.productImageWrap, pressed && styles.productPressed]}>
          <ProductImage uri={product.imageUrl} label={product.name} style={styles.productImage} />
          <View style={styles.setNumber}><Text style={styles.setNumberText}>{product.id}</Text></View>
        </Pressable>
        <View style={styles.productInfo}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Ver detalle de ${product.name}`} onPress={onPress} style={({ pressed }) => [styles.productDetails, pressed && styles.productPressed]}>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productDescription} numberOfLines={compact ? 1 : 2}>{product.description}</Text>
          </Pressable>
          <View style={styles.productFooter}>
            <View style={styles.productPriceStock}>
              <Money cents={product.priceCents} />
              <Text style={[styles.stock, remainingStock === 0 && styles.outOfStock]}>
                {remainingStock > 0 ? `${remainingStock} disponibles` : product.stock > 0 ? 'Todo en tu carrito' : 'Agotado'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={remainingStock < 1 ? `${product.name} sin unidades disponibles` : `Agregar ${product.name} al carrito`}
              accessibilityState={{ disabled: remainingStock < 1 || adding, busy: adding }}
              disabled={remainingStock < 1 || adding}
              onPress={() => void addProduct()}
              style={({ pressed }) => [
                styles.addToCartButton,
                (remainingStock < 1 || adding) && styles.addToCartButtonDisabled,
                added && styles.addToCartButtonAdded,
                pressed && styles.productPressed,
              ]}
            >
              {adding
                ? <ActivityIndicator size="small" color={colors.ink} />
                : <Text style={styles.addToCartSymbol}>{added ? '✓' : '+'}</Text>}
            </Pressable>
          </View>
          {addError ? <Text accessibilityRole="alert" style={styles.addToCartError}>{addError}</Text> : null}
          {added ? <Text accessibilityLiveRegion="polite" style={styles.addToCartSuccess}>Agregado al carrito</Text> : null}
        </View>
      </View>
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

export function QuantityControl({ quantity, onChange, max = 99 }: { quantity: number; onChange: (value: number) => void; max?: number }) {
  const atMaximum = quantity >= max;
  return (
    <View style={styles.quantity}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reducir cantidad" onPress={() => onChange(quantity - 1)} style={styles.quantityButton}><Text style={styles.quantitySymbol}>−</Text></Pressable>
      <Text style={styles.quantityValue}>{quantity}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
        accessibilityState={{ disabled: atMaximum }}
        disabled={atMaximum}
        onPress={() => onChange(quantity + 1)}
        style={[styles.quantityButton, atMaximum && styles.quantityButtonDisabled]}
      >
        <Text style={styles.quantitySymbol}>+</Text>
      </Pressable>
    </View>
  );
}

export function Field({ label, value, onChangeText, keyboardType, autoCapitalize = 'sentences', placeholder, multiline = false, secureTextEntry = false, error }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
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
        secureTextEntry={secureTextEntry}
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
  return (
    <View style={[styles.status, status === 'completed' && styles.statusDone, status === 'rejected' && styles.statusRejected, status === 'processing' && styles.statusProcessing]}>
      <View style={[styles.statusDot, status === 'completed' && styles.statusDotDone, status === 'rejected' && styles.statusDotRejected, status === 'processing' && styles.statusDotProcessing]} />
      <Text style={[styles.statusText, status === 'completed' && styles.statusTextDone, status === 'rejected' && styles.statusTextRejected, status === 'processing' && styles.statusTextProcessing]}>{labels[status]}</Text>
    </View>
  );
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
  safe: { flex: 1, backgroundColor: colors.canvas },
  screen: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 920, gap: 18 },
  contentWide: { maxWidth: 920 },
  pageHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.red, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginBottom: 4 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 33, fontWeight: '900' },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionText: { color: colors.ink, fontSize: 19, fontWeight: '900' },
  storeHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLogo: { width: 48, height: 48 },
  brandName: { color: colors.ink, fontSize: 15, fontWeight: '900', letterSpacing: 1.4 },
  brandCaption: { color: colors.muted, fontSize: 11, marginTop: 2 },
  headerCart: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  headerCartBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  headerCartBadgeText: { color: colors.paper, fontSize: 10, fontWeight: '900' },
  sectionAction: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  productCard: { overflow: 'hidden', backgroundColor: colors.paper, borderColor: colors.line, borderWidth: 1, borderRadius: 12, minHeight: 0, shadowColor: '#17191f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  productPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  productCompact: { flexDirection: 'column', minHeight: 0, flex: 1 },
  productImageWrap: { width: '100%', aspectRatio: 1.08, minHeight: 0, backgroundColor: '#fafafa', padding: 10, position: 'relative', borderBottomWidth: 1, borderBottomColor: colors.line },
  productImageCompact: { width: '100%', aspectRatio: 1, minHeight: 0 },
  productImage: { width: '100%', height: '100%' },
  imageFrame: { overflow: 'hidden', backgroundColor: colors.paper },
  imageLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' },
  imageHidden: { opacity: 0 },
  imageFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.canvas },
  imageFallbackText: { color: colors.muted, fontSize: 10, textAlign: 'center' },
  setNumber: { position: 'absolute', top: 8, left: 8, backgroundColor: colors.paper, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, borderWidth: 1, borderColor: colors.line },
  setNumberText: { color: colors.ink, fontSize: 9, fontWeight: '900' },
  productInfo: { minWidth: 0, flex: 1, padding: 11, justifyContent: 'space-between', gap: 9 },
  productDetails: { gap: 5 },
  productCategory: { color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  productName: { color: colors.ink, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  productDescription: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  productFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  productPriceStock: { flex: 1, minWidth: 0, gap: 3 },
  addToCartButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.red },
  addToCartButtonDisabled: { opacity: 0.42 },
  addToCartButtonAdded: { backgroundColor: '#e4f4e9' },
  addToCartSymbol: { color: colors.paper, fontSize: 27, lineHeight: 31, fontWeight: '600', textAlign: 'center' },
  addToCartError: { color: colors.red, fontSize: 11, lineHeight: 15 },
  addToCartSuccess: { color: colors.green, fontSize: 11, fontWeight: '700' },
  stock: { color: colors.green, fontSize: 10, fontWeight: '800' },
  outOfStock: { color: colors.red },
  money: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  moneyLarge: { color: colors.ink, fontSize: 25, fontWeight: '900' },
  button: { minHeight: 52, flexDirection: 'row', gap: 9, backgroundColor: colors.red, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonSecondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  buttonText: { color: colors.paper, fontSize: 14, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  buttonTextSecondary: { color: colors.ink },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 3, backgroundColor: colors.paper },
  quantityButton: { width: 36, height: 36, borderRadius: 6, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  quantityButtonDisabled: { opacity: 0.4 },
  quantitySymbol: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  quantityValue: { minWidth: 22, textAlign: 'center', color: colors.ink, fontWeight: '900' },
  field: { gap: 7 },
  fieldLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 13, color: colors.ink, backgroundColor: colors.paper, fontSize: 15 },
  inputError: { borderColor: colors.red },
  fieldError: { color: colors.red, fontSize: 12 },
  textArea: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.paper, shadowColor: '#17191f', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  categoryPill: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  categoryPillSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  categoryPillText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  categoryPillTextSelected: { color: colors.paper },
  storeNote: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 10, backgroundColor: '#edf7ef' },
  storeNoteText: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 17 },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.paleBlue, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 20 },
  statusDone: { backgroundColor: '#e4f4e9' },
  statusRejected: { backgroundColor: '#fde9e8' },
  statusProcessing: { backgroundColor: colors.paleYellow },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },
  statusDotDone: { backgroundColor: colors.green },
  statusDotRejected: { backgroundColor: colors.red },
  statusDotProcessing: { backgroundColor: '#a76b00' },
  statusText: { color: colors.blue, fontSize: 11, fontWeight: '900' },
  statusTextDone: { color: colors.green },
  statusTextRejected: { color: colors.red },
  statusTextProcessing: { color: '#8a5800' },
  empty: { alignItems: 'center', paddingVertical: 42, paddingHorizontal: 16, gap: 10, borderRadius: 14, backgroundColor: colors.paper },
  emptyMark: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.paleBlue, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyDetail: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  notice: { padding: 13, borderRadius: 10, backgroundColor: colors.paleBlue, borderLeftWidth: 4, borderLeftColor: colors.blue },
  noticeSuccess: { backgroundColor: '#e4f4e9', borderLeftColor: colors.green },
  noticeError: { backgroundColor: '#fde9e8', borderLeftColor: colors.red },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 19 },
});