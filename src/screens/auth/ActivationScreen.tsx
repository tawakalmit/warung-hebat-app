import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useLicense } from '../../contexts/LicenseContext';
import { formatTokenInput, cleanToken } from '../../services/license';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ActivationScreen() {
  const { deviceId, formattedDeviceId, activate } = useLicense();
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const digits = cleanToken(tokenInput);
  const isComplete = digits.length === 20;

  async function handleCopyDeviceId() {
    try {
      await Clipboard.setStringAsync(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (error) {
      console.error('Clipboard copy error:', error);
    }
  }

  async function handlePasteToken() {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setTokenInput(formatTokenInput(text));
        setErrorMessage('');
      }
    } catch (error) {
      console.error('Clipboard paste error:', error);
    }
  }

  function handleTokenChange(text: string) {
    const formatted = formatTokenInput(text);
    setTokenInput(formatted);
    if (errorMessage) setErrorMessage('');
  }

  async function handleSendWhatsApp() {
    const message = `Halo Admin Warung Hebat, saya ingin meminta token aktivasi aplikasi untuk perangkat dengan ID:\n\n*${formattedDeviceId || deviceId}*\n\nTerima kasih.`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Info', 'Tidak dapat membuka aplikasi WhatsApp secara otomatis. Silakan salin ID dan kirimkan manual.');
      }
    } catch (error) {
      Alert.alert('Info', 'Silakan salin ID perangkat dan kirimkan ke Admin.');
    }
  }

  async function handleActivate() {
    if (!isComplete) {
      setErrorMessage(`Token belum lengkap (${digits.length}/20 digit).`);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await activate(tokenInput);
      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        Alert.alert('Aktivasi Berhasil 🎉', result.message);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Gagal memproses aktivasi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Warung Hebat</Text>
          <View style={styles.badge}>
            <Ionicons name="key" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.badgeText}>Aktivasi Lisensi Perangkat</Text>
          </View>
          <Text style={styles.subtitle}>
            Aplikasi terkunci untuk perangkat ini. Masukkan token aktivasi 20-digit dari Admin untuk membuka akses.
          </Text>
        </View>

        {/* Device ID Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>ID PERANGKAT ANDA</Text>
          </View>
          <Text style={styles.cardDescription}>
            Kirimkan ID di bawah ini ke Admin (warung.mitbit.id) untuk mendapatkan token aktivasi:
          </Text>

          <View style={styles.deviceIdBox}>
            <Text style={styles.deviceIdText} selectable>
              {formattedDeviceId || deviceId || 'MEMUAT ID...'}
            </Text>
          </View>

          <View style={styles.idActionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.copyButton, copied && styles.copyButtonSuccess]}
              onPress={handleCopyDeviceId}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? COLORS.success : COLORS.primary}
              />
              <Text style={[styles.actionButtonText, copied && { color: COLORS.success }]}>
                {copied ? 'Tersalin!' : 'Salin ID'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.waButton]}
              onPress={handleSendWhatsApp}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Kirim via WA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Token Input Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>TOKEN AKTIVASI (20 DIGIT)</Text>
          </View>
          <Text style={styles.cardDescription}>
            Format 20 digit angka mirip token listrik PLN:
          </Text>

          {/* Formatted Token Input */}
          <View style={[styles.tokenInputContainer, isComplete && styles.tokenInputContainerComplete]}>
            <Text style={styles.tokenDisplayText}>
              {tokenInput ? (
                tokenInput
              ) : (
                <Text style={styles.tokenPlaceholder}>XXXX - XXXX - XXXX - XXXX - XXXX</Text>
              )}
            </Text>
          </View>

          {/* Hidden/Direct input helper */}
          <View style={styles.inputHelperRow}>
            <Text style={styles.counterText}>
              Digit terisi: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{digits.length}</Text> / 20
            </Text>
            <View style={styles.helperButtons}>
              <TouchableOpacity style={styles.textActionBtn} onPress={handlePasteToken}>
                <Ionicons name="clipboard-outline" size={15} color={COLORS.primary} />
                <Text style={styles.textActionBtnText}>Tempel</Text>
              </TouchableOpacity>
              {tokenInput.length > 0 && (
                <TouchableOpacity
                  style={[styles.textActionBtn, { marginLeft: SPACING.sm }]}
                  onPress={() => setTokenInput('')}
                >
                  <Ionicons name="close-circle-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={[styles.textActionBtnText, { color: COLORS.textSecondary }]}>Hapus</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Hidden TextInput overlaid to capture keystrokes naturally */}
          <View style={styles.actualInputWrapper}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.keypadTapTarget}
              onPress={() => {}}
            >
              <Input
                label="Ketik atau tempel token di sini"
                value={tokenInput}
                onChangeText={handleTokenChange}
                placeholder="Contoh: 12345678..."
                keyboardType="number-pad"
                maxLength={24} // 20 digits + 4 hyphens
                autoFocus={true}
              />
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Activate Button */}
          <Button
            title={loading ? 'Memvalidasi Token...' : 'Aktivasi Perangkat Sekarang'}
            onPress={handleActivate}
            loading={loading}
            disabled={!isComplete || loading}
            icon={loading ? undefined : <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />}
            style={{ marginTop: SPACING.md }}
          />
        </View>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.footerInfoText}>
            Aktivasi ini bersifat permanen untuk perangkat ini. Tidak memerlukan koneksi internet untuk memvalidasi token.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...ELEVATION.level1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: SPACING.xs,
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  deviceIdBox: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  deviceIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  idActionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  copyButton: {
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  copyButtonSuccess: {
    backgroundColor: '#E8F8F0',
    borderColor: COLORS.success,
  },
  waButton: {
    backgroundColor: '#25D366',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tokenInputContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  tokenInputContainerComplete: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight || '#E8F5E9',
  },
  tokenDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  tokenPlaceholder: {
    color: COLORS.textSecondary,
    opacity: 0.5,
  },
  inputHelperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  counterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  helperButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  textActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actualInputWrapper: {
    marginTop: SPACING.xs,
  },
  keypadTapTarget: {},
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDED',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 8,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    lineHeight: 16,
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
  },
  footerInfoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },
});
