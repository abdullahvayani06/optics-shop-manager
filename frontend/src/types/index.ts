export type UserRole = 'owner' | 'staff';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  active: number | boolean;
  created_at: string;
  updated_at: string;
  latest_prescription_date?: string | null;
  total_purchases?: number;
  outstanding_balance?: number;
  orders_count?: number;
}

export interface Prescription {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  right_sphere?: string | null;
  right_cylinder?: string | null;
  right_axis?: string | null;
  right_add?: string | null;
  left_sphere?: string | null;
  left_cylinder?: string | null;
  left_axis?: string | null;
  left_add?: string | null;
  pupillary_distance?: string | null;
  prescribing_doctor?: string | null;
  test_date: string;
  remarks?: string | null;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export type ProductType = 'Frame' | 'Lens' | 'Sunglasses' | 'Accessory';

export interface Product {
  id: string;
  product_type: ProductType;
  brand: string;
  model: string;
  sku: string;
  description?: string | null;
  cost_price?: number | null; // Masked for staff
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  supplier?: string | null;
  active: number | boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Easypaisa' | 'JazzCash' | 'Other';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  brand?: string;
  model?: string;
  sku?: string;
  product_type?: ProductType;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
  cost_price?: number;
  created_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  customer_id: string;
  customer_name?: string;
  invoice_number?: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  notes?: string | null;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  sale_date: string;
  gross_total: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  status?: 'Completed' | 'Cancelled';
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_name?: string | null;
  notes?: string | null;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
  items?: SaleItem[];
  payments?: Payment[];
  item_count?: number;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Shipping'
  | 'Advertising'
  | 'Electricity'
  | 'Internet'
  | 'Salaries'
  | 'Packaging'
  | 'Transportation'
  | 'Maintenance'
  | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory | string;
  amount: number;
  description?: string | null;
  date: string;
  payment_method: string;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export type InvestmentType =
  | 'Initial Capital'
  | 'Additional Capital'
  | 'Owner Contribution'
  | 'Other';

export interface Investment {
  id: string;
  date: string;
  amount: number;
  investment_type: InvestmentType;
  description?: string | null;
  notes?: string | null;
  created_by?: string;
  created_by_name?: string;
  created_at: string;
}

export interface BusinessSettings {
  shop_name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  logo_url: string;
  invoice_footer: string;
  allow_negative_stock: string;
  [key: string]: string;
}

export interface DashboardMetrics {
  total_sales?: number;
  net_profit?: number;
  outstanding_balance?: number;
  stock_value?: number;
  total_customers: number;
  today_sales_count: number;
  total_products: number;
  low_stock_count: number;
}
