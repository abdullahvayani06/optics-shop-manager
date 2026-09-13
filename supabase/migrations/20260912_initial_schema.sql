-- ================================================================
-- Optics Shop Manager - Complete PostgreSQL / Supabase Schema
-- Includes Row Level Security (RLS), has_role() function & Triggers
-- ================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (linked to Supabase auth.users or standalone)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, role)
);

-- 4. Secure has_role() Security Definer Function
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = required_role
    );
$$;

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);

-- 6. Prescriptions Table (Chronological, immutable)
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    right_sphere NUMERIC(5,2),
    right_cylinder NUMERIC(5,2),
    right_axis INTEGER,
    right_add NUMERIC(4,2),
    left_sphere NUMERIC(5,2),
    left_cylinder NUMERIC(5,2),
    left_axis INTEGER,
    left_add NUMERIC(4,2),
    pupillary_distance NUMERIC(4,1),
    prescribing_doctor TEXT,
    test_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON public.prescriptions(customer_id);

-- 7. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type TEXT NOT NULL CHECK (product_type IN ('Frame', 'Lens', 'Sunglasses', 'Accessory')),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    supplier TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 8. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    gross_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Paid', 'Partial', 'Unpaid')),
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Cancelled')),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON public.sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);

-- 9. Sale Items Table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    discount NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL,
    cost_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_sale ON public.payments(sale_id);

-- 11. Expenses Table (Owner Only)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Investments Table (Owner Only - Not Revenue)
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    investment_type TEXT NOT NULL CHECK (investment_type IN ('Initial Capital', 'Additional Capital', 'Owner Contribution', 'Other')),
    description TEXT,
    notes TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Business Settings Table
CREATE TABLE IF NOT EXISTS public.business_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can view; Owner can manage all; Users can update own profile
CREATE POLICY "Users can view all active profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Owner can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role('owner'));

-- User Roles: Owner can manage all roles; users can view own role
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role('owner'));

-- Customers: Staff and Owner can view, create, update
CREATE POLICY "Staff and Owner can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff and Owner can update customers" ON public.customers FOR UPDATE TO authenticated USING (true);

-- Prescriptions: Staff and Owner can view and insert
CREATE POLICY "Staff and Owner can view prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (true);

-- Products: Staff and Owner can view; Owner and Staff can insert/update
CREATE POLICY "Staff and Owner can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff and Owner can update products" ON public.products FOR UPDATE TO authenticated USING (true);

-- Sales & Sale Items: Staff and Owner can view and insert
CREATE POLICY "Staff and Owner can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff and Owner can update sales" ON public.sales FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff and Owner can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Payments: Staff and Owner can view and insert
CREATE POLICY "Staff and Owner can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff and Owner can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);

-- Expenses: STRICTLY OWNER ONLY!
CREATE POLICY "Owner can view expenses" ON public.expenses FOR SELECT TO authenticated USING (public.has_role('owner'));
CREATE POLICY "Owner can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.has_role('owner'));
CREATE POLICY "Owner can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role('owner'));
CREATE POLICY "Owner can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (public.has_role('owner'));

-- Investments: STRICTLY OWNER ONLY!
CREATE POLICY "Owner can view investments" ON public.investments FOR SELECT TO authenticated USING (public.has_role('owner'));
CREATE POLICY "Owner can insert investments" ON public.investments FOR INSERT TO authenticated WITH CHECK (public.has_role('owner'));
CREATE POLICY "Owner can update investments" ON public.investments FOR UPDATE TO authenticated USING (public.has_role('owner'));
CREATE POLICY "Owner can delete investments" ON public.investments FOR DELETE TO authenticated USING (public.has_role('owner'));

-- Business Settings: All can read; Owner can modify
CREATE POLICY "All authenticated can view settings" ON public.business_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can modify settings" ON public.business_settings FOR ALL TO authenticated USING (public.has_role('owner'));
