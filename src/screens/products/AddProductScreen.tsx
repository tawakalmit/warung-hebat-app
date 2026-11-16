import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { Category } from '../../types';
import { generateId } from '../../utils/helpers';
import Button from '../../components/Button';
import Input from '../../components/Input';
import BarcodeScanner from '../../components/BarcodeScanner';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

export default function AddProductScreen({ navigation, route }: any) {
  const { canManageProducts } = useAuth();
  const editProduct = route?.params?.product;
  const [name, setName] = useState(editProduct?.name || '');
  const [barcode, setBarcode] = useState(editProduct?.barcode || route?.params?.barcode || '');
  const [categoryId, setCategoryId] = useState(editProduct?.category_id || '');
  const [buyPrice, setBuyPrice] = useState(editProduct?.buy_price?.toString() || '');
  const [sellPrice, setSellPrice] = useState(editProduct?.sell_price?.toString() || '');
  const [stock, setStock] = useState(editProduct?.stock?.toString() || '0');
  const [minStock, setMinStock] = useState(editProduct?.min_stock?.toString() || '5');
  const [unit, setUnit] = useState(editProduct?.unit || 'pcs');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canManageProducts()) {
      Alert.alert(
        'Akses Ditolak',
        'Hanya akun Owner yang berhak menambah atau mengubah data produk.',
        [{ text: 'Kembali', onPress: () => navigation.goBack() }]
      );
      return;
    }
    loadCategories();
  }, [canManageProducts]);

  async function loadCategories() {
    const db = await getDatabase();
    const results = await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name');
    setCategories(results);
  }

  async function handleSave() {
    if (!canManageProducts()) {
      Alert.alert('Akses Ditolak', 'Hanya Owner yang berhak menyimpan data produk');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Nama produk harus diisi');
      return;
    }
    if (!sellPrice || parseFloat(sellPrice) <= 0) {
      Alert.alert('Error', 'Harga jual harus diisi');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();

      if (editProduct) {
        await db.runAsync(
          `UPDATE products SET name=?, barcode=?, category_id=?, buy_price=?, sell_price=?, 
           stock=?, min_stock=?, unit=?, updated_at=datetime('now','localtime') WHERE id=?`,
          [name.trim(), barcode || null, categoryId || null, parseFloat(buyPrice) || 0, parseFloat(sellPrice), parseInt(stock) || 0, parseInt(minStock) || 5, unit, editProduct.id]
        );
        Alert.alert('Berhasil', 'Produk berhasil diperbarui');
      } else {
        if (barcode) {
          const existing = await db.getFirstAsync(
            'SELECT id FROM products WHERE barcode = ? AND is_active = 1',
            [barcode]
          );
          if (existing) {
            Alert.alert('Error', 'Barcode sudah digunakan produk lain');
            setLoading(false);
            return;
          }
        }

        const id = generateId();
        await db.runAsync(
          `INSERT INTO products (id, name, barcode, category_id, buy_price, sell_price, stock, min_stock, unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name.trim(), barcode || null, categoryId || null, parseFloat(buyPrice) || 0, parseFloat(sellPrice), parseInt(stock) || 0, parseInt(minStock) || 5, unit]
        );
        Alert.alert('Berhasil', 'Produk berhasil ditambahkan');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeScan(data: string) {
    setBarcode(data);
    setShowScanner(false);
  }

  const units = ['pcs', 'kg', 'liter', 'pack', 'dus', 'botol', 'sachet', 'bungkus'];

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        {/* Barcode Section */}
        <View style={styles.barcodeSection}>
          <Input
            label="Barcode"
            placeholder="Scan atau ketik barcode"
            value={barcode}
            onChangeText={setBarcode}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            leftIcon={<Ionicons name="barcode-outline" size={20} color={COLORS.textSecondary} />}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="scan-outline" size={22} color={COLORS.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        <Input
          label="Nama Produk"
          placeholder="Masukkan nama produk"
          value={name}
          onChangeText={setName}
        />

        {/* Category - Material Chips */}
        <Text style={styles.label}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoryId === cat.id && styles.chipActive]}
              onPress={() => setCategoryId(cat.id === categoryId ? '' : cat.id)}
            >
              {categoryId === cat.id && (
                <Ionicons name="checkmark" size={16} color={COLORS.onPrimaryContainer} />
              )}
              <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <Input
            label="Harga Beli"
            placeholder="0"
            value={buyPrice}
            onChangeText={setBuyPrice}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Harga Jual"
            placeholder="0"
            value={sellPrice}
            onChangeText={setSellPrice}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>

        <View style={styles.row}>
          <Input
            label="Stok Awal"
            placeholder="0"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Stok Minimum"
            placeholder="5"
            value={minStock}
            onChangeText={setMinStock}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>

        {/* Unit - Material Chips */}
        <Text style={styles.label}>Satuan</Text>
        <View style={styles.chipWrap}>
          {units.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.chip, unit === u && styles.chipActive]}
              onPress={() => setUnit(u)}
            >
              {unit === u && (
                <Ionicons name="checkmark" size={16} color={COLORS.onPrimaryContainer} />
              )}
              <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
          onPress={handleSave}
          loading={loading}
          size="large"
          style={styles.saveButton}
        />
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
  barcodeSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  scanButton: {
    backgroundColor: COLORS.primaryContainer,
    padding: SPACING.md - 2,
    borderRadius: BORDER_RADIUS.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.4,
  },
  chipScroll: {
    marginBottom: SPACING.md,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  chipActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primaryContainer,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  chipTextActive: {
    color: COLORS.onPrimaryContainer,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
});
