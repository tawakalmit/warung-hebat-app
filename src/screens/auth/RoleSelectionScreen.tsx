import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';
import { authApi } from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function RoleSelectionScreen({ navigation }: Props) {
  const [hasOwner, setHasOwner] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Periksa apakah sudah ada akun Owner
  const checkOwnerStatus = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // 1. Cek dari AsyncStorage terlebih dahulu (offline / fallback cepat)
      const cached = await AsyncStorage.getItem('has_owner_registered');
      let currentHasOwner = cached === 'true';

      // 2. Cek ke backend REST API
      const res = await authApi.checkOwner();
      const serverHasOwner = res?.data?.hasOwner ?? (res as any)?.hasOwner;

      if (res.success && typeof serverHasOwner === 'boolean') {
        currentHasOwner = serverHasOwner;
        await AsyncStorage.setItem('has_owner_registered', serverHasOwner ? 'true' : 'false');
      }

      setHasOwner(currentHasOwner);
    } catch (error) {
      console.log('Error checking owner status:', error);
      // Fallback ke AsyncStorage jika ada
      const cached = await AsyncStorage.getItem('has_owner_registered');
      setHasOwner(cached === 'true');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Periksa setiap kali layar mendapatkan fokus
  useFocusEffect(
    useCallback(() => {
      checkOwnerStatus();
    }, [checkOwnerStatus])
  );

  function handleSelectOwner() {
    if (!hasOwner) {
      // Jika belum ada owner sama sekali, tawarkan langsung daftar akun owner
      Alert.alert(
        'Akun Owner Belum Terdaftar',
        'Belum ada akun Owner pada sistem ini. Anda akan diarahkan ke halaman pembuatan akun Owner pertama.',
        [
          {
            text: 'Masuk Akun Lain',
            onPress: () => navigation.navigate('Login', { role: 'owner' }),
            style: 'cancel',
          },
          {
            text: 'Daftar Owner Baru',
            onPress: () => navigation.navigate('Register', { role: 'owner' }),
          },
        ]
      );
    } else {
      navigation.navigate('Login', { role: 'owner' });
    }
  }

  function handleSelectKasir() {
    if (!hasOwner) {
      Alert.alert(
        'Akses Kasir Terkunci',
        'Belum ada akun Owner yang terdaftar di sistem. Pendaftaran akun Owner wajib dilakukan terlebih dahulu sebelum staf Kasir dapat masuk.',
        [{ text: 'Mengerti', style: 'default' }]
      );
      return;
    }

    navigation.navigate('Login', { role: 'kasir' });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => checkOwnerStatus(true)}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Warung Hebat</Text>
          <View style={styles.pillBadge}>
            <Ionicons name="apps-outline" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.pillBadgeText}>Pilih Akses Pengguna</Text>
          </View>
          <Text style={styles.subtitle}>
            Silakan pilih peran Anda untuk melanjutkan ke sistem warung
          </Text>
        </View>

        {/* Status Indicator Banner */}
        {loading && hasOwner === null ? (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingBannerText}>Memeriksa status akun toko...</Text>
          </View>
        ) : !hasOwner ? (
          <View style={styles.warningBanner}>
            <Ionicons name="information-circle" size={20} color="#D97706" style={{ marginTop: 2 }} />
            <View style={styles.bannerContent}>
              <Text style={styles.warningBannerTitle}>Owner Belum Terdaftar</Text>
              <Text style={styles.warningBannerText}>
                Sistem belum memiliki akun Owner. Silakan pilih tombol Owner untuk mendaftarkan akun Owner pertama. Pilihan login Kasir saat ini dinonaktifkan.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.successBannerText}>Akun Owner terdaftar. Pilih peran untuk masuk.</Text>
          </View>
        )}

        {/* Role Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Card 1: Owner */}
          <TouchableOpacity
            style={[styles.roleCard, styles.ownerCard]}
            onPress={handleSelectOwner}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconContainer, styles.ownerIconContainer]}>
                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
              </View>
              <View style={styles.cardTitleBlock}>
                <View style={styles.titleWithBadge}>
                  <Text style={styles.cardTitle}>Owner</Text>
                  <View style={[styles.statusTag, !hasOwner ? styles.tagWarning : styles.tagSuccess]}>
                    <Text style={[styles.statusTagText, !hasOwner ? styles.tagTextWarning : styles.tagTextSuccess]}>
                      {!hasOwner ? 'Registrasi Pertama' : 'Tersedia'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardRoleLabel}>Pemilik Toko / Manajemen</Text>
              </View>
            </View>

            <Text style={styles.cardDescription}>
              Akses penuh untuk mengelola master produk, stok barang, melihat laporan keuangan & laba rugi, serta mengatur staf kasir.
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.actionRow}>
                <Text style={styles.ownerActionText}>
                  {!hasOwner ? 'Daftar Akun Owner Baru' : 'Masuk sebagai Owner'}
                </Text>
                <Ionicons name="arrow-forward-circle" size={22} color={COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Kasir */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              styles.kasirCard,
              !hasOwner && styles.roleCardDisabled,
            ]}
            onPress={handleSelectKasir}
            activeOpacity={hasOwner ? 0.85 : 1}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.iconContainer,
                  hasOwner ? styles.kasirIconContainer : styles.disabledIconContainer,
                ]}
              >
                <Ionicons
                  name={hasOwner ? 'calculator' : 'lock-closed'}
                  size={28}
                  color={hasOwner ? '#FFFFFF' : '#8E8E93'}
                />
              </View>
              <View style={styles.cardTitleBlock}>
                <View style={styles.titleWithBadge}>
                  <Text style={[styles.cardTitle, !hasOwner && styles.textDisabled]}>Kasir</Text>
                  <View
                    style={[
                      styles.statusTag,
                      hasOwner ? styles.tagSuccess : styles.tagDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        hasOwner ? styles.tagTextSuccess : styles.tagTextDisabled,
                      ]}
                    >
                      {hasOwner ? 'Tersedia' : 'Dinonaktifkan'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardRoleLabel, !hasOwner && styles.textDisabled]}>
                  Staff Kasir / Operator POS
                </Text>
              </View>
            </View>

            <Text style={[styles.cardDescription, !hasOwner && styles.textDisabled]}>
              Akses khusus untuk melayani transaksi kasir harian, penghitungan keranjang belanja, penerimaan pembayaran, dan cetak struk nota.
            </Text>

            <View style={styles.cardFooter}>
              {hasOwner ? (
                <View style={styles.actionRow}>
                  <Text style={styles.kasirActionText}>Masuk sebagai Kasir</Text>
                  <Ionicons name="arrow-forward-circle" size={22} color={COLORS.secondary} />
                </View>
              ) : (
                <View style={styles.disabledReasonRow}>
                  <Ionicons name="alert-circle-outline" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
                  <Text style={styles.disabledReasonText}>
                    Terkunci: Daftarkan akun Owner terlebih dahulu
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => checkOwnerStatus(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="sync-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.refreshBtnText}>Muat Ulang Status</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>
            Warung Hebat POS • Hak Akses Berbasis Peran
          </Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: SPACING.xs,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.onPrimaryContainer,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.md,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  loadingBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  bannerContent: {
    flex: 1,
  },
  warningBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  successBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  cardsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...ELEVATION.level1,
  },
  ownerCard: {
    borderColor: COLORS.primaryLight,
  },
  kasirCard: {
    borderColor: COLORS.secondaryLight,
  },
  roleCardDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.75,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  ownerIconContainer: {
    backgroundColor: COLORS.primary,
  },
  kasirIconContainer: {
    backgroundColor: COLORS.secondary,
  },
  disabledIconContainer: {
    backgroundColor: '#D1D5DB',
  },
  cardTitleBlock: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardRoleLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagWarning: {
    backgroundColor: '#FEF3C7',
  },
  tagTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  tagSuccess: {
    backgroundColor: '#E8F5E9',
  },
  tagTextSuccess: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  tagDisabled: {
    backgroundColor: '#E5E7EB',
  },
  tagTextDisabled: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginVertical: SPACING.sm,
  },
  cardFooter: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ownerActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  kasirActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  disabledReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabledReasonText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    flex: 1,
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  footer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainer,
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});