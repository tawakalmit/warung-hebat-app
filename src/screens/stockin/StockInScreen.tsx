import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { Product } from '../../types';
import { generateId, formatCurrency } from '../../utils/helpers';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BarcodeScanner from '../../components/BarcodeScanner';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function StockInScreen({ navigation }: any) {
  const { user, isOwner } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const db = await getDatabase();
    const prods = await db.getAllAsync<Product>('SELECT * FROM products WHERE is_active = 1 ORDER BY name');
    setProducts(prods);
  }

  function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    setBuyPrice(product.buy_price.toString());
    setSearch('');
  }

  async function handleBarcodeScan(barcode: string) {
    setShowScanner(false);
    const db = await getDatabase();
    const product = await db.getFirstAsync<Product>(
      'SELECT * FROM products WHERE barcode = ? AND is_active = 1',
      [barcode]
    );

    if (product) {
      handleSelectProduct(product);
    } else {
      if (isOwner()) {
        Alert.alert('Produk Tidak Ditemukan', `Barcode "${barcode}" tidak terdaftar. Tambah produk baru?`, [
          { text: 'Batal', style: 'cancel' },
          { text: 'Tambah', onPress: () => navigation.navigate('AddProduct', { barcode }) },
        ]);
      } else {
        Alert.alert('Produk Tidak Ditemukan', `Barcode "${barcode}" tidak terdaftar. Hubungi Owner untuk mendaftarkan produk baru.`);
      }
    }
  }

  async function handleSubmit() {
    if (!selectedProduct) {
      Alert.alert('Error', 'Pilih produk terlebih dahulu');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Jumlah harus lebih dari 0');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const qty = parseInt(quantity);
      const price = parseFloat(buyPrice) || 0;
      const total = qty * price;

      await db.runAsync(
        `INSERT INTO stock_in (id, product_id, supplier_id, quantity, buy_price, total, note, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [generateId(), selectedProduct.id, null, qty, price, total, note || null, user!.id]
      );

      await db.runAsync(
        `UPDATE products SET stock = stock + ?, buy_price = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
        [qty, price, selectedProduct.id]
      );

      Alert.alert('Berhasil', `Stok ${selectedProduct.name} bertambah ${qty} ${selectedProduct.unit}`);
      setSelectedProduct(null);
      setQuantity('');
      setBuyPrice('');
      setNote('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan data barang masuk');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = search
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search))
      ).slice(0, 5)
    : [];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Selected Product */}
        {selectedProduct ? (
          <View style={styles.selectedCard}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>
                {selectedProduct.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedProduct.name}</Text>
              <Text style={styles.selectedDetail}>
                Stok saat ini: {selectedProduct.stock} {selectedProduct.unit}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.clearBtn}>
              <Ionicons name="close" size={20} color={COLORS.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {/* Search / Scan */}
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary} />
                <Input
                  placeholder="Cari produk atau barcode"
                  value={search}
                  onChangeText={setSearch}
                  containerStyle={styles.searchInput}
                />
              </View>
              <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}>
                <Ionicons name="scan-outline" size={22} color={COLORS.onPrimaryContainer} />
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {filteredProducts.length > 0 && (
              <View style={styles.searchResults}>
                {filteredProducts.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchItem}
                    onPress={() => handleSelectProduct(product)}
                  >
                    <View style={styles.searchItemAvatar}>
                      <Text style={styles.searchItemAvatarText}>
                        {product.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.searchItemInfo}>
                      <Text style={styles.searchItemName}>{product.name}</Text>
                      <Text style={styles.searchItemStock}>
                        Stok: {product.stock} {product.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Form */}
        {selectedProduct && (
          <View style={styles.form}>
            <View style={styles.row}>
              <Input
                label="Jumlah"
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Harga Beli/unit"
                placeholder="0"
                value={buyPrice}
                onChangeText={setBuyPrice}
                keyboardType="numeric"
                containerStyle={styles.halfInput}
              />
            </View>

            {quantity && buyPrice ? (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(parseInt(quantity) * parseFloat(buyPrice))}
                </Text>
              </View>
            ) : null}

            <Input
              label="Catatan (opsional)"
              placeholder="Catatan"
              value={note}
              onChangeText={setNote}
              multiline
            />

            <Button
              title="Simpan Barang Masuk"
              onPress={handleSubmit}
              loading={loading}
              size="large"
              icon={<Ionicons name="checkmark" size={18} color={COLORS.textWhite} />}
            />
          </View>
        )}
      </View>

      <BarcodeScanner
        visible={showScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.xl,
    paddingLeft: SPACING.md,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    ...ELEVATION.level2,
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  searchItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchItemAvatarText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
  },
  searchItemInfo: { flex: 1 },
  searchItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  searchItemStock: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textWhite,
  },
  selectedInfo: { flex: 1 },
  selectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  selectedDetail: {
    fontSize: 12,
    color: COLORS.onPrimaryContainer,
    opacity: 0.7,
    marginTop: 2,
  },
  clearBtn: {
    padding: SPACING.sm,
  },
  form: {
    marginTop: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: { flex: 1 },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...ELEVATION.level1,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
