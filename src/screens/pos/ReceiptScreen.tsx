import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../../database/database';
import { Transaction, TransactionItem, StoreSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { BluetoothPrinterService } from '../../services/BluetoothPrinterService';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ReceiptScreen({ navigation, route }: any) {
  const { transactionId } = route.params;
  const { currentTheme } = useTheme();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    loadReceipt();
  }, []);

  async function loadReceipt() {
    const db = await getDatabase();
    const tx = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [transactionId]);
    const txItems = await db.getAllAsync<TransactionItem>('SELECT * FROM transaction_items WHERE transaction_id = ?', [transactionId]);
    const settings = await db.getFirstAsync<StoreSettings>('SELECT * FROM store_settings WHERE id = ?', ['default']);
    setTransaction(tx);
    setItems(txItems);
    setStoreSettings(settings);
  }

  async function handlePrint() {
    if (!transaction || !storeSettings) return;
    try {
      await BluetoothPrinterService.printDirect(
        transaction,
        items,
        storeSettings,
        { logoUri: storeSettings.logo_uri }
      );
    } catch (error) {
      Alert.alert('Error', 'Gagal mencetak struk. Pastikan printer sudah terhubung.');
    }
  }

  async function handleShare() {
    if (!transaction || !storeSettings) return;
    try {
      const pdfUri = await BluetoothPrinterService.printToPDF(
        transaction,
        items,
        storeSettings,
        { logoUri: storeSettings.logo_uri }
      );
      await Sharing.shareAsync(pdfUri);
    } catch (error) {
      Alert.alert('Error', 'Gagal membuat PDF struk');
    }
  }

  if (!transaction) return null;

  const themeColor = currentTheme.primary;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Success */}
        <View style={styles.successSection}>
          <View style={[styles.successIcon, { backgroundColor: COLORS.success }]}>
            <Ionicons name="checkmark" size={32} color={COLORS.textWhite} />
          </View>
          <Text style={styles.successText}>Transaksi Berhasil</Text>
          <Text style={styles.invoiceText}>{transaction.invoice_number}</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          {/* Logo & Store Name */}
          <View style={styles.receiptHeader}>
            {storeSettings?.logo_uri && (
              <Image source={{ uri: storeSettings.logo_uri }} style={styles.receiptLogo} />
            )}
            <View style={styles.receiptHeaderText}>
              <Text style={styles.storeName}>{storeSettings?.store_name}</Text>
              {storeSettings?.address && (
                <Text style={styles.storeInfo}>{storeSettings.address}</Text>
              )}
              {storeSettings?.phone && (
                <Text style={styles.storeInfo}>Telp: {storeSettings.phone}</Text>
              )}
            </View>
          </View>

          <Text style={styles.date}>{formatDate(transaction.created_at)}</Text>

          <View style={styles.divider} />

          {items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.product_name}
                  {item.product_id === 'manual' && (
                    <Text style={styles.manualTag}> (manual)</Text>
                  )}
                </Text>
                <Text style={styles.itemDetail}>{item.quantity} × {formatCurrency(item.price)}</Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(transaction.total_amount)}</Text>
          </View>
          {transaction.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Diskon</Text>
              <Text style={[styles.totalValue, { color: COLORS.danger }]}>-{formatCurrency(transaction.discount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: SPACING.sm }]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: themeColor }]}>{formatCurrency(transaction.grand_total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Bayar</Text>
            <Text style={styles.totalValue}>{formatCurrency(transaction.payment_amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Kembali</Text>
            <Text style={[styles.totalValue, { color: COLORS.success }]}>{formatCurrency(transaction.change_amount)}</Text>
          </View>

          {storeSettings?.footer_note && (
            <>
              <View style={styles.divider} />
              <Text style={styles.footerNote}>{storeSettings.footer_note}</Text>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Cetak Struk"
            onPress={handlePrint}
            variant="tonal"
            icon={<Ionicons name="print-outline" size={18} color={currentTheme.onPrimaryContainer} />}
            style={styles.actionBtn}
          />
          <Button
            title="Bagikan PDF"
            onPress={handleShare}
            variant="outlined"
            icon={<Ionicons name="share-outline" size={18} color={themeColor} />}
            style={styles.actionBtn}
          />
          <Button
            title="Transaksi Baru"
            onPress={() => navigation.navigate('POSMain')}
            icon={<Ionicons name="add" size={18} color={COLORS.textWhite} />}
            style={{ ...styles.actionBtn, backgroundColor: themeColor }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    alignItems: 'center',
  },
  successSection: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: 20,
    fontWeight: '400',
    color: COLORS.onSurface,
    letterSpacing: -0.2,
  },
  invoiceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.4,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    ...ELEVATION.level2,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  receiptLogo: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  receiptHeaderText: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  storeInfo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  manualTag: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '400',
  },
  itemDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  actions: {
    width: '100%',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  actionBtn: {
    width: '100%',
  },
});
