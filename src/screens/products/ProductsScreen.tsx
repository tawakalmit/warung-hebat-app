import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ProductsScreen({ navigation }: any) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  function renderProduct({ item }: { item: Product }) {
    const isLowStock = item.stock <= item.min_stock;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('AddProduct', { product: item })}
        onLongPress={() => deleteProduct(item)}
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
      {/* Search Bar - Google style */}
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

      {/* Product Count */}
      <Text style={styles.countText}>{filteredProducts.length} produk</Text>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="cube-outline"
            title="Belum ada produk"
            subtitle="Ketuk + untuk menambahkan produk pertama"
          />
        }
      />

      {/* FAB - Material Design */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={COLORS.onPrimaryContainer} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    letterSpacing: 0.25,
  },
  countText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: 0.4,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 88,
    flexGrow: 1,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...ELEVATION.level1,
  },
  productAvatar: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productAvatarText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onPrimaryContainer,
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  productMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
    marginTop: 2,
  },
  productStock: {
    alignItems: 'center',
    minWidth: 44,
  },
  stockText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  stockUnit: {
    fontSize: 10,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  lowStock: {
    color: COLORS.danger,
  },
  lowStockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...ELEVATION.level3,
  },
});
