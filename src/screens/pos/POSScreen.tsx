import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { productsApi } from '../../services/api';
import { Product } from '../../types';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import BarcodeScanner from '../../components/BarcodeScanner';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function POSScreen({ navigation }: any) {
  const { items, manualItems, addItem, getTotal, getItemCount } = useCart();
  const { currentTheme } = useTheme();
  const { user, canCreateTransactions } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  async function loadProducts() {
    try {
      const res = await productsApi.getAll({ only_in_stock: true });
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (error) {
      console.error('Error loading products for POS:', error);
    }
  }

  async function handleBarcodeScan(barcode: string) {
    setShowScanner(false);
    let product = products.find(p => p.barcode === barcode);
    if (!product) {
      try {
        const res = await productsApi.getAll({ search: barcode });
        if (res.success && res.data && res.data.length > 0) {
          product = res.data.find(p => p.barcode === barcode) || res.data[0];
        }
      } catch (err) {
        console.error('Error searching barcode:', err);
      }
    }

    if (product) {
      if (product.stock <= 0) {
        Alert.alert('Stok Habis', `${product.name} stoknya habis`);
        return;
      }
      const cartItem = items.find(i => i.product.id === product.id);
      if (cartItem && cartItem.quantity >= product.stock) {
        Alert.alert('Stok Tidak Cukup', `Stok ${product.name} tersisa ${product.stock}`);
        return;
      }
      addItem(product);
    } else {
      Alert.alert('Tidak Ditemukan', `Produk dengan barcode "${barcode}" tidak ditemukan`);
    }
  }

  function handleAddToCart(product: Product) {
    const cartItem = items.find(i => i.product.id === product.id);
    if (cartItem && cartItem.quantity >= product.stock) {
      Alert.alert('Stok Tidak Cukup', `Stok ${product.name} tersisa ${product.stock}`);
      return;
    }
    addItem(product);
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  function renderProduct({ item }: { item: Product }) {
    const inCart = items.find(i => i.product.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.productItem, inCart && { backgroundColor: currentTheme.primaryContainer }]}
        onPress={() => handleAddToCart(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.productAvatar, inCart && { backgroundColor: currentTheme.primary }]}>
          <Text style={[styles.avatarText, inCart && styles.avatarTextInCart]}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={[styles.productPrice, { color: currentTheme.primary }]}>{formatCurrency(item.sell_price)}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.stockLabel}>Stok {item.stock}</Text>
          {inCart && (
            <View style={[styles.cartBadge, { backgroundColor: currentTheme.primary }]}>
              <Text style={styles.cartBadgeText}>{inCart.quantity}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search & Scan Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={COLORS.placeholder}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}>
          <Ionicons name="scan-outline" size={22} color={COLORS.onPrimaryContainer} />
        </TouchableOpacity>
      </View>

      {/* Cashier Accountability Bar */}
      <View style={styles.cashierBar}>
        <View style={styles.cashierInfo}>
          <Ionicons name="person-circle-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.cashierText}>
            Kasir Bertugas: <Text style={styles.cashierName}>{user?.name || 'Kasir'}</Text>
          </Text>
        </View>
        <View style={[styles.cashierRoleBadge, { backgroundColor: user?.role === 'owner' ? '#EDE7F6' : '#E0F2F1' }]}>
          <Text style={[styles.cashierRoleText, { color: user?.role === 'owner' ? COLORS.tertiary : COLORS.secondary }]}>
            {user?.role === 'owner' ? 'Owner' : 'Kasir'}
          </Text>
        </View>
      </View>

      {/* Product Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
      />

      {/* Cart Summary Bar - Material Bottom Sheet style */}
      {(items.length > 0 || manualItems.length > 0) && (
        <TouchableOpacity
          style={[styles.cartBar, { backgroundColor: currentTheme.primary }]}
          onPress={() => {
            if (!canCreateTransactions()) {
              Alert.alert('Akses Dibatasi', 'Akun Anda tidak aktif untuk memproses transaksi kasir.');
              return;
            }
            navigation.navigate('Checkout');
          }}
          activeOpacity={0.9}
        >
          <View style={styles.cartLeft}>
            <View style={styles.cartIconContainer}>
              <Ionicons name="cart" size={20} color={COLORS.textWhite} />
              <View style={styles.cartCountBadge}>
                <Text style={styles.cartCountText}>{getItemCount()}</Text>
              </View>
            </View>
            <Text style={styles.cartLabel}>{items.length + manualItems.length} jenis barang</Text>
          </View>
          <View style={styles.cartRight}>
            <Text style={styles.cartTotal}>{formatCurrency(getTotal())}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textWhite} />
          </View>
        </TouchableOpacity>
      )}

      <BarcodeScanner
        visible={showScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 0.25,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashierBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: SPACING.xs,
  },
  cashierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cashierText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cashierName: {
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  cashierRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  cashierRoleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 88,
  },
  productRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  productItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...ELEVATION.level1,
  },
  productInCart: {
    backgroundColor: COLORS.primaryContainer,
  },
  productAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  productAvatarInCart: {
    backgroundColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  avatarTextInCart: {
    color: COLORS.textWhite,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
    marginBottom: 4,
    letterSpacing: 0.1,
    minHeight: 34,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    letterSpacing: 0.1,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  stockLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  cartBadge: {
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: COLORS.textWhite,
    fontSize: 10,
    fontWeight: '600',
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartCountBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: COLORS.warning,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
  },
  cartLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    letterSpacing: 0.25,
  },
  cartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cartTotal: {
    color: COLORS.textWhite,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
});
