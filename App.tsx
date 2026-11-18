import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LicenseProvider } from './src/contexts/LicenseContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <LicenseProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </LicenseProvider>
    </SafeAreaProvider>
  );
}
