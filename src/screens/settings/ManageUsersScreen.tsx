import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database/database';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from '../../components/EmptyState';
import { COLORS, SPACING, BORDER_RADIUS, ELEVATION } from '../../constants/theme';

export default function ManageUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  async function loadUsers() {
    const db = await getDatabase();
    const results = await db.getAllAsync<User>('SELECT * FROM users ORDER BY created_at DESC');
    setUsers(results);
  }

  async function toggleUserStatus(targetUser: User) {
    if (targetUser.id === currentUser?.id) {
      Alert.alert('Error', 'Tidak bisa menonaktifkan akun sendiri');
      return;
    }

    const newStatus = targetUser.is_active ? 0 : 1;
    const action = newStatus ? 'mengaktifkan' : 'menonaktifkan';

    Alert.alert('Konfirmasi', `Yakin ingin ${action} akun "${targetUser.name}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ya',
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, targetUser.id]);
          loadUsers();
        },
      },
    ]);
  }

  function renderUser({ item }: { item: User }) {
    const isCurrentUser = item.id === currentUser?.id;

    return (
      <View style={[styles.userCard, !item.is_active && styles.userInactive]}>
        <View style={[styles.avatar, { backgroundColor: item.role === 'owner' ? COLORS.primary : COLORS.secondary }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>Anda</Text>
              </View>
            )}
          </View>
          <Text style={styles.userDetail}>@{item.username} • {item.role === 'owner' ? 'Owner' : 'Kasir'}</Text>
          <Text style={styles.userStatus}>
            {item.is_active ? '● Aktif' : '● Nonaktif'}
          </Text>
        </View>
        {!isCurrentUser && (
          <TouchableOpacity style={styles.toggleBtn} onPress={() => toggleUserStatus(item)}>
            <Ionicons
              name={item.is_active ? 'toggle' : 'toggle-outline'}
              size={28}
              color={item.is_active ? COLORS.primary : COLORS.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState icon="people-outline" title="Belum ada pengguna" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: SPACING.md,
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
    opacity: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '500',
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
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  youBadge: {
    backgroundColor: COLORS.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.onPrimaryContainer,
  },
  userDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  userStatus: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 2,
  },
  toggleBtn: {
    padding: SPACING.sm,
  },
});
