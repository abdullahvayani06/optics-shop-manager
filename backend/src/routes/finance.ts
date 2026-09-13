import { Router } from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';

export const financeRouter = Router();

// Strictly protect all financial reports to Owner only
financeRouter.use(authenticate, requireOwner);

// Helper to compute date bounds based on filter
export function getDateBounds(filter: string, dateFrom?: string, dateTo?: string): { start: string; end: string } {
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  if (filter === 'custom' && dateFrom && dateTo) {
    return { start: dateFrom, end: dateTo };
  }

  if (filter === 'today') {
    return { start: todayStr, end: todayStr };
  }

  if (filter === 'week') {
    // Current week starting Monday
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return { start: monday.toISOString().substring(0, 10), end: todayStr };
  }

  if (filter === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
    return { start: startOfMonth, end: todayStr };
  }

  if (filter === 'last_month') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);
    return { start: startOfLastMonth, end: endOfLastMonth };
  }

  if (filter === 'year') {
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().substring(0, 10);
    return { start: startOfYear, end: todayStr };
  }

  // Default: All time or current year
  return { start: '2000-01-01', end: '2099-12-31' };
}

// Financial summary and profit calculation
financeRouter.get('/overview', (req, res) => {
  const filter = (req.query.period as string) || 'month';
  const dateFrom = req.query.date_from as string;
  const dateTo = req.query.date_to as string;

  const { start, end } = getDateBounds(filter, dateFrom, dateTo);

  // 1. Revenue: Total completed valid sales in period (excluding Cancelled)
  const revenueRes = db.prepare(`
    SELECT 
      COALESCE(SUM(total), 0) AS total_revenue,
      COALESCE(SUM(gross_total), 0) AS total_gross_sales,
      COALESCE(SUM(discount), 0) AS total_discounts,
      COALESCE(SUM(amount_paid), 0) AS total_collected,
      COALESCE(SUM(balance), 0) AS period_unpaid_balance,
      COUNT(*) AS total_sales_count
    FROM sales
    WHERE status != 'Cancelled' AND sale_date >= ? AND sale_date <= ?
  `).get(start, end) as any;

  // 2. Cost of Goods Sold (COGS): Sum of cost_price * quantity for items sold in period (excluding Cancelled)
  const cogsRes = db.prepare(`
    SELECT COALESCE(SUM(si.cost_price * si.quantity), 0) AS total_cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'Cancelled' AND s.sale_date >= ? AND s.sale_date <= ?
  `).get(start, end) as any;

  // 3. Operating Expenses in period
  const expensesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total_expenses, COUNT(*) AS expense_count
    FROM expenses
    WHERE date >= ? AND date <= ?
  `).get(start, end) as any;

  // 4. Overall Outstanding balances (all time, excluding Cancelled)
  const totalOutstandingRes = db.prepare(`
    SELECT COALESCE(SUM(balance), 0) AS all_time_outstanding
    FROM sales
    WHERE status != 'Cancelled'
  `).get() as any;

  // 5. Stock Valuation (current inventory)
  const stockValuationRes = db.prepare(`
    SELECT 
      COALESCE(SUM(quantity * cost_price), 0) AS total_stock_cost_value,
      COALESCE(SUM(quantity * selling_price), 0) AS total_stock_retail_value,
      COALESCE(SUM(quantity), 0) AS total_stock_units,
      COUNT(*) AS total_products_count,
      SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_count,
      SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) AS out_of_stock_count
    FROM products
    WHERE active = 1
  `).get() as any;

  // 6. Investments
  const investmentsRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total_capital_invested, COUNT(*) AS count
    FROM investments
  `).get() as any;

  // Calculations
  const revenue = revenueRes.total_revenue;
  const cogs = cogsRes.total_cogs;
  const grossProfit = revenue - cogs;
  const operatingExpenses = expensesRes.total_expenses;
  const netProfit = grossProfit - operatingExpenses;
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : '0.00';

  // 7. Category sales breakdown (excluding Cancelled)
  const categorySales = db.prepare(`
    SELECT 
      p.product_type,
      COALESCE(SUM(si.subtotal), 0) AS total_amount,
      COALESCE(SUM(si.quantity), 0) AS total_units
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN sales s ON si.sale_id = s.id
    WHERE s.status != 'Cancelled' AND s.sale_date >= ? AND s.sale_date <= ?
    GROUP BY p.product_type
  `).all(start, end);

  // 8. Time series for charts: daily or monthly depending on period (excluding Cancelled)
  const timeSeries = db.prepare(`
    SELECT 
      s.sale_date AS date_key,
      COALESCE(SUM(s.total), 0) AS revenue,
      COALESCE(SUM(
        (SELECT SUM(si.cost_price * si.quantity) FROM sale_items si WHERE si.sale_id = s.id)
      ), 0) AS cogs,
      COALESCE((
        SELECT SUM(e.amount) FROM expenses e WHERE e.date = s.sale_date
      ), 0) AS daily_expenses
    FROM sales s
    WHERE s.status != 'Cancelled' AND s.sale_date >= ? AND s.sale_date <= ?
    GROUP BY s.sale_date
    ORDER BY s.sale_date ASC
  `).all(start, end).map((row: any) => {
    const gross = row.revenue - row.cogs;
    const net = gross - row.daily_expenses;
    return {
      date: row.date_key,
      revenue: row.revenue,
      cogs: row.cogs,
      gross_profit: gross,
      expenses: row.daily_expenses,
      net_profit: net
    };
  });

  res.json({
    period: {
      filter,
      start,
      end
    },
    metrics: {
      revenue,
      gross_sales: revenueRes.total_gross_sales,
      discounts: revenueRes.total_discounts,
      cogs,
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      net_profit: netProfit,
      profit_margin_pct: profitMargin,
      amount_collected: revenueRes.total_collected,
      all_time_outstanding: totalOutstandingRes.all_time_outstanding,
      period_unpaid_balance: revenueRes.period_unpaid_balance,
      sales_count: revenueRes.total_sales_count,
      stock_value: stockValuationRes.total_stock_cost_value,
      stock_retail_value: stockValuationRes.total_stock_retail_value,
      stock_units: stockValuationRes.total_stock_units,
      products_count: stockValuationRes.total_products_count,
      low_stock_count: stockValuationRes.low_stock_count,
      out_of_stock_count: stockValuationRes.out_of_stock_count,
      capital_invested: investmentsRes.total_capital_invested
    },
    category_sales: categorySales,
    time_series: timeSeries
  });
});
