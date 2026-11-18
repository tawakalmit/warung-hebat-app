import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLicense } from '../contexts/LicenseContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ActivationScreen from '../screens/auth/ActivationScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export default function AppNavigator() {
  const { isLicensed, isLoading: isLicenseLoading } = useLicense();
  const { user, isLoading: isAuthLoading } = useAuth();

  if (isLicenseLoading || isAuthLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isLicensed) {
    return <ActivationScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
