import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { reportsApi } from '../../services/api';
import Card from '../../components/Card';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';
import { formatCurrency, getMonthName } from '../../utils/helpers';

type ReportPeriod = 'daily' | 'monthly' | 'yearly';

interface DailyReport { date: string; total: number; count: number; }
interface MonthlyReport { month: string; total: number; count: number; }

export default function ReportsScreen({ navigation }: any) {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [dailyData, setDailyData] = useState<DailyReport[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [yearlyData, setYearlyData] = useState<MonthlyReport[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalTransactions: 0, avgTransaction: 0 });

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [period])
  );

  async function loadReports() {
    try {
      const [resDaily, resMonthly, resYearly] = await Promise.all([
        reportsApi.getDaily(),
        reportsApi.getMonthly(),
        reportsApi.getYearly(),
      ]);

      const daily = (resDaily.success && resDaily.data) || [];
      const monthly = (resMonthly.success && resMonthly.data) || [];
      const yearly = (resYearly.success && resYearly.data) || [];

      setDailyData(daily);
      setMonthlyData(monthly);
      setYearlyData(yearly);

      let currentList: (DailyReport | MonthlyReport)[] = daily;
      if (period === 'monthly') currentList = monthly;
      if (period === 'yearly') currentList = yearly;

      const totalRevenue = currentList.reduce((acc, curr) => acc + curr.total, 0);
      const totalTransactions = currentList.reduce((acc, curr) => acc + curr.count, 0);
      const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      setSummary({
        totalRevenue,
        totalTransactions,
        avgTransaction,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }

  function getCurrentData() {
    switch (period) {
      case 'daily': return dailyData;
      case 'monthly': return monthlyData;
      case 'yearly': return yearlyData;
    }
  }

  function formatPeriodLabel(item: DailyReport | MonthlyReport): string {
    if (period === 'daily') {
      const d = item as DailyReport;
      return new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (period === 'monthly') {
      const m = item as MonthlyReport;
      const [year, month] = m.month.split('-');
      return `${getMonthName(parseInt(month))} ${year}`;
    }
    return (item as MonthlyReport).month;
  }

  const data = getCurrentData();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#E8F0FE' }]}>
            <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.summaryValue}>{formatCurrency(summary.totalRevenue)}</Text>
          <Text style={styles.summaryLabel}>Total Pendapatan</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#E6F4EA' }]}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.success} />
          </View>
          <Text style={styles.summaryValue}>{summary.totalTransactions}</Text>
          <Text style={styles.summaryLabel}>Transaksi</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEF7E0' }]}>
            <Ionicons name="analytics-outline" size={18} color={COLORS.warning} />
          </View>
          <Text style={styles.summaryValue}>{formatCurrency(summary.avgTransaction)}</Text>
          <Text style={styles.summaryLabel}>Rata-rata</Text>
        </View>
      </View>

      {/* Period Tabs - Material Segmented Button */}
      <View style={styles.segmentedButton}>
        {(['daily', 'monthly', 'yearly'] as ReportPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.segment, period === p && styles.segmentActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
              {p === 'daily' ? 'Harian' : p === 'monthly' ? 'Bulanan' : 'Tahunan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Report Data */}
      <View style={styles.reportList}>
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={40} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Belum ada data transaksi</Text>
          </View>
        ) : (
          data.map((item, index) => (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportLeft}>
                <Text style={styles.reportDate}>{formatPeriodLabel(item)}</Text>
                <Text style={styles.reportCount}>{item.count} transaksi</Text>
              </View>
              <Text style={styles.reportTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Transaction History Button */}
      <TouchableOpacity
        style={styles.historyBtn}
        onPress={() => navigation.navigate('TransactionHistory')}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
        <Text style={styles.exportText}>Riwayat Transaksi</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* Export Button */}
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() => navigation.navigate('ExportImport')}
        activeOpacity={0.7}
      >
        <Ionicons name="download-outline" size={20} color={COLORS.primary} />
        <Text style={styles.exportText}>Export / Import Data</Text>
      </TouchableOpacity>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...ELEVATION.level1,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  segmentedButton: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  segmentTextActive: {
    color: COLORS.onPrimaryContainer,
  },
  reportList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...ELEVATION.level1,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  reportLeft: {},
  reportDate: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  reportCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  reportTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outline,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.outline,
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    letterSpacing: 0.1,
  },
});
