import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { COLORS } from '../constants/theme';

// Screens
import DashboardScreen from '../screens/home/DashboardScreen';
import ProductsScreen from '../screens/products/ProductsScreen';
import AddProductScreen from '../screens/products/AddProductScreen';
import POSScreen from '../screens/pos/POSScreen';
import CheckoutScreen from '../screens/pos/CheckoutScreen';
import ReceiptScreen from '../screens/pos/ReceiptScreen';
import StockInScreen from '../screens/stockin/StockInScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import TransactionHistoryScreen from '../screens/reports/TransactionHistoryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ExportImportScreen from '../screens/settings/ExportImportScreen';
import ManageUsersScreen from '../screens/settings/ManageUsersScreen';
import SuppliersScreen from '../screens/settings/SuppliersScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.onSurface,
  headerShadowVisible: false,
  headerTitleStyle: { fontSize: 18, fontWeight: '400' as const },
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function ProductsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ProductsList" component={ProductsScreen} options={{ title: 'Produk' }} />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={({ route }: any) => ({
          title: route.params?.product ? 'Edit Produk' : 'Tambah Produk',
        })}
      />
    </Stack.Navigator>
  );
}

function POSStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="POSMain" component={POSScreen} options={{ title: 'Kasir' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Pembayaran' }} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'Struk', headerBackVisible: false }} />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="ReportsMain" component={ReportsScreen} options={{ title: 'Laporan' }} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: 'Riwayat Transaksi' }} />
      <Stack.Screen name="ExportImport" component={ExportImportScreen} options={{ title: 'Export / Import' }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Pengaturan' }} />
      <Stack.Screen name="ExportImport" component={ExportImportScreen} options={{ title: 'Export / Import' }} />
      <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: 'Kelola Pengguna' }} />
      <Stack.Screen name="Suppliers" component={SuppliersScreen} options={{ title: 'Supplier' }} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="StockIn"
        component={StockInScreen}
        options={{ headerShown: true, title: 'Barang Masuk', ...screenOptions }}
      />
      <Stack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ headerShown: true, title: 'Tambah Produk', ...screenOptions }}
      />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { currentTheme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: currentTheme.primary,
        tabBarInactiveTintColor: COLORS.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.divider,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'POS':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Reports':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Beranda' }} />
      <Tab.Screen name="Products" component={ProductsStack} options={{ tabBarLabel: 'Produk' }} />
      <Tab.Screen name="POS" component={POSStack} options={{ tabBarLabel: 'Kasir' }} />
      <Tab.Screen name="Reports" component={ReportsStack} options={{ tabBarLabel: 'Laporan' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ tabBarLabel: 'Lainnya' }} />
    </Tab.Navigator>
  );
}
