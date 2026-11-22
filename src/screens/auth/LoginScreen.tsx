import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: any;
};

export default function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const selectedRole = route?.params?.role as 'owner' | 'kasir' | undefined;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError('Username dan password harus diisi');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Back Button if available */}
        {navigation.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            <Text style={styles.backButtonText}>Pilih Peran Lain</Text>
          </TouchableOpacity>
        )}

        {/* Logo Section */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Warung Hebat</Text>
          {selectedRole ? (
            <View
              style={[
                styles.roleBadge,
                selectedRole === 'owner' ? styles.ownerRoleBadge : styles.kasirRoleBadge,
              ]}
            >
              <Ionicons
                name={selectedRole === 'owner' ? 'shield-checkmark' : 'calculator'}
                size={14}
                color={selectedRole === 'owner' ? COLORS.primary : COLORS.secondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.roleBadgeText,
                  selectedRole === 'owner' ? styles.ownerRoleBadgeText : styles.kasirRoleBadgeText,
                ]}
              >
                Masuk sebagai {selectedRole === 'owner' ? 'Owner' : 'Kasir'}
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>Masuk ke akun Anda</Text>
          )}
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
            label="Username"
            placeholder="Masukkan username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />}
          />

          <Input
            label="Password"
            placeholder="Masukkan password"
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

          <Button
            title="Masuk"
            onPress={handleLogin}
            loading={loading}
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Buat Akun Baru"
            onPress={() => navigation.navigate('Register', { role: selectedRole })}
            variant="outlined"
            size="large"
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
    justifyContent: 'center',
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
    gap: 6,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  appName: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    letterSpacing: 0.25,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: SPACING.xs,
  },
  ownerRoleBadge: {
    backgroundColor: COLORS.primaryContainer,
  },
  kasirRoleBadge: {
    backgroundColor: '#E0F2F1',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ownerRoleBadgeText: {
    color: COLORS.onPrimaryContainer,
  },
  kasirRoleBadgeText: {
    color: '#00695C',
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
    letterSpacing: 0.25,
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.divider,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
