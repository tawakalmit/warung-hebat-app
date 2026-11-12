import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { UserRole } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('kasir');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('Semua field harus diisi');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (password.length < 4) {
      setError('Password minimal 4 karakter');
      return;
    }

    setLoading(true);
    setError('');

    const result = await register(username.trim(), password, name.trim(), role);
    if (result.success) {
      Alert.alert('Berhasil', 'Akun berhasil dibuat. Silakan login.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buat Akun</Text>
          <Text style={styles.headerSubtitle}>Daftar untuk mulai mengelola warung</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Nama Lengkap"
            placeholder="Masukkan nama lengkap"
            value={name}
            onChangeText={setName}
            leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />}
          />

          <Input
            label="Username"
            placeholder="Masukkan username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="at-outline" size={20} color={COLORS.textSecondary} />}
          />

          <Input
            label="Password"
            placeholder="Minimal 4 karakter"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />}
            rightIcon={
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          <Input
            label="Konfirmasi Password"
            placeholder="Ulangi password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />}
          />

          {/* Role Selection - Material Segmented Button */}
          <Text style={styles.roleLabel}>Pilih Role</Text>
          <View style={styles.segmentedButton}>
            <TouchableOpacity
              style={[styles.segment, role === 'owner' && styles.segmentActive]}
              onPress={() => setRole('owner')}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={role === 'owner' ? COLORS.onPrimaryContainer : COLORS.onSurface}
              />
              <Text style={[styles.segmentText, role === 'owner' && styles.segmentTextActive]}>
                Owner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, role === 'kasir' && styles.segmentActive]}
              onPress={() => setRole('kasir')}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={role === 'kasir' ? COLORS.onPrimaryContainer : COLORS.onSurface}
              />
              <Text style={[styles.segmentText, role === 'kasir' && styles.segmentTextActive]}>
                Kasir
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Daftar"
            onPress={handleRegister}
            loading={loading}
            size="large"
            style={styles.registerButton}
          />
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
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    marginLeft: -SPACING.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.25,
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEA',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.4,
  },
  segmentedButton: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.outline,
    marginBottom: SPACING.lg,
    height: 44,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm - 1,
  },
  segmentActive: {
    backgroundColor: COLORS.primaryContainer,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.onSurface,
    letterSpacing: 0.1,
  },
  segmentTextActive: {
    color: COLORS.onPrimaryContainer,
  },
  registerButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
});
