import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ProductsScreen({ navigation }: any) {
  const { isOwner, canManageProducts } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  async function loadProducts() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<Product>(
        'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC'
      );
      setProducts(results);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(product: Product) {
    if (!canManageProducts()) {
      Alert.alert('Akses Dibatasi', 'Hanya akun Owner yang berhak menghapus produk.');
      return;
    }

    Alert.alert(
      'Hapus Produk',
      `Yakin ingin menghapus "${product.name}"?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.runAsync('UPDATE products SET is_active = 0 WHERE id = ?', [product.id]);
            loadProducts();
          },
        },
      ]
    );
  }

  function handleProductPress(product: Product) {
    if (canManageProducts()) {
      navigation.navigate('AddProduct', { product });
    } else {
      setSelectedProduct(product);
    }
  }

  function handleProductLongPress(product: Product) {
    if (canManageProducts()) {
      deleteProduct(product);
    } else {
      Alert.alert(
        'Akses Terbatas',
        'Akun Kasir hanya dapat melihat katalog. Pengubahan & penghapusan produk hanya dapat dilakukan oleh Owner.'
      );
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  function renderProduct({ item }: { item: Product }) {
    const isLowStock = item.stock <= item.min_stock;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        onLongPress={() => handleProductLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productAvatar}>
          <Text style={styles.productAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productMeta}>
            {item.barcode || 'Tanpa barcode'} • {item.unit}
          </Text>
          <Text style={styles.productPrice}>{formatCurrency(item.sell_price)}</Text>
        </View>
        <View style={styles.productStock}>
          <Text style={[styles.stockText, isLowStock && styles.lowStock]}>
            {item.stock}
          </Text>
          <Text style={[styles.stockUnit, isLowStock && styles.lowStock]}>
            {item.unit}
          </Text>
          {isLowStock && (
            <View style={styles.lowStockDot} />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Role Banner for Kasir */}
      {!canManageProducts() && (
        <View style={styles.roleBanner}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.roleBannerText}>
            Mode Kasir: Anda memiliki akses baca stok & harga katalog.
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari produk berdasarkan nama atau barcode"
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

      {/* Product Count & Info */}
      <View style={styles.metaRow}>
        <Text style={styles.countText}>{filteredProducts.length} produk</Text>
        {canManageProducts() ? (
          <Text style={styles.hintText}>Ketuk untuk edit • Tahan untuk hapus</Text>
        ) : (
          <Text style={styles.hintText}>Ketuk untuk detail</Text>
        )}
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.listContent,
          !canManageProducts() && { paddingBottom: SPACING.lg },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Belum ada produk"
            subtitle={
              canManageProducts()
                ? 'Ketuk tombol + untuk menambahkan produk pertama'
                : 'Belum ada produk yang terdaftar oleh Owner'
            }
          />
        }
      />

      {/* FAB - Hanya untuk Owner (Role: input produk) */}
      {canManageProducts() && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddProduct')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={26} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      {/* Modal Detail Produk (Khusus Kasir View-Only) */}
      <Modal
        visible={!!selectedProduct}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailTitleWrap}>
                <Ionicons name="cube" size={22} color={COLORS.secondary} />
                <Text style={styles.detailTitle} numberOfLines={1}>
                  {selectedProduct?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Barcode</Text>
                <Text style={styles.detailValue}>{selectedProduct?.barcode || 'Tidak ada barcode'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Harga Jual</Text>
                <Text style={[styles.detailValue, styles.detailPrice]}>
                  {selectedProduct ? formatCurrency(selectedProduct.sell_price) : ''}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stok Tersedia</Text>
                <Text style={[styles.detailValue, { fontWeight: '700' }]}>
                  {selectedProduct?.stock} {selectedProduct?.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stok Minimum</Text>
                <Text style={styles.detailValue}>
                  {selectedProduct?.min_stock} {selectedProduct?.unit}
                </Text>
              </View>

              <View style={styles.kasirNoteBox}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.kasirNoteText}>
                  Pengubahan harga, stok masuk, atau data produk hanya dapat dilakukan oleh Owner toko.
                </Text>
              </View>
            </View>

            <Button
              title="Tutup"
              variant="tonal"
              onPress={() => setSelectedProduct(null)}
              style={styles.closeModalBtn}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2F1',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#B2DFDB',
  },
  roleBannerText: {
    fontSize: 12,
    color: '#00695C',
    fontWeight: '500',
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    margin: SPACING.md,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.onSurface,
    padding: 0,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
    paddingBottom: 88,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...ELEVATION.level1,
  },
  productAvatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
  },
  productMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 3,
  },
  productStock: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  stockText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  stockUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  lowStock: {
    color: COLORS.danger,
  },
  lowStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...ELEVATION.level3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...ELEVATION.level3,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: SPACING.sm,
  },
  detailTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  detailBody: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  detailPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  kasirNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  kasirNoteText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  closeModalBtn: {
    marginTop: SPACING.xs,
  },
});
