export type UserRole = 'owner' | 'kasir';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  category_id?: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_uri?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface StockIn {
  id: string;
  product_id: string;
  supplier_id?: string;
  quantity: number;
  buy_price: number;
  total: number;
  note?: string;
  user_id: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  total_amount: number;
  discount: number;
  tax: number;
  grand_total: number;
  payment_amount: number;
  change_amount: number;
  payment_method: string;
  customer_name?: string;
  note?: string;
  user_id: string;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_buy_price?: number;
  new_buy_price?: number;
  old_sell_price?: number;
  new_sell_price?: number;
  changed_by: string;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  address?: string;
  phone?: string;
  footer_note: string;
  tax_percentage: number;
  logo_uri?: string;
  created_at: string;
  updated_at: string;
}

// Cart item for POS
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  subtotal: number;
}

// Manual item (barang yang belum terinput di sistem)
export interface ManualCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// Report types
export interface DailySummary {
  date: string;
  total_transactions: number;
  total_revenue: number;
  total_profit: number;
  total_items_sold: number;
}

export interface MonthlySummary {
  month: string;
  year: string;
  total_transactions: number;
  total_revenue: number;
  total_profit: number;
  total_items_sold: number;
}

export interface ProductReport {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
}
