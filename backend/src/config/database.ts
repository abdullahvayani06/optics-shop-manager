import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDataDir = path.resolve(__dirname, '../../data');
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(defaultDataDir, 'optics.db');

// Ensure parent directory exists before opening database
const parentDir = path.dirname(dbPath);
if (!fs.existsSync(parentDir)) {
  fs.mkdirSync(parentDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      right_sphere TEXT,
      right_cylinder TEXT,
      right_axis TEXT,
      right_add TEXT,
      left_sphere TEXT,
      left_cylinder TEXT,
      left_axis TEXT,
      left_add TEXT,
      pupillary_distance TEXT,
      prescribing_doctor TEXT,
      test_date TEXT NOT NULL,
      remarks TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_type TEXT NOT NULL CHECK (product_type IN ('Frame', 'Lens', 'Sunglasses', 'Accessory')),
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      description TEXT,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      supplier TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      sale_date TEXT NOT NULL,
      gross_total REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Partial', 'Unpaid')),
      status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled')),
      cancelled_at TEXT,
      cancelled_by TEXT REFERENCES profiles(id),
      notes TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL,
      cost_price REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other')),
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      investment_type TEXT NOT NULL CHECK (investment_type IN ('Initial Capital', 'Additional Capital', 'Owner Contribution', 'Other')),
      description TEXT,
      notes TEXT,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES profiles(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
  `);

  // Run migrations safely for existing tables
  const safeAlter = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // Column or index already exists or error handled
    }
  };

  safeAlter("ALTER TABLE profiles ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  safeAlter("ALTER TABLE sales ADD COLUMN status TEXT NOT NULL DEFAULT 'Completed'");
  safeAlter("ALTER TABLE sales ADD COLUMN cancelled_at TEXT");
  safeAlter("ALTER TABLE sales ADD COLUMN cancelled_by TEXT REFERENCES profiles(id)");
  safeAlter("ALTER TABLE sales ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("ALTER TABLE customers ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("ALTER TABLE products ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("ALTER TABLE prescriptions ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("ALTER TABLE expenses ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("ALTER TABLE investments ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0");
  safeAlter("CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status)");

  // Initialize default business settings if not present
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM business_settings').get() as { count: number };
  if (existingSettings.count === 0) {
    const defaultSettings: Record<string, string> = {
      shop_name: 'VisionOptics Pakistan',
      phone: '+92 300 1234567',
      whatsapp: '+92 300 1234567',
      email: 'contact@visionoptics.pk',
      address: 'Suite 402, Al-Latif Centre, Main Boulevard, Gulberg III, Lahore, Pakistan',
      logo_url: '',
      invoice_footer: 'Thank you for choosing VisionOptics. Quality eyewear guaranteed. Exchange within 7 days with original invoice.',
      allow_negative_stock: 'false'
    };

    const now = new Date().toISOString();
    const insertSetting = db.prepare('INSERT INTO business_settings (key, value, updated_at) VALUES (?, ?, ?)');
    for (const [key, value] of Object.entries(defaultSettings)) {
      insertSetting.run(key, value, now);
    }
  }
}
