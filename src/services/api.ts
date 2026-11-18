import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Product, Category, Supplier, StockIn, Transaction, TransactionItem, StoreSettings, UserRole } from '../types';

export const API_BASE_URL = 'https://apiwarung.mitbit.id';

export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem('auth_token');
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem('auth_token', token);
}

export async function removeAuthToken(): Promise<void> {
  await AsyncStorage.removeItem('auth_token');
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const token = await getAuthToken();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await response.json();
    return json;
  } catch (error: any) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
    let errorMsg = 'Gagal terhubung ke server Warung Hebat';
    if (error.name === 'AbortError') {
      errorMsg = 'Koneksi ke server timeout (waktu habis)';
    } else if (error.message) {
      errorMsg = error.message;
    }
    return {
      success: false,
      message: errorMsg,
    };
  }
}

// 1. Auth API
export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    }),

  register: (username: string, password: string, name: string, role: UserRole) =>
    apiRequest<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: { username, password, name, role },
    }),

  getMe: () => apiRequest<User>('/api/auth/me'),
};

// 2. Users API (Owner Only)
export const usersApi = {
  getAll: () => apiRequest<User[]>('/api/users'),

  create: (username: string, password: string, name: string, role: UserRole) =>
    apiRequest<User>('/api/users', {
      method: 'POST',
      body: { username, password, name, role },
    }),

  toggleStatus: (id: string) =>
    apiRequest<{ id: string; is_active: number }>(`/api/users/${id}/status`, {
      method: 'PATCH',
    }),

  delete: (id: string) =>
    apiRequest(`/api/users/${id}`, {
      method: 'DELETE',
    }),
};

// 3. Products API
export const productsApi = {
  getAll: (params?: { search?: string; category_id?: string; only_in_stock?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.only_in_stock) query.append('only_in_stock', 'true');
    const qs = query.toString();
    return apiRequest<Product[]>(`/api/products${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) => apiRequest<Product>(`/api/products/${id}`),

  create: (productData: Partial<Product>) =>
    apiRequest<Product>('/api/products', {
      method: 'POST',
      body: productData,
    }),

  update: (id: string, productData: Partial<Product>) =>
    apiRequest<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: productData,
    }),

  delete: (id: string) =>
    apiRequest(`/api/products/${id}`, {
      method: 'DELETE',
    }),
};

// 4. Categories API
export const categoriesApi = {
  getAll: () => apiRequest<Category[]>('/api/categories'),
  create: (name: string, description?: string) =>
    apiRequest<Category>('/api/categories', {
      method: 'POST',
      body: { name, description },
    }),
  delete: (id: string) => apiRequest(`/api/categories/${id}`, { method: 'DELETE' }),
};

// 5. Suppliers API
export const suppliersApi = {
  getAll: () => apiRequest<Supplier[]>('/api/suppliers'),
  create: (name: string, phone?: string, address?: string) =>
    apiRequest<Supplier>('/api/suppliers', {
      method: 'POST',
      body: { name, phone, address },
    }),
  delete: (id: string) => apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' }),
};

// 6. Stock In API
export const stockInApi = {
  getAll: () => apiRequest<any[]>('/api/stock-in'),
  create: (data: { product_id: string; supplier_id?: string; quantity: number; buy_price: number; note?: string }) =>
    apiRequest('/api/stock-in', {
      method: 'POST',
      body: data,
    }),
};

// 7. Transactions API
export const transactionsApi = {
  getAll: (params?: { limit?: number; offset?: number; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return apiRequest<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    apiRequest<Transaction & { items: TransactionItem[]; cashier_name?: string }>(`/api/transactions/${id}`),

  checkout: (data: {
    items: {
      product_id?: string | null;
      product_name: string;
      quantity: number;
      price: number;
      discount?: number;
      subtotal: number;
    }[];
    total_amount: number;
    discount?: number;
    grand_total: number;
    payment_amount: number;
    change_amount?: number;
    payment_method?: string;
    customer_name?: string;
    note?: string;
  }) =>
    apiRequest<{
      transactionId: string;
      invoiceNumber: string;
      grandTotal: number;
      payment: number;
      change: number;
    }>('/api/transactions', {
      method: 'POST',
      body: data,
    }),
};

// 8. Reports API
export const reportsApi = {
  getDashboardStats: () =>
    apiRequest<{
      todaySales: number;
      todayTransactions: number;
      monthSales: number;
      monthTransactions: number;
      totalProducts: number;
      lowStockCount: number;
    }>('/api/reports/dashboard-stats'),

  getDaily: () => apiRequest<{ date: string; total: number; count: number }[]>('/api/reports/daily'),
  getMonthly: () => apiRequest<{ month: string; total: number; count: number }[]>('/api/reports/monthly'),
  getYearly: () => apiRequest<{ month: string; total: number; count: number }[]>('/api/reports/yearly'),
};

// 9. Store Settings API
export const settingsApi = {
  get: () => apiRequest<StoreSettings>('/api/settings'),
  update: (settings: Partial<StoreSettings>) =>
    apiRequest<StoreSettings>('/api/settings', {
      method: 'PUT',
      body: settings,
    }),
};

// 10. Export Import API
export const exportImportApi = {
  export: () => apiRequest('/api/export-import/export'),
  import: (data: any) =>
    apiRequest('/api/export-import/import', {
      method: 'POST',
      body: { data },
    }),
};
