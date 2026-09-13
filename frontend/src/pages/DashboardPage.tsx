import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Boxes, 
  Users, 
  ShoppingCart, 
  Package, 
  Clock, 
  ArrowUpRight,
  Filter,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { CurrencyDisplay } from '../components/common/CurrencyDisplay.js';
import { Badge } from '../components/common/Badge.js';
import { formatCurrency, formatRelativeTime, formatDate } from '../utils/formatters.js';

export const DashboardPage: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isOwner = role === 'owner';

  const [period, setPeriod] = useState<string>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `?period=${period}`;
      if (period === 'custom' && dateFrom && dateTo) {
        query += `&date_from=${dateFrom}&date_to=${dateTo}`;
      }
      const res = await api.get<any>(`/dashboard${query}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const handleCustomFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateFrom && dateTo) {
      fetchDashboard();
    }
  };

  const CATEGORY_COLORS = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isOwner ? 'Business Dashboard' : 'Optics Operations Hub'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isOwner
              ? 'Real-time financial performance, inventory valuation, and shop metrics'
              : 'Daily optical orders, customers, and inventory status'}
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                period === item.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker when Custom is chosen */}
      {period === 'custom' && (
        <form
          onSubmit={handleCustomFilterSubmit}
          className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Apply Range
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 p-5" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          {isOwner ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900">
                    <CurrencyDisplay amount={data?.metrics?.total_sales} />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Completed sales in period</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Net Profit
                  </span>
                  <div
                    className={`p-2 rounded-lg ${
                      (data?.metrics?.net_profit || 0) >= 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3
                    className={`text-2xl font-bold ${
                      (data?.metrics?.net_profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    <CurrencyDisplay amount={data?.metrics?.net_profit} />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Gross Profit minus Expenses</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Outstanding Balance
                  </span>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-amber-600">
                    <CurrencyDisplay amount={data?.metrics?.outstanding_balance} />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Unpaid customer receivables</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Stock Valuation
                  </span>
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <Boxes className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900">
                    <CurrencyDisplay amount={data?.metrics?.stock_value} />
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Total inventory at cost price</p>
                </div>
              </div>
            </div>
          ) : (
            /* Staff operational metric cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Customers
                  </span>
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {data?.metrics?.total_customers || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Registered clients</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Today's Sales
                  </span>
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-emerald-600">
                    {data?.metrics?.today_sales_count || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Invoices issued today</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Products
                  </span>
                  <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-slate-900">
                    {data?.metrics?.total_products || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">SKUs in catalog</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Low Stock Warnings
                  </span>
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-amber-600">
                    {data?.metrics?.low_stock_count || 0}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Products needing restock</p>
                </div>
              </div>
            </div>
          )}

          {/* Owner Charts: Sales & Profit Over Time + Sales by Product Category */}
          {isOwner && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales & Net Profit Timeline */}
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Sales & Profit Over Time</h3>
                    <p className="text-xs text-slate-500">Daily sales revenue vs. calculated net profit</p>
                  </div>
                </div>
                <div className="h-64">
                  {data?.charts?.time_series && data.charts.time_series.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.charts.time_series}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `Rs. ${val / 1000}k`} />
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(value), '']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          name="Sales (PKR)"
                          stroke="#0284c7"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          name="Net Profit (PKR)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      No sales data recorded for this period.
                    </div>
                  )}
                </div>
              </div>

              {/* Product Category Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Sales by Category</h3>
                <p className="text-xs text-slate-500 mb-4">Revenue share by optical type</p>
                <div className="h-44">
                  {data?.charts?.category_sales && data.charts.category_sales.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.charts.category_sales}
                          dataKey="amount"
                          nameKey="product_type"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {data.charts.category_sales.map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      No category data available
                    </div>
                  )}
                </div>
                {/* Category Legend */}
                <div className="mt-2 space-y-1.5">
                  {data?.charts?.category_sales?.map((cat: any, index: number) => (
                    <div key={cat.product_type} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-slate-600">{cat.product_type}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Outstanding Customer Balances & Low Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Outstanding Receivables (Owner only) */}
            {isOwner && (
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Outstanding Customer Balances</h3>
                    <p className="text-xs text-slate-500">Unpaid balances requiring follow-up</p>
                  </div>
                  <button
                    onClick={() => navigate('/sales')}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    View All <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                      <tr>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Invoice</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data?.outstanding_debtors && data.outstanding_debtors.length > 0 ? (
                        data.outstanding_debtors.map((debtor: any) => (
                          <tr key={debtor.sale_id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-semibold text-slate-900">
                              <button
                                onClick={() => navigate(`/customers/${debtor.customer_id}`)}
                                className="text-left hover:text-brand-600"
                              >
                                {debtor.full_name}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {debtor.phone}
                                </span>
                              </button>
                            </td>
                            <td className="p-3 text-slate-600 font-mono">{debtor.invoice_number}</td>
                            <td className="p-3 text-slate-500">{debtor.sale_date}</td>
                            <td className="p-3 text-right font-medium">{formatCurrency(debtor.total)}</td>
                            <td className="p-3 text-right text-emerald-600 font-medium">
                              {formatCurrency(debtor.amount_paid)}
                            </td>
                            <td className="p-3 text-right text-rose-600 font-bold">
                              {formatCurrency(debtor.balance)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => navigate(`/sales/${debtor.sale_id}`)}
                                className="px-2.5 py-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
                              >
                                Collect
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                            No customers currently have outstanding balances.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Low Stock Alerts (Visible to Both Owner & Staff) */}
            <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden ${!isOwner ? 'lg:col-span-2' : ''}`}>
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Low-Stock Warnings</h3>
                    <p className="text-xs text-slate-500">Products near or below reorder threshold</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/stock')}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  View Stock <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {data?.low_stock_items && data.low_stock_items.length > 0 ? (
                  data.low_stock_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-100 bg-amber-50/50"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {item.brand} {item.model}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {item.product_type} • SKU: {item.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.quantity === 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.quantity === 0 ? 'Out of stock' : `${item.quantity} remaining`}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Min threshold: {item.low_stock_threshold}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    All products are sufficiently stocked.
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent Shop Activity</h3>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {data?.recent_activity?.sales?.map((act: any) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-500">{act.subtitle}</p>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(act.date)}</span>
                    </div>
                    {act.amount && (
                      <span className="font-semibold text-slate-800">{formatCurrency(act.amount)}</span>
                    )}
                  </div>
                ))}
                {data?.recent_activity?.customers?.map((cust: any) => (
                  <div key={cust.id} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{cust.title}</p>
                      <p className="text-[11px] text-slate-500">{cust.subtitle}</p>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(cust.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
