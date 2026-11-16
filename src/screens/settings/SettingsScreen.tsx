import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getDatabase } from '../../database/database';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { StoreSettings } from '../../types';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function SettingsScreen({ navigation }: any) {
  const { user, logout, isOwner, canExportData, canAccessStoreSettings } = useAuth();
  const { currentTheme, setTheme, themes } = useTheme();
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const db = await getDatabase();
    const settings = await db.getFirstAsync<StoreSettings>('SELECT * FROM store_settings WHERE id = ?', ['default']);
    if (settings) {
      setStoreName(settings.store_name);
      setAddress(settings.address || '');
      setPhone(settings.phone || '');
      setFooterNote(settings.footer_note);
      setLogoUri(settings.logo_uri || null);
    }
  }

  async function handlePickLogo() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Izin Diperlukan', 'Izinkan akses galeri untuk memilih logo');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const sourceUri = result.assets[0].uri;
      // Copy to app's document directory for persistence
      const fileName = `logo_${Date.now()}.jpg`;
      const destUri = `${FileSystem.documentDirectory}${fileName}`;

      try {
        await FileSystem.copyAsync({ from: sourceUri, to: destUri });
        setLogoUri(destUri);
      } catch (error) {
        console.error('Error copying logo:', error);
        setLogoUri(sourceUri);
      }
    }
  }

  function handleRemoveLogo() {
    Alert.alert('Hapus Logo', 'Yakin ingin menghapus logo?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', onPress: () => setLogoUri(null), style: 'destructive' },
    ]);
  }

  async function handleSave() {
    if (!canAccessStoreSettings()) {
      Alert.alert('Akses Ditolak', 'Hanya akun Owner yang berhak mengubah pengaturan toko.');
      return;
    }
    setLoading(true);
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE store_settings SET store_name=?, address=?, phone=?, footer_note=?, logo_uri=?, updated_at=datetime('now','localtime') WHERE id='default'`,
        [storeName, address || null, phone || null, footerNote, logoUri || null]
      );
      Alert.alert('Berhasil', 'Pengaturan toko berhasil disimpan');
    } catch (error) {
      Alert.alert('Error', 'Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  }

  const themeColor = currentTheme.primary;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={[styles.avatar, { backgroundColor: themeColor }]}>
            <Text style={styles.avatarText}>
              {user?.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userMeta}>
              @{user?.username} • {user?.role === 'owner' ? 'Owner' : 'Kasir'}
            </Text>
          </View>
        </View>

        {/* Store Settings (Owner only) */}
        {isOwner() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pengaturan Toko</Text>
            <View style={styles.sectionCard}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <Text style={styles.logoLabel}>Logo Toko</Text>
                <Text style={styles.logoHint}>
                  Rekomendasi: 200×200 px, format JPG/PNG, maks 500KB
                </Text>
                <View style={styles.logoRow}>
                  {logoUri ? (
                    <View style={styles.logoPreviewContainer}>
                      <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                      <TouchableOpacity style={styles.logoRemoveBtn} onPress={handleRemoveLogo}>
                        <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Ionicons name="image-outline" size={32} color={COLORS.textTertiary} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.logoPickBtn, { borderColor: themeColor }]}
                    onPress={handlePickLogo}
                  >
                    <Ionicons name="camera-outline" size={18} color={themeColor} />
                    <Text style={[styles.logoPickText, { color: themeColor }]}>
                      {logoUri ? 'Ganti Logo' : 'Pilih Logo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.logoDivider} />

              <Input label="Nama Toko" placeholder="Nama toko" value={storeName} onChangeText={setStoreName} />
              <Input label="Alamat" placeholder="Alamat toko" value={address} onChangeText={setAddress} multiline />
              <Input label="No. Telepon" placeholder="08xxxxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Input label="Catatan Struk" placeholder="Terima kasih!" value={footerNote} onChangeText={setFooterNote} />
              <Button title="Simpan Pengaturan" onPress={handleSave} loading={loading} variant="tonal" />
            </View>
          </View>
        )}

        {/* Read-only Store Info for Kasir */}
        {!isOwner() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informasi Toko</Text>
            <View style={styles.sectionCard}>
              <View style={styles.storeInfoItem}>
                <Text style={styles.storeInfoLabel}>Nama Toko</Text>
                <Text style={styles.storeInfoValue}>{storeName}</Text>
              </View>
              {address ? (
                <View style={styles.storeInfoItem}>
                  <Text style={styles.storeInfoLabel}>Alamat</Text>
                  <Text style={styles.storeInfoValue}>{address}</Text>
                </View>
              ) : null}
              {phone ? (
                <View style={styles.storeInfoItem}>
                  <Text style={styles.storeInfoLabel}>No. Telepon</Text>
                  <Text style={styles.storeInfoValue}>{phone}</Text>
                </View>
              ) : null}
              {footerNote ? (
                <View style={styles.storeInfoItem}>
                  <Text style={styles.storeInfoLabel}>Catatan Struk</Text>
                  <Text style={styles.storeInfoValue}>{footerNote}</Text>
                </View>
              ) : null}

              <View style={styles.roleNoticeBox}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.roleNoticeText}>
                  Pengaturan toko dan identitas nota hanya dapat diedit oleh akun Owner.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tema Warna</Text>
          <View style={styles.sectionCard}>
            <View style={styles.themeGrid}>
              {themes.map(theme => (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeItem,
                    currentTheme.id === theme.id && styles.themeItemActive,
                    currentTheme.id === theme.id && { borderColor: theme.primary },
                  ]}
                  onPress={() => setTheme(theme.id)}
                >
                  <View style={styles.themeColorRow}>
                    <View style={[styles.themeColorDot, { backgroundColor: theme.primary }]} />
                    <View style={[styles.themeColorDotSmall, { backgroundColor: theme.primaryLight }]} />
                    <View style={[styles.themeColorDotSmall, { backgroundColor: theme.primaryContainer }]} />
                  </View>
                  <Text style={[
                    styles.themeItemName,
                    currentTheme.id === theme.id && { color: theme.primary, fontWeight: '600' },
                  ]}>
                    {theme.name}
                  </Text>
                  {currentTheme.id === theme.id && (
                    <Ionicons name="checkmark-circle" size={16} color={theme.primary} style={styles.themeCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lainnya</Text>
          <View style={styles.menuCard}>
            {canExportData() && (
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ExportImport')}>
                <View style={[styles.menuIcon, { backgroundColor: '#E8F0FE' }]}>
                  <Ionicons name="swap-horizontal-outline" size={20} color={themeColor} />
                </View>
                <Text style={styles.menuText}>Export / Import Data</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            {isOwner() && (
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageUsers')}>
                <View style={[styles.menuIcon, { backgroundColor: '#F3E8FD' }]}>
                  <Ionicons name="people-outline" size={20} color={COLORS.tertiary} />
                </View>
                <Text style={styles.menuText}>Kelola Pengguna</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            {isOwner() && (
              <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Suppliers')}>
                <View style={[styles.menuIcon, { backgroundColor: '#E6F4EA' }]}>
                  <Ionicons name="business-outline" size={20} color={COLORS.success} />
                </View>
                <Text style={styles.menuText}>Kelola Supplier</Text>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => Alert.alert('Konfirmasi', 'Yakin ingin keluar?', [
                { text: 'Batal', style: 'cancel' },
                { text: 'Keluar', onPress: logout },
              ])}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FDECEA' }]}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              </View>
              <Text style={[styles.menuText, { color: COLORS.danger }]}>Keluar</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Warung Hebat v1.0.0</Text>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.md,
    ...ELEVATION.level1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.textWhite,
  },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.15,
  },
  userMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...ELEVATION.level1,
  },
  // Logo styles
  logoSection: {
    marginBottom: SPACING.sm,
  },
  logoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  logoHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  logoPreviewContainer: {
    position: 'relative',
  },
  logoPreview: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  logoRemoveBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 11,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  logoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoPickText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
  logoDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  // Theme styles
  themeGrid: {
    gap: SPACING.sm,
  },
  themeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  themeItemActive: {
    borderWidth: 2,
    backgroundColor: COLORS.surfaceContainer,
  },
  themeColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  themeColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeColorDotSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeItemName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.onSurface,
    letterSpacing: 0.25,
  },
  themeCheck: {
    marginLeft: 'auto',
  },
  // Menu styles
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...ELEVATION.level1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.onSurface,
    letterSpacing: 0.25,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    letterSpacing: 0.4,
  },
  storeInfoItem: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  storeInfoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  storeInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
  },
  roleNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainer,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  roleNoticeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});
