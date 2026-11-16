import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { generateId, generateInvoiceNumber, formatCurrency } from '../../utils/helpers';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function CheckoutScreen({ navigation }: any) {
  const { items, manualItems, updateQuantity, removeItem, removeManualItem, getTotal, clearCart } = useCart();
  const { user, canCreateTransactions } = useAuth();
  const { currentTheme } = useTheme();
  const [discount, setDiscount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual item form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const { addManualItem } = useCart();

  const subtotal = getTotal();
  const discountAmount = parseFloat(discount) || 0;
  const grandTotal = subtotal - discountAmount;
  const payment = parseFloat(paymentAmount) || 0;
  const change = payment - grandTotal;

  function handleAddManualItem() {
    const name = manualName.trim();
    const price = parseFloat(manualPrice) || 0;
    const qty = parseInt(manualQty) || 1;

    if (!name) {
      Alert.alert('Error', 'Nama barang harus diisi');
      return;
    }
    if (price <= 0) {
      Alert.alert('Error', 'Harga harus lebih dari 0');
      return;
    }

    addManualItem(name, price, qty);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
    setShowManualForm(false);
  }

  async function handleCheckout() {
    if (!canCreateTransactions()) {
      Alert.alert('Akses Dibatasi', 'Akun Anda tidak aktif atau tidak memiliki izin memproses transaksi.');
      return;
    }

    if (payment < grandTotal) {
      Alert.alert('Error', 'Pembayaran kurang');
      return;
    }

    if (items.length === 0 && manualItems.length === 0) {
      Alert.alert('Error', 'Keranjang kosong');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const transactionId = generateId();
      const invoiceNumber = generateInvoiceNumber();

      await db.runAsync(
        `INSERT INTO transactions (id, invoice_number, total_amount, discount, tax, grand_total, payment_amount, change_amount, payment_method, customer_name, user_id)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'cash', ?, ?)`,
        [transactionId, invoiceNumber, subtotal, discountAmount, grandTotal, payment, change, customerName || null, user!.id]
      );

      // Insert product items
      for (const item of items) {
        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, price, discount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), transactionId, item.product.id, item.product.name, item.quantity, item.product.sell_price, item.discount, item.subtotal]
        );

        await db.runAsync(
          'UPDATE products SET stock = stock - ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?',
          [item.quantity, item.product.id]
        );
      }

      // Insert manual items (product_id NULL karena bukan produk terdaftar)
      for (const item of manualItems) {
        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name, quantity, price, discount, subtotal)
           VALUES (?, ?, NULL, ?, ?, ?, 0, ?)`,
          [generateId(), transactionId, item.name, item.quantity, item.price, item.subtotal]
        );
      }

      clearCart();
      navigation.replace('Receipt', { transactionId, invoiceNumber, grandTotal, payment, change });
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Gagal memproses transaksi');
    } finally {
      setLoading(false);
    }
  }

  function quickPay(amount: number) {
    setPaymentAmount(amount.toString());
  }

  const themeColor = currentTheme.primary;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <Text style={styles.sectionTitle}>Keranjang</Text>
        {items.map(item => (
          <View key={item.product.id} style={styles.cartItem}>
            <View style={styles.cartItemLeft}>
              <Text style={styles.cartItemName} numberOfLines={1}>{item.product.name}</Text>
              <Text style={styles.cartItemPrice}>
                {formatCurrency(item.product.sell_price)} × {item.quantity}
              </Text>
            </View>
            <View style={styles.cartItemRight}>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Ionicons name="remove" size={16} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => {
                    if (item.quantity < item.product.stock) {
                      updateQuantity(item.product.id, item.quantity + 1);
                    }
                  }}
                >
                  <Ionicons name="add" size={16} color={COLORS.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.cartItemSubtotal, { color: themeColor }]}>{formatCurrency(item.subtotal)}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.product.id)}>
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Manual Items */}
        {manualItems.map(item => (
          <View key={item.id} style={[styles.cartItem, styles.manualItem]}>
            <View style={styles.cartItemLeft}>
              <View style={styles.manualBadgeRow}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>Manual</Text>
                </View>
              </View>
              <Text style={styles.cartItemPrice}>
                {formatCurrency(item.price)} × {item.quantity}
              </Text>
            </View>
            <View style={styles.cartItemRight}>
              <Text style={[styles.cartItemSubtotal, { color: themeColor }]}>{formatCurrency(item.subtotal)}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeManualItem(item.id)}>
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Manual Item Button */}
        <TouchableOpacity
          style={[styles.addManualBtn, { borderColor: themeColor }]}
          onPress={() => setShowManualForm(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={themeColor} />
          <Text style={[styles.addManualText, { color: themeColor }]}>Tambah Barang Manual</Text>
        </TouchableOpacity>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diskon</Text>
            <View style={styles.discountInputWrap}>
              <Text style={styles.discountPrefix}>Rp</Text>
              <Input
                placeholder="0"
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                containerStyle={styles.discountInput}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: themeColor }]}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Payment */}
        <Text style={styles.sectionTitle}>Pembayaran</Text>
        <Input
          label="Nama Pelanggan (opsional)"
          placeholder="Nama pelanggan"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <Input
          label="Jumlah Bayar"
          placeholder="Masukkan jumlah bayar"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          keyboardType="numeric"
          leftIcon={<Text style={styles.currencyPrefix}>Rp</Text>}
        />

        {/* Quick Pay - Material Chips */}
        <View style={styles.quickPayRow}>
          <TouchableOpacity style={[styles.quickPayChip, { borderColor: themeColor }]} onPress={() => quickPay(grandTotal)}>
            <Text style={[styles.quickPayText, { color: themeColor }]}>Uang Pas</Text>
          </TouchableOpacity>
          {[50000, 100000, 200000].map(amount => (
            <TouchableOpacity key={amount} style={styles.quickPayChip} onPress={() => quickPay(amount)}>
              <Text style={styles.quickPayText}>{(amount / 1000)}rb</Text>
            </TouchableOpacity>
          ))}
        </View>

        {payment >= grandTotal && payment > 0 && (
          <View style={styles.changeCard}>
            <Ionicons name="cash-outline" size={20} color={COLORS.success} />
            <View>
              <Text style={styles.changeLabel}>Kembalian</Text>
              <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <Button
          title={`Bayar ${formatCurrency(grandTotal)}`}
          onPress={handleCheckout}
          loading={loading}
          disabled={(items.length === 0 && manualItems.length === 0) || payment < grandTotal}
          size="large"
          style={{ ...styles.checkoutBtn, backgroundColor: themeColor }}
        />
      </View>

      {/* Manual Item Modal */}
      <Modal visible={showManualForm} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Barang Manual</Text>
              <TouchableOpacity onPress={() => setShowManualForm(false)}>
                <Ionicons name="close" size={24} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Untuk barang yang belum terinput di sistem
            </Text>
            <Input
              label="Nama Barang"
              placeholder="Contoh: Plastik kresek"
              value={manualName}
              onChangeText={setManualName}
            />
            <Input
              label="Harga Satuan"
              placeholder="0"
              value={manualPrice}
              onChangeText={setManualPrice}
              keyboardType="numeric"
              leftIcon={<Text style={styles.currencyPrefix}>Rp</Text>}
            />
            <Input
              label="Jumlah"
              placeholder="1"
              value={manualQty}
              onChangeText={setManualQty}
              keyboardType="numeric"
            />
            {manualName && parseFloat(manualPrice) > 0 && (
              <View style={styles.manualPreview}>
                <Text style={styles.manualPreviewLabel}>Subtotal:</Text>
                <Text style={[styles.manualPreviewValue, { color: themeColor }]}>
                  {formatCurrency((parseFloat(manualPrice) || 0) * (parseInt(manualQty) || 1))}
                </Text>
              </View>
            )}
            <Button
              title="Tambahkan"
              onPress={handleAddManualItem}
              style={{ marginTop: SPACING.sm }}
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
  scrollContent: {
    flex: 1,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    letterSpacing: 0.1,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...ELEVATION.level1,
  },
  manualItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#FBBC04',
  },
  manualBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  manualBadge: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#856404',
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  cartItemPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cartItemRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  removeBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  addManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.outline,
    marginBottom: SPACING.md,
  },
  addManualText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
    ...ELEVATION.level1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.25,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountPrefix: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  discountInput: {
    width: 100,
    marginBottom: 0,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.sm,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.primary,
  },
  currencyPrefix: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickPayRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  quickPayChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },
  quickPayText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  changeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  changeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.success,
  },
  bottomBar: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  checkoutBtn: {
    width: '100%',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  modalHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    letterSpacing: 0.4,
  },
  manualPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  manualPreviewLabel: {
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
  manualPreviewValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
