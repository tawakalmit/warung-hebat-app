import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { transactionsApi } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Transaction, TransactionItem } from '../../types';
import { formatCurrency, formatDate, formatDateShort } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

type FilterPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface TransactionWithUser extends Transaction {
  user_name?: string;
}

export default function TransactionHistoryScreen() {
  const { currentTheme } = useTheme();
  const [transactions, setTransactions] = useState<TransactionWithUser[]>([]);
  const [period, setPeriod] = useState<FilterPeriod>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ count: 0, total: 0 });

  // Detail modal
  const [selectedTx, setSelectedTx] = useState<TransactionWithUser | null>(null);
  const [selectedItems, setSelectedItems] = useState<TransactionItem[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [period])
  );

  function getDateFilter(): string {
    const now = new Date();
    switch (period) {
      case 'daily':
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly': {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      }
      case 'monthly':
        return `${now.toISOString().slice(0, 7)}-01`; // YYYY-MM-01
      case 'yearly':
        return `${now.getFullYear()}-01-01`;
    }
  }

  async function loadTransactions() {
    try {
      const dateFilter = getDateFilter();
      const res = await transactionsApi.getAll({
        start_date: dateFilter,
        limit: 100,
      });

      if (res.success && res.data) {
        const mapped = res.data.map((tx: any) => ({
          ...tx,
          user_name: tx.cashier_name || tx.user_name || 'Kasir',
        }));
        setTransactions(mapped);

        // Calculate summary
        const total = mapped.reduce((sum: number, tx: any) => sum + (tx.grand_total || 0), 0);
        setSummary({ count: mapped.length, total });
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  async function handleViewDetail(tx: TransactionWithUser) {
    try {
      const res = await transactionsApi.getById(tx.id);
      if (res.success && res.data) {
        setSelectedTx(tx);
        setSelectedItems(res.data.items || []);
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Error loading transaction detail:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }

  function getPeriodLabel(): string {
    switch (period) {
      case 'daily': return 'Hari Ini';
      case 'weekly': return '7 Hari Terakhir';
      case 'monthly': return 'Bulan Ini';
      case 'yearly': return 'Tahun Ini';
    }
  }

  function renderTransaction({ item }: { item: TransactionWithUser }) {
    return (
      <TouchableOpacity
        style={styles.txCard}
        onPress={() => handleViewDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.txHeader}>
          <View style={styles.txInvoice}>
            <Text style={styles.txInvoiceText}>{item.invoice_number}</Text>
            {item.customer_name && (
              <Text style={styles.txCustomer}>{item.customer_name}</Text>
            )}
          </View>
          <Text style={[styles.txAmount, { color: currentTheme.primary }]}>
            {formatCurrency(item.grand_total)}
          </Text>
        </View>
        <View style={styles.txFooter}>
          <View style={styles.txMeta}>
            <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
            <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.txMeta}>
            <Ionicons name="person-outline" size={12} color={COLORS.textTertiary} />
            <Text style={styles.txDate}>{item.user_name || '-'}</Text>
          </View>
          {item.payment_method && (
            <View style={styles.txMethodBadge}>
              <Text style={styles.txMethodText}>{item.payment_method}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Period Filter Tabs */}
      <View style={styles.filterRow}>
        {(['daily', 'weekly', 'monthly', 'yearly'] as FilterPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[
              styles.filterChip,
              period === p && { backgroundColor: currentTheme.primaryContainer, borderColor: currentTheme.primary },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.filterText,
              period === p && { color: currentTheme.onPrimaryContainer, fontWeight: '600' },
            ]}>
              {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>{getPeriodLabel()}</Text>
          <Text style={[styles.summaryValue, { color: currentTheme.primary }]}>
            {formatCurrency(summary.total)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Transaksi</Text>
          <Text style={styles.summaryCount}>{summary.count}</Text>
        </View>
      </View>

      {/* Transaction List */}
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[currentTheme.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Belum ada transaksi</Text>
            <Text style={styles.emptySubtext}>Transaksi {getPeriodLabel().toLowerCase()} akan muncul di sini</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={showDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close" size={24} color={COLORS.onSurface} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Invoice Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailInvoice}>{selectedTx.invoice_number}</Text>
                  <Text style={styles.detailDate}>{formatDate(selectedTx.created_at)}</Text>
                  {selectedTx.customer_name && (
                    <Text style={styles.detailCustomer}>Pelanggan: {selectedTx.customer_name}</Text>
                  )}
                  <Text style={styles.detailCashier}>Kasir: {selectedTx.user_name || '-'}</Text>
                </View>

                {/* Items */}
                <View style={styles.detailDivider} />
                <Text style={styles.detailSectionTitle}>Item</Text>
                {selectedItems.map(item => (
                  <View key={item.id} style={styles.detailItem}>
                    <View style={styles.detailItemInfo}>
                      <Text style={styles.detailItemName}>
                        {item.product_name}
                        {!item.product_id && <Text style={styles.manualTag}> (manual)</Text>}
                      </Text>
                      <Text style={styles.detailItemQty}>
                        {item.quantity} × {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <Text style={styles.detailItemSubtotal}>{formatCurrency(item.subtotal)}</Text>
                  </View>
                ))}

                {/* Totals */}
                <View style={styles.detailDivider} />
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Subtotal</Text>
                  <Text style={styles.detailTotalValue}>{formatCurrency(selectedTx.total_amount)}</Text>
                </View>
                {selectedTx.discount > 0 && (
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Diskon</Text>
                    <Text style={[styles.detailTotalValue, { color: COLORS.danger }]}>
                      -{formatCurrency(selectedTx.discount)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailGrandLabel}>Total</Text>
                  <Text style={[styles.detailGrandValue, { color: currentTheme.primary }]}>
                    {formatCurrency(selectedTx.grand_total)}
                  </Text>
                </View>
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Bayar</Text>
                  <Text style={styles.detailTotalValue}>{formatCurrency(selectedTx.payment_amount)}</Text>
                </View>
                <View style={styles.detailTotalRow}>
                  <Text style={styles.detailTotalLabel}>Kembali</Text>
                  <Text style={[styles.detailTotalValue, { color: COLORS.success }]}>
                    {formatCurrency(selectedTx.change_amount)}
                  </Text>
                </View>

                <View style={{ height: SPACING.xl }} />
              </ScrollView>
            )}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...ELEVATION.level1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.md,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.primary,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  txCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...ELEVATION.level1,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  txInvoice: {
    flex: 1,
  },
  txInvoiceText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  txCustomer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
  },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
    letterSpacing: 0.4,
  },
  txMethodBadge: {
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txMethodText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Modal
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  detailSection: {
    marginBottom: SPACING.sm,
  },
  detailInvoice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  detailDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailCustomer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  detailCashier: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  manualTag: {
    fontSize: 10,
    color: COLORS.warning,
    fontWeight: '400',
  },
  detailItemQty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  detailItemSubtotal: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  detailTotalLabel: {
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
  },
  detailTotalValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  detailGrandLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  detailGrandValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});
