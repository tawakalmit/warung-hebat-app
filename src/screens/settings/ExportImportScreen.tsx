import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import Button from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ExportImportScreen() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const db = await getDatabase();

      const users = await db.getAllAsync('SELECT * FROM users');
      const categories = await db.getAllAsync('SELECT * FROM categories');
      const suppliers = await db.getAllAsync('SELECT * FROM suppliers');
      const products = await db.getAllAsync('SELECT * FROM products');
      const stockIn = await db.getAllAsync('SELECT * FROM stock_in');
      const transactions = await db.getAllAsync('SELECT * FROM transactions');
      const transactionItems = await db.getAllAsync('SELECT * FROM transaction_items');
      const storeSettings = await db.getAllAsync('SELECT * FROM store_settings');

      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        data: { users, categories, suppliers, products, stock_in: stockIn, transactions, transaction_items: transactionItems, store_settings: storeSettings },
      };

      const fileName = `warung_hebat_backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(exportData, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Export Data Warung Hebat' });
      } else {
        Alert.alert('Berhasil', `Data berhasil diekspor ke ${fileName}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;

      Alert.alert('Konfirmasi Import', 'Import data akan menimpa data yang sudah ada. Lanjutkan?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Lanjutkan', style: 'destructive', onPress: () => processImport(result.assets[0].uri) },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Gagal memilih file');
    }
  }

  async function processImport(fileUri: string) {
    setImporting(true);
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      const importData = JSON.parse(content);

      if (!importData.version || !importData.data) {
        Alert.alert('Error', 'Format file tidak valid');
        return;
      }

      const db = await getDatabase();
      const { data } = importData;

      await db.execAsync('DELETE FROM transaction_items');
      await db.execAsync('DELETE FROM transactions');
      await db.execAsync('DELETE FROM stock_in');
      await db.execAsync('DELETE FROM price_history');
      await db.execAsync('DELETE FROM products');
      await db.execAsync('DELETE FROM suppliers');
      await db.execAsync('DELETE FROM categories');
      await db.execAsync('DELETE FROM users');
      await db.execAsync('DELETE FROM store_settings');

      for (const cat of (data.categories || [])) {
        await db.runAsync('INSERT INTO categories (id, name, description, created_at) VALUES (?, ?, ?, ?)', [cat.id, cat.name, cat.description, cat.created_at]);
      }
      for (const sup of (data.suppliers || [])) {
        await db.runAsync('INSERT INTO suppliers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)', [sup.id, sup.name, sup.phone, sup.address, sup.created_at]);
      }
      for (const u of (data.users || [])) {
        await db.runAsync('INSERT INTO users (id, username, password, name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.username, u.password, u.name, u.role, u.is_active, u.created_at]);
      }
      for (const prod of (data.products || [])) {
        await db.runAsync('INSERT INTO products (id, barcode, name, category_id, buy_price, sell_price, stock, min_stock, unit, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [prod.id, prod.barcode, prod.name, prod.category_id, prod.buy_price, prod.sell_price, prod.stock, prod.min_stock, prod.unit, prod.is_active, prod.created_at]);
      }
      for (const si of (data.stock_in || [])) {
        await db.runAsync('INSERT INTO stock_in (id, product_id, supplier_id, quantity, buy_price, total, note, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [si.id, si.product_id, si.supplier_id, si.quantity, si.buy_price, si.total, si.note, si.user_id, si.created_at]);
      }
      for (const tx of (data.transactions || [])) {
        await db.runAsync('INSERT INTO transactions (id, invoice_number, total_amount, discount, tax, grand_total, payment_amount, change_amount, payment_method, customer_name, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tx.id, tx.invoice_number, tx.total_amount, tx.discount, tx.tax, tx.grand_total, tx.payment_amount, tx.change_amount, tx.payment_method, tx.customer_name, tx.user_id, tx.created_at]);
      }
      for (const item of (data.transaction_items || [])) {
        await db.runAsync('INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [item.id, item.transaction_id, item.product_id, item.product_name, item.quantity, item.price, item.discount, item.subtotal]);
      }
      for (const setting of (data.store_settings || [])) {
        await db.runAsync('INSERT INTO store_settings (id, store_name, address, phone, footer_note, tax_percentage) VALUES (?, ?, ?, ?, ?, ?)', [setting.id, setting.store_name, setting.address, setting.phone, setting.footer_note, setting.tax_percentage]);
      }

      Alert.alert('Berhasil', 'Data berhasil diimport. Silakan login ulang.');
    } catch (error) {
      Alert.alert('Error', 'Gagal mengimport data. Pastikan format file benar.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Export */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8F0FE' }]}>
              <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Export Data</Text>
              <Text style={styles.cardDesc}>
                Backup semua data ke file JSON untuk disimpan atau dipindahkan ke perangkat lain
              </Text>
            </View>
          </View>
          <Button
            title="Export Data"
            onPress={handleExport}
            loading={exporting}
            icon={<Ionicons name="download-outline" size={18} color={COLORS.textWhite} />}
          />
        </View>

        {/* Import */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF7E0' }]}>
              <Ionicons name="cloud-download-outline" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Import Data</Text>
              <Text style={styles.cardDesc}>
                Restore data dari file backup. Data saat ini akan ditimpa.
              </Text>
            </View>
          </View>
          <Button
            title="Import Data"
            onPress={handleImport}
            loading={importing}
            variant="tonal"
            icon={<Ionicons name="arrow-up-outline" size={18} color={COLORS.onPrimaryContainer} />}
          />
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Disarankan untuk rutin backup data agar tidak kehilangan data penting. File backup berformat JSON.
          </Text>
        </View>
      </View>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.lg,
    ...ELEVATION.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.15,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
    letterSpacing: 0.25,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.onPrimaryContainer,
    lineHeight: 18,
    letterSpacing: 0.25,
  },
});
