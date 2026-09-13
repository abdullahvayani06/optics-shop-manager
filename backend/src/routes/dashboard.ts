import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { getDateBounds } from './finance.js';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/', (req, res) => {
  const isOwner = req.user?.role === 'owner';
  const filter = (req.query.period as string) || 'month';
  const dateFrom = req.query.date_from as string;
  const dateTo = req.query.date_to as string;

  const { start, end } = getDateBounds(filter, dateFrom, dateTo);
  const todayStr = new Date().toISOString().substring(0, 10);

  // Common metrics
  const totalCustomers = (db.prepare('SELECT COUNT(*) as count FROM customers WHERE active = 1').get() as any)?.count || 0;
  const todaySalesCount = (db.prepare("SELECT COUNT(*) as count FROM sales WHERE sale_date = ? AND status != 'Cancelled'").get(todayStr) as any)?.count || 0;
  const totalProducts = (db.prepare('SELECT COUNT(*) as count FROM products WHERE active = 1').get() as any)?.count || 0;

  // Low stock items (both owner & staff need this for reordering)
  const lowStockItems = db.prepare(`
    SELECT id, product_type, brand, model, sku, quantity, low_stock_threshold
    FROM products
    WHERE active = 1 AND quantity <= low_stock_threshold
    ORDER BY quantity ASC
    LIMIT 10
  `).all();

  // Recent operational activity
  const recentSales = db.prepare(`
    SELECT 
      'sale' AS activity_type,
      s.id,
      s.invoice_number,
      s.total,
      s.status,
      s.sale_date,
      s.created_at,
      c.full_name AS customer_name,
      prof.full_name AS staff_name
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN profiles prof ON s.created_by = prof.id
    ORDER BY s.created_at DESC
    LIMIT 6
  `).all();

  const recentPayments = db.prepare(`
    SELECT 
      'payment' AS activity_type,
      pay.id,
      pay.amount,
      pay.payment_method,
      pay.payment_date,
      pay.created_at,
      s.invoice_number,
      c.full_name AS customer_name,
      prof.full_name AS staff_name
    FROM payments pay
    JOIN sales s ON pay.sale_id = s.id
    JOIN customers c ON pay.customer_id = c.id
    LEFT JOIN profiles prof ON pay.created_by = prof.id
    ORDER BY pay.created_at DESC
    LIMIT 6
  `).all();

  const recentCustomers = db.prepare(`
    SELECT 
      'customer' AS activity_type,
      c.id,
      c.full_name,
      c.phone,
      c.created_at
    FROM customers c
    ORDER BY c.created_at DESC
    LIMIT 6
  `).all();

  // If STAFF: return only operational metrics
  if (!isOwner) {
    return res.json({
      role: 'staff',
      period: { filter, start, end },
      metrics: {
        total_customers: totalCustomers,
        today_sales_count: todaySalesCount,
        total_products: totalProducts,
        low_stock_count: lowStockItems.length
      },
      low_stock_items: lowStockItems,
      recent_activity: {
        sales: recentSales.map((s: any) => ({
          id: s.id,
          title: `Sale ${s.invoice_number} ${s.status === 'Cancelled' ? '(Cancelled)' : 'recorded'}`,
          subtitle: `${s.customer_name} • By ${s.staff_name || 'Staff'}`,
          date: s.created_at
        })),
        payments: recentPayments.map((p: any) => ({
          id: p.id,
          title: `Payment for ${p.invoice_number}`,
          subtitle: `${p.customer_name} • ${p.payment_method}`,
          date: p.created_at
        })),
        customers: recentCustomers.map((c: any) => ({
          id: c.id,
          title: `Customer ${c.full_name} added`,
          subtitle: c.phone,
          date: c.created_at
        }))
      }
    });
  }

  // IF OWNER: Calculate comprehensive financial metrics (strictly excluding Cancelled sales)
  const revenueRes = db.prepare(`
    SELECT 
      COALESCE(SUM(total), 0) AS total_revenue,
      COALESCE(SUM(balance), 0) AS period_outstanding,
      COUNT(*) AS total_sales_count
    FROM sales
    WHERE sale_date >= ? AND sale_date <= ? AND status != 'Cancelled'
  `).get(start, end) as any;

  const cogsRes = db.prepare(`
    SELECT COALESCE(SUM(si.cost_price * si.quantity), 0) AS total_cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.sale_date >= ? AND s.sale_date <= ? AND s.status != 'Cancelled'
  `).get(start, end) as any;

  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total_expenses
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(start, end) as any;

  const allTimeOutstandingRes = db.prepare(`
    SELECT COALESCE(SUM(balance), 0) AS all_time_outstanding
    FROM sales
    WHERE status != 'Cancelled'
  `).get() as any;

  const stockValuationRes = db.prepare(`
    SELECT 
      COALESCE(SUM(quantity * cost_price), 0) AS stock_value,
      COALESCE(SUM(quantity), 0) AS stock_units,
      COUNT(*) AS products_count
    FROM products
    WHERE active = 1
  `).get() as any;

  const revenue = revenueRes.total_revenue;
  const cogs = cogsRes.total_cogs;
  const grossProfit = revenue - cogs;
  const expenses = expensesRes.total_expenses;
  const netProfit = grossProfit - expenses;

  // Customers with outstanding balance (Excluding cancelled sales)
  const outstandingDebtors = db.prepare(`
    SELECT 
      c.id AS customer_id,
      c.full_name,
      c.phone,
      s.id AS sale_id,
      s.invoice_number,
      s.sale_date,
      s.total,
      s.amount_paid,
      s.balance
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    WHERE s.balance > 0 AND s.status != 'Cancelled'
    ORDER BY s.balance DESC
    LIMIT 10
  `).all();

  // Category sales (Excluding cancelled sales)
  const categorySales = db.prepare(`
    SELECT 
      p.product_type,
      COALESCE(SUM(si.subtotal), 0) AS amount,
      COALESCE(SUM(si.quantity), 0) AS units
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.sale_date >= ? AND s.sale_date <= ? AND s.status != 'Cancelled'
    GROUP BY p.product_type
  `).all(start, end);

  // Time-series for sales & profit charts (Excluding cancelled sales)
  const timeSeries = db.prepare(`
    SELECT 
      s.sale_date AS date,
      COALESCE(SUM(s.total), 0) AS sales,
      COALESCE(SUM((
        SELECT SUM(si.cost_price * si.quantity) FROM sale_items si WHERE si.sale_id = s.id
      )), 0) AS cogs,
      COALESCE((
        SELECT SUM(e.amount) FROM expenses e WHERE e.date = s.sale_date
      ), 0) AS expenses
    FROM sales s
    WHERE s.sale_date >= ? AND s.sale_date <= ? AND s.status != 'Cancelled'
    GROUP BY s.sale_date
    ORDER BY s.sale_date ASC
  `).all(start, end).map((row: any) => ({
    date: row.date,
    sales: row.sales,
    profit: row.sales - row.cogs - row.expenses
  }));

  return res.json({
    role: 'owner',
    period: { filter, start, end },
    metrics: {
      total_sales: revenue,
      net_profit: netProfit,
      outstanding_balance: allTimeOutstandingRes.all_time_outstanding,
      stock_value: stockValuationRes.stock_value,
      total_customers: totalCustomers,
      today_sales_count: todaySalesCount,
      total_products: totalProducts,
      low_stock_count: lowStockItems.length
    },
    charts: {
      time_series: timeSeries,
      category_sales: categorySales
    },
    outstanding_debtors: outstandingDebtors,
    low_stock_items: lowStockItems,
    recent_activity: {
      sales: recentSales.map((s: any) => ({
        id: s.id,
        title: `Sale ${s.invoice_number} created`,
        amount: s.total,
        subtitle: `${s.customer_name} • By ${s.staff_name || 'Owner'}`,
        date: s.created_at
      })),
      payments: recentPayments.map((p: any) => ({
        id: p.id,
        title: `Payment received for ${p.invoice_number}`,
        amount: p.amount,
        subtitle: `${p.customer_name} • ${p.payment_method}`,
        date: p.created_at
      })),
      customers: recentCustomers.map((c: any) => ({
        id: c.id,
        title: `Customer ${c.full_name} registered`,
        subtitle: c.phone,
        date: c.created_at
      }))
    }
  });
});
