import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';
import { getDateBounds } from './finance.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate);

// Sales Report
reportsRouter.get('/sales', (req, res) => {
  const filter = (req.query.period as string) || 'month';
  const dateFrom = req.query.date_from as string;
  const dateTo = req.query.date_to as string;

  const { start, end } = getDateBounds(filter, dateFrom, dateTo);

  const summary = db.prepare(`
    SELECT 
      COUNT(*) AS total_sales,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN gross_total ELSE 0 END), 0) AS gross_sales,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN discount ELSE 0 END), 0) AS total_discounts,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN total ELSE 0 END), 0) AS net_sales,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN amount_paid ELSE 0 END), 0) AS amount_collected,
      COALESCE(SUM(CASE WHEN status != 'Cancelled' THEN balance ELSE 0 END), 0) AS outstanding,
      COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_sales_count,
      COALESCE(SUM(CASE WHEN status = 'Cancelled' THEN total ELSE 0 END), 0) AS cancelled_sales_amount
    FROM sales
    WHERE sale_date >= ? AND sale_date <= ?
  `).get(start, end) as any;

  const salesList = db.prepare(`
    SELECT 
      s.id,
      s.invoice_number,
      s.sale_date,
      s.gross_total,
      s.discount,
      s.total,
      s.amount_paid,
      s.balance,
      s.payment_status,
      s.status,
      s.cancelled_at,
      s.cancelled_by,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      prof.full_name AS created_by_name,
      canc.full_name AS cancelled_by_name
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN profiles prof ON s.created_by = prof.id
    LEFT JOIN profiles canc ON s.cancelled_by = canc.id
    WHERE s.sale_date >= ? AND s.sale_date <= ?
    ORDER BY s.sale_date DESC, s.created_at DESC
  `).all(start, end);

  res.json({
    period: { filter, start, end },
    summary,
    sales: salesList
  });
});

// Profit Report (Owner Only)
reportsRouter.get('/profit', requireOwner, (req, res) => {
  const filter = (req.query.period as string) || 'month';
  const dateFrom = req.query.date_from as string;
  const dateTo = req.query.date_to as string;

  const { start, end } = getDateBounds(filter, dateFrom, dateTo);

  const revenueRes = db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS sales_count
    FROM sales
    WHERE sale_date >= ? AND sale_date <= ? AND status != 'Cancelled'
  `).get(start, end) as any;

  const cogsRes = db.prepare(`
    SELECT COALESCE(SUM(si.cost_price * si.quantity), 0) AS cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.sale_date >= ? AND s.sale_date <= ? AND s.status != 'Cancelled'
  `).get(start, end) as any;

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total_expenses
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(start, end) as any;

  const revenue = revenueRes.revenue;
  const cogs = cogsRes.cogs;
  const grossProfit = revenue - cogs;
  const expenses = expensesRes.total_expenses;
  const netProfit = grossProfit - expenses;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : '0.00';

  const expensesBreakdown = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) as count
    FROM expenses
    WHERE date >= ? AND date <= ?
    GROUP BY category
    ORDER BY total_amount DESC
  `).all(start, end);

  res.json({
    period: { filter, start, end },
    summary: {
      revenue,
      cogs,
      gross_profit: grossProfit,
      expenses,
      net_profit: netProfit,
      profit_margin_pct: profitMargin,
      sales_count: revenueRes.sales_count
    },
    expenses_breakdown: expensesBreakdown
  });
});

// Inventory Report
reportsRouter.get('/inventory', (req, res) => {
  const isOwner = req.user?.role === 'owner';

  const products = db.prepare(`
    SELECT 
      id,
      brand,
      model,
      sku,
      product_type,
      cost_price,
      selling_price,
      quantity,
      low_stock_threshold,
      supplier,
      (quantity * cost_price) AS stock_cost_value,
      (quantity * selling_price) AS stock_retail_value
    FROM products
    WHERE active = 1
    ORDER BY product_type ASC, brand ASC, model ASC
  `).all();

  const totalUnits = products.reduce((s: number, p: any) => s + p.quantity, 0);
  const totalRetail = products.reduce((s: number, p: any) => s + p.stock_retail_value, 0);
  const totalCost = isOwner ? products.reduce((s: number, p: any) => s + p.stock_cost_value, 0) : null;

  // Mask cost if staff
  const sanitizedProducts = products.map((p: any) => {
    if (!isOwner) {
      return {
        ...p,
        cost_price: null,
        stock_cost_value: null
      };
    }
    return p;
  });

  res.json({
    summary: {
      total_products: products.length,
      total_units: totalUnits,
      total_stock_retail_value: totalRetail,
      total_stock_cost_value: totalCost
    },
    products: sanitizedProducts
  });
});

// Customer Balance Report
reportsRouter.get('/customer-balances', (req, res) => {
  const debtors = db.prepare(`
    SELECT 
      c.id,
      c.full_name,
      c.phone,
      c.email,
      COALESCE(SUM(s.total), 0) AS total_sales,
      COALESCE(SUM(s.amount_paid), 0) AS total_paid,
      COALESCE(SUM(s.balance), 0) AS outstanding,
      COUNT(s.id) AS orders_count,
      MAX(s.sale_date) AS last_sale_date
    FROM customers c
    JOIN sales s ON c.id = s.customer_id AND s.status != 'Cancelled'
    GROUP BY c.id
    HAVING outstanding > 0
    ORDER BY outstanding DESC
  `).all();

  const totalOutstanding = debtors.reduce((sum: number, c: any) => sum + c.outstanding, 0);

  res.json({
    summary: {
      debtors_count: debtors.length,
      total_outstanding: totalOutstanding
    },
    customers: debtors
  });
});
