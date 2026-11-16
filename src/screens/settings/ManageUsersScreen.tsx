import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { User, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from '../../components/EmptyState';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { generateId, hashPassword } from '../../utils/helpers';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ManageUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  async function loadUsers() {
    try {
      const db = await getDatabase();
      const results = await db.getAllAsync<User>(
        'SELECT * FROM users ORDER BY role ASC, created_at DESC'
      );
      setUsers(results);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  function resetForm() {
    setName('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRole('kasir');
    setShowPassword(false);
    setFormError('');
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  async function handleAddUser() {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedName || !trimmedUsername || !password.trim()) {
      setFormError('Semua field wajib diisi');
      return;
    }

    if (trimmedUsername.length < 3) {
      setFormError('Username minimal 3 karakter');
      return;
    }

    if (password.length < 4) {
      setFormError('Password minimal 4 karakter');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Konfirmasi password tidak cocok');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const db = await getDatabase();

      // Periksa apakah username sudah terdaftar
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE LOWER(username) = ?',
        [trimmedUsername]
      );

      if (existing) {
        setFormError('Username sudah digunakan oleh akun lain');
        setSubmitting(false);
        return;
      }

      const id = generateId();
      const hashedPassword = hashPassword(password);

      await db.runAsync(
        'INSERT INTO users (id, username, password, name, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
        [id, trimmedUsername, hashedPassword, trimmedName, role]
      );

      setShowAddModal(false);
      resetForm();
      loadUsers();

      Alert.alert(
        'Berhasil',
        `Akun ${role === 'owner' ? 'Owner' : 'Kasir'} "${trimmedName}" (@${trimmedUsername}) berhasil didaftarkan.`
      );
    } catch (error) {
      console.error('Add user error:', error);
      setFormError('Terjadi kesalahan saat menambahkan pengguna');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleUserStatus(targetUser: User) {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Perhatian', 'Tidak bisa menonaktifkan akun sendiri');
      return;
    }

    const newStatus = targetUser.is_active ? 0 : 1;
    const action = newStatus ? 'mengaktifkan' : 'menonaktifkan';

    Alert.alert('Konfirmasi', `Yakin ingin ${action} akun "${targetUser.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya',
        onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, targetUser.id]);
            loadUsers();
          } catch (error) {
            console.error('Toggle user status error:', error);
          }
        },
      },
    ]);
  }

  async function handleDeleteUser(targetUser: User) {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Perhatian', 'Tidak bisa menghapus akun sendiri');
      return;
    }

    Alert.alert(
      'Hapus Pengguna',
      `Yakin ingin menghapus akun "${targetUser.name}" (@${targetUser.username}) secara permanen?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync('DELETE FROM users WHERE id = ?', [targetUser.id]);
              loadUsers();
            } catch (error) {
              console.error('Delete user error:', error);
              Alert.alert('Gagal', 'Tidak dapat menghapus pengguna yang memiliki riwayat transaksi');
            }
          },
        },
      ]
    );
  }

  const totalUsers = users.length;
  const activeCashiers = users.filter(u => u.role === 'kasir' && u.is_active).length;

  function renderUser({ item }: { item: User }) {
    const isCurrentUser = item.id === currentUser?.id;
    const isOwner = item.role === 'owner';

    return (
      <View style={[styles.userCard, !item.is_active && styles.userInactive]}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: isOwner ? COLORS.primary : COLORS.secondary },
          ]}
        >
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>Anda</Text>
              </View>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.usernameText}>@{item.username}</Text>
            <View
              style={[
                styles.roleBadge,
                isOwner ? styles.roleBadgeOwner : styles.roleBadgeKasir,
              ]}
            >
              <Text
                style={[
                  styles.roleBadgeText,
                  isOwner ? styles.roleTextOwner : styles.roleTextKasir,
                ]}
              >
                {isOwner ? 'Owner' : 'Kasir'}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.userStatus,
              { color: item.is_active ? COLORS.success : COLORS.textTertiary },
            ]}
          >
            {item.is_active ? '● Aktif' : '● Nonaktif'}
          </Text>
        </View>

        {!isCurrentUser && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleUserStatus(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_active ? 'toggle' : 'toggle-outline'}
                size={28}
                color={item.is_active ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteUser(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{totalUsers}</Text>
          <Text style={styles.summaryLabel}>Total Pengguna</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: COLORS.secondary }]}>
            {activeCashiers}
          </Text>
          <Text style={styles.summaryLabel}>Kasir Aktif</Text>
        </View>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Belum ada pengguna"
            subtitle="Klik tombol Tambah Kasir di bawah untuk menambahkan pengguna baru"
          />
        }
      />

      {/* FAB: Tambah Kasir */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddModal}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add-outline" size={20} color={COLORS.textWhite} />
        <Text style={styles.fabText}>Tambah Kasir</Text>
      </TouchableOpacity>

      {/* Modal Tambah Pengguna / Kasir */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Ionicons name="person-add" size={22} color={COLORS.primary} />
                <Text style={styles.modalTitle}>Tambah Akun Baru</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
            >
              <Text style={styles.modalSubtitle}>
                Daftarkan akun kasir baru agar staf dapat login dan melayani transaksi kasir.
              </Text>

              {formError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorAlertText}>{formError}</Text>
                </View>
              ) : null}

              {/* Pemilihan Role */}
              <Text style={styles.fieldLabel}>Pilih Role / Peran</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'kasir' && styles.roleOptionActiveKasir,
                  ]}
                  onPress={() => setRole('kasir')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cart-outline"
                    size={18}
                    color={role === 'kasir' ? COLORS.secondary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      role === 'kasir' && styles.roleOptionTextActiveKasir,
                    ]}
                  >
                    Kasir (POS)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'owner' && styles.roleOptionActiveOwner,
                  ]}
                  onPress={() => setRole('owner')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={role === 'owner' ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.roleOptionText,
                      role === 'owner' && styles.roleOptionTextActiveOwner,
                    ]}
                  >
                    Owner (Penuh)
                  </Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Nama Lengkap *"
                placeholder="cth. Siti Rahma"
                value={name}
                onChangeText={setName}
                leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />}
              />

              <Input
                label="Username Login *"
                placeholder="cth. siti"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="at-outline" size={20} color={COLORS.textSecondary} />}
              />

              <Input
                label="Password *"
                placeholder="Minimal 4 karakter"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label="Konfirmasi Password *"
                placeholder="Ketik ulang password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                leftIcon={<Ionicons name="shield-outline" size={20} color={COLORS.textSecondary} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Batal"
                  variant="outlined"
                  onPress={() => setShowAddModal(false)}
                  style={styles.cancelBtn}
                />
                <Button
                  title="Simpan Akun"
                  onPress={handleAddUser}
                  loading={submitting}
                  style={styles.submitBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.divider,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 90,
    flexGrow: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...ELEVATION.level1,
  },
  userInactive: {
    opacity: 0.55,
    backgroundColor: COLORS.surfaceVariant,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.onPrimaryContainer,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 3,
  },
  usernameText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeKasir: {
    backgroundColor: '#E0F2F1',
  },
  roleBadgeOwner: {
    backgroundColor: '#EDE7F6',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  roleTextKasir: {
    color: COLORS.secondary,
  },
  roleTextOwner: {
    color: COLORS.tertiary,
  },
  userStatus: {
    fontSize: 11,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionBtn: {
    padding: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
    ...ELEVATION.level3,
  },
  fabText: {
    color: COLORS.textWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
    ...ELEVATION.level3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  modalHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.onSurface,
  },
  modalCloseBtn: {
    padding: SPACING.xs,
  },
  modalScroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE8E6',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  errorAlertText: {
    color: COLORS.danger,
    fontSize: 12,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  roleOptionActiveKasir: {
    borderColor: COLORS.secondary,
    backgroundColor: '#E0F2F1',
  },
  roleOptionActiveOwner: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryContainer,
  },
  roleOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  roleOptionTextActiveKasir: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  roleOptionTextActiveOwner: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 1,
  },
});
