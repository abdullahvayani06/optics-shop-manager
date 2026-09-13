# Optics Shop Manager

A complete, production-quality private web application for Pakistani optics businesses. Built with React, TypeScript, Tailwind CSS, Node.js, Express, SQLite, and optional PostgreSQL/Supabase migration.

---

## Quick Start

### 1. Start the Backend API Server (Port 5000)
```powershell
cd backend
npm run dev
```

### 2. Start the Frontend Application (Port 3000)
```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Seed Development Credentials (Local Testing Only)

> [!WARNING]
> The seeded accounts are strictly for local development and verification. You can change your password anytime under **Settings > Change Password**.

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Owner** | `owner@opticsshop.com` | `Owner123!` | Full access: Finance, COGS, Net Profit, Investments, Expenses, Staff, Catalog, Customers, Sales |
| **Staff** | `staff@opticsshop.com` | `Staff123!` | Operational access: Customers, Prescriptions, Sales & Invoicing, Stock levels (Cost prices and Finance are strictly blocked) |

---

## Key Modules & Capabilities

1. **Customers & Prescriptions**:
   - Customer records with contact details, address, and live search.
   - Chronological, immutable eyesight history (OD & OS: SPH, CYL, AXIS, ADD, PD, Doctor, Remarks).
   - Instant printable prescription card (browser print with print CSS).
   - "New Sale for Customer" quick action that pre-fills customer info and active prescription.

2. **Stock & Inventory**:
   - Products across 4 categories: Frames, Lenses, Sunglasses, Accessories.
   - Automatic transactional stock deduction upon sale completion.
   - Low-stock and out-of-stock indicators.
   - Cost price masked from staff users.

3. **Sales & Orders**:
   - Streamlined 3-step wizard: Select Customer $\to$ Add Products with live stock checks $\to$ Record Payment.
   - Atomic multi-item transactions.
   - Sequential invoice numbering: `INV-2026-XXXXX`.
   - Full installment payment tracking with overpayment prevention.
   - Sale cancellation with automatic stock restoration.
   - Printable sales invoice.

4. **Finance & Accounting (Owner Only)**:
   - True accounting formulas:
     - $\text{Revenue} = \sum \text{Completed Sales}$
     - $\text{COGS} = \sum (\text{item.cost\_price} \times \text{item.quantity})$
     - $\text{Gross Profit} = \text{Revenue} - \text{COGS}$
     - $\text{Operating Expenses} = \sum \text{Expenses}$
     - $\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses}$
   - Capital investments tracked separately from revenue.
   - Operating expenses categorized (Rent, Electricity, Salaries, Internet, Ads, Shipping, etc.).

5. **Reports**:
   - Printable statements for Sales, Profit & Loss, Inventory Valuation, and Customer Debtors.

6. **Settings**:
   - Business profile (Shop name, WhatsApp, phone, email, address, invoice footer).
   - Toggle negative stock selling.
   - Staff user management (Add staff, edit roles, change passwords).
   - Change user password.
   - Demo dataset reset button.

---

## PostgreSQL / Supabase Migration

A complete PostgreSQL migration file is included at:
`supabase/migrations/20260912_initial_schema.sql`

It includes:
- PostgreSQL DDL matching all tables
- Security-definer `has_role()` function
- Row Level Security (RLS) policies for Owner and Staff
