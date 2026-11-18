import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { reportsApi, settingsApi } from '../../services/api';
import { StoreSettings } from '../../types';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';
import { formatCurrency } from '../../utils/helpers';

export default function DashboardScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { currentTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('Warung Hebat');
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    lowStockCount: 0,
    monthSales: 0,
    monthTransactions: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadStoreInfo();
    }, [])
  );

  async function loadStoreInfo() {
    try {
      const res = await settingsApi.get();
      if (res.success && res.data) {
        setLogoUri(res.data.logo_uri || null);
        setStoreName(res.data.store_name);
      }
    } catch (error) {
      console.error('Error loading store info:', error);
    }
  }

  async function loadStats() {
    try {
      const res = await reportsApi.getDashboardStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    await loadStoreInfo();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[currentTheme.primary]} />}
    >
      {/* Top Bar with Logo */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.storeLogo} />
          ) : (
            <View style={[styles.storeLogoPlaceholder, { backgroundColor: currentTheme.primaryContainer }]}>
              <Ionicons name="storefront" size={20} color={currentTheme.primary} />
            </View>
          )}
          <View style={styles.greeting}>
            <Text style={styles.storeNameText} numberOfLines={1}>{storeName}</Text>
            <Text style={styles.greetingText}>Halo, {user?.name}</Text>
          </View>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: currentTheme.primaryContainer }]}>
          <Text style={[styles.roleText, { color: currentTheme.onPrimaryContainer }]}>
            {user?.role === 'owner' ? 'Owner' : 'Kasir'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Today Revenue Card */}
        <View style={styles.revenueCard}>
          <View style={styles.revenueHeader}>
            <Ionicons name="trending-up" size={20} color={currentTheme.primary} />
            <Text style={styles.revenueLabel}>Penjualan Hari Ini</Text>
          </View>
          <Text style={styles.revenueAmount}>{formatCurrency(stats.todaySales)}</Text>
          <Text style={styles.revenueSubtext}>{stats.todayTransactions} transaksi</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: currentTheme.primaryContainer }]}>
              <Ionicons name="cube-outline" size={20} color={currentTheme.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Produk</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: stats.lowStockCount > 0 ? '#FDECEA' : '#E8F0FE' }]}>
              <Ionicons name="alert-circle-outline" size={20} color={stats.lowStockCount > 0 ? COLORS.danger : COLORS.textSecondary} />
            </View>
            <Text style={[styles.statValue, stats.lowStockCount > 0 && { color: COLORS.danger }]}>
              {stats.lowStockCount}
            </Text>
            <Text style={styles.statLabel}>Stok Rendah</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#E6F4EA' }]}>
              <Ionicons name="wallet-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.monthSales)}</Text>
            <Text style={styles.statLabel}>Bulan Ini</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('POS')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: currentTheme.primaryContainer }]}>
              <Ionicons name="cart-outline" size={22} color={currentTheme.primary} />
            </View>
            <Text style={styles.actionText}>Kasir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('StockIn')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF7E0' }]}>
              <Ionicons name="arrow-down-circle-outline" size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.actionText}>Barang Masuk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Products')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E6F4EA' }]}>
              <Ionicons name="pricetags-outline" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.actionText}>Produk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Reports')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FD' }]}>
              <Ionicons name="stats-chart-outline" size={22} color={COLORS.tertiary} />
            </View>
            <Text style={styles.actionText}>Laporan</Text>
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
  },
  storeLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    flex: 1,
  },
  storeNameText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.25,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  content: {
    padding: SPACING.md,
  },
  revenueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...ELEVATION.level1,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  revenueLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 0.25,
  },
  revenueAmount: {
    fontSize: 28,
    fontWeight: '400',
    color: COLORS.onSurface,
    letterSpacing: -0.5,
  },
  revenueSubtext: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    letterSpacing: 0.4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...ELEVATION.level1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
    letterSpacing: 0.1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    ...ELEVATION.level1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
});
