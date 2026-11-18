import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { suppliersApi } from '../../services/api';
import { Supplier } from '../../types';
import Input from '../../components/Input';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function SuppliersScreen() {
  const { isOwner } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadSuppliers();
    }, [])
  );

  async function loadSuppliers() {
    try {
      const res = await suppliersApi.getAll();
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  async function handleAdd() {
    if (!name.trim()) {
      Alert.alert('Error', 'Nama supplier harus diisi');
      return;
    }

    try {
      const res = await suppliersApi.create(name.trim(), phone || undefined, address || undefined);
      if (res.success) {
        setName('');
        setPhone('');
        setAddress('');
        setShowForm(false);
        loadSuppliers();
      } else {
        Alert.alert('Gagal', res.message || 'Gagal menambahkan supplier');
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal menambahkan supplier');
    }
  }

  async function handleDelete(supplier: Supplier) {
    Alert.alert('Hapus Supplier', `Yakin ingin menghapus "${supplier.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await suppliersApi.delete(supplier.id);
            if (!res.success) {
              Alert.alert('Gagal', res.message || 'Gagal menghapus supplier');
            } else {
              loadSuppliers();
            }
          } catch (error) {
            Alert.alert('Error', 'Gagal menghapus supplier');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Tambah Supplier</Text>
          <Input label="Nama Supplier" placeholder="Nama" value={name} onChangeText={setName} />
          <Input label="Telepon" placeholder="08xxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="Alamat" placeholder="Alamat" value={address} onChangeText={setAddress} />
          <View style={styles.formActions}>
            <Button title="Batal" onPress={() => setShowForm(false)} variant="outlined" size="small" />
            <Button title="Simpan" onPress={handleAdd} size="small" />
          </View>
        </View>
      )}

      <FlatList
        data={suppliers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.supplierCard}>
            <View style={styles.supplierAvatar}>
              <Text style={styles.supplierAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>{item.name}</Text>
              {item.phone && <Text style={styles.supplierDetail}>{item.phone}</Text>}
              {item.address && <Text style={styles.supplierDetail}>{item.address}</Text>}
            </View>
            {isOwner() && (
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState icon="business-outline" title="Belum ada supplier" subtitle="Tambahkan supplier untuk mencatat asal barang" />
        }
      />

      {isOwner() && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={24} color={COLORS.onPrimaryContainer} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    ...ELEVATION.level2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
    letterSpacing: 0.15,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 88,
    flexGrow: 1,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...ELEVATION.level1,
  },
  supplierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supplierAvatarText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  supplierDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  deleteBtn: {
    padding: SPACING.sm,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...ELEVATION.level3,
  },
});
