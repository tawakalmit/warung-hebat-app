import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { exportImportApi } from '../../services/api';
import Button from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ExportImportScreen({ navigation }: any) {
  const { canExportData } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!canExportData()) {
    return (
      <View style={styles.accessDenied}>
        <View style={styles.lockIconBox}>
          <Ionicons name="lock-closed" size={48} color={COLORS.danger} />
        </View>
        <Text style={styles.accessDeniedTitle}>Akses Khusus Owner</Text>
        <Text style={styles.accessDeniedDesc}>
          Fitur Export & Import data mengandung data transaksi, stok, dan akun warung. Fitur ini hanya dapat diakses oleh akun dengan peran Owner.
        </Text>
        <Button
          title="Kembali"
          variant="outlined"
          onPress={() => navigation?.goBack()}
          style={{ marginTop: SPACING.lg, minWidth: 140 }}
        />
      </View>
    );
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportImportApi.export();

      if (!res) {
        Alert.alert('Error', 'Gagal mengambil data ekspor dari server');
        return;
      }

      const fileName = `warung_hebat_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(res, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, { mimeType: 'application/json', dialogTitle: 'Export Data Warung Hebat' });
      } else {
        Alert.alert('Berhasil', `Data berhasil diekspor ke ${fileName}`);
      }
    } catch (error) {
      console.error('Export error:', error);
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

      const res = await exportImportApi.import(importData.data);
      if (res.success) {
        Alert.alert('Berhasil', res.message || 'Data berhasil diimport ke server');
      } else {
        Alert.alert('Gagal', res.message || 'Gagal mengimport data ke server');
      }
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
  accessDenied: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  lockIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FCE8E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  accessDeniedDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
