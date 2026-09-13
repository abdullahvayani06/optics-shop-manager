import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  FileText, 
  TrendingUp, 
  Boxes, 
  Users, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export const ReportsPage: React.FC = () => {
  const { role } = useAuth();
  const isOwner = role === 'owner';

  const [activeReport, setActiveReport] = useState<'sales' | 'profit' | 'inventory' | 'balances'>('sales');
  const [period, setPeriod] = useState<string>('month');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'sales') {
        const res = await api.get<any>(`/reports/sales?period=${period}`);
        setData(res);
      } else if (activeReport === 'profit' && isOwner) {
        const res = await api.get<any>(`/reports/profit?period=${period}`);
        setData(res);
      } else if (activeReport === 'inventory') {
        const res = await api.get<any>('/reports/inventory');
        setData(res);
      } else if (activeReport === 'balances') {
        const res = await api.get<any>('/reports/customer-balances');
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport, period]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit-ready sales, inventory, profit, and customer balance statements
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Report Selector Pills */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveReport('sales')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'sales'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sales Report
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveReport('profit')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeReport === 'profit'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Profit & Loss
            </button>
          )}
          <button
            onClick={() => setActiveReport('inventory')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'inventory'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Inventory Valuation
          </button>
          <button
            onClick={() => setActiveReport('balances')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeReport === 'balances'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Customer Debtors
          </button>
        </div>

        {(activeReport === 'sales' || activeReport === 'profit') && (
          <div className="flex items-center gap-1.5">
            {['today', 'week', 'month', 'last_month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize ${
                  period === p
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-2xs printable-card">
        {/* Print Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
              VisionOptics Pakistan
            </h2>
            <p className="text-xs text-slate-500">Official Management Statement</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase px-2.5 py-1 bg-slate-100 rounded text-slate-800">
              {activeReport.toUpperCase()} STATEMENT
            </span>
            <p className="text-[11px] text-slate-400 mt-1">Generated on {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Generating statement...
          </div>
        ) : (
          <>
            {/* 1. SALES REPORT */}
            {activeReport === 'sales' && data && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500">Active Sales Count:</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {(data.summary?.total_sales || 0) - (data.summary?.cancelled_sales_count || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Net Sales Revenue:</span>
                    <p className="text-lg font-bold text-brand-600 mt-1">
                      {formatCurrency(data.summary?.net_sales)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Amount Collected:</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">
                      {formatCurrency(data.summary?.amount_collected)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Unpaid Receivables:</span>
                    <p className="text-lg font-bold text-rose-600 mt-1">
                      {formatCurrency(data.summary?.outstanding)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Cancelled Sales:</span>
                    <p className="text-lg font-bold text-slate-400 mt-1">
                      {data.summary?.cancelled_sales_count || 0}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        ({formatCurrency(data.summary?.cancelled_sales_amount || 0)})
                      </span>
                    </p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5 text-right">Net Total</th>
                      <th className="p-2.5 text-right">Paid</th>
                      <th className="p-2.5 text-right">Balance</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.sales?.map((s: any) => {
                      const isCancelled = s.status === 'Cancelled';
                      return (
                        <tr key={s.id} className={isCancelled ? 'bg-rose-50/20' : ''}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{s.invoice_number}</td>
                          <td className="p-2.5 text-slate-600">{formatDate(s.sale_date)}</td>
                          <td className="p-2.5 font-medium">{s.customer_name}</td>
                          <td className="p-2.5 text-right font-bold">
                            <span className={isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}>
                              {formatCurrency(s.total)}
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-emerald-600">
                            {formatCurrency(s.amount_paid)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-rose-600">
                            {isCancelled ? <span className="text-slate-400 font-normal">Void</span> : formatCurrency(s.balance)}
                          </td>
                          <td className="p-2.5">
                            {isCancelled ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                                Cancelled
                              </span>
                            ) : (
                              <span>{s.payment_status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. PROFIT REPORT (Owner Only) */}
            {activeReport === 'profit' && data && (
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="font-semibold text-slate-700">1. Net Sales Revenue</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(data.summary?.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 text-amber-700">
                    <span>2. Cost of Goods Sold (COGS)</span>
                    <span className="font-bold">-{formatCurrency(data.summary?.cogs)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 font-bold text-sky-700 text-sm">
                    <span>3. Gross Profit (Revenue - COGS)</span>
                    <span>{formatCurrency(data.summary?.gross_profit)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200 text-rose-600">
                    <span>4. Operating Expenses (Rent, Bills, Salaries)</span>
                    <span className="font-bold">-{formatCurrency(data.summary?.expenses)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-base font-black border-t-2 border-slate-900">
                    <span>5. Net Profit</span>
                    <span
                      className={
                        (data.summary?.net_profit || 0) >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }
                    >
                      {formatCurrency(data.summary?.net_profit)}
                    </span>
                  </div>
                </div>

                {/* Operating Expenses Breakdown */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">
                    Expenses Itemization
                  </h4>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-center">Transactions</th>
                        <th className="p-2.5 text-right">Total (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expenses_breakdown?.map((e: any) => (
                        <tr key={e.category}>
                          <td className="p-2.5 font-bold text-slate-800">{e.category}</td>
                          <td className="p-2.5 text-center text-slate-500">{e.count}</td>
                          <td className="p-2.5 text-right font-bold text-rose-600">
                            {formatCurrency(e.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. INVENTORY REPORT */}
            {activeReport === 'inventory' && data && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500">Total Products:</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {data.summary?.total_products}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Units in Stock:</span>
                    <p className="text-lg font-bold text-brand-600 mt-1">
                      {data.summary?.total_units}
                    </p>
                  </div>
                  {isOwner && (
                    <div>
                      <span className="text-slate-500">Total Stock Cost Value:</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {formatCurrency(data.summary?.total_stock_cost_value)}
                      </p>
                    </div>
                  )}
                </div>

                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Product & Model</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">SKU</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      {isOwner && <th className="p-2.5 text-right">Cost Price</th>}
                      <th className="p-2.5 text-right">Selling Price</th>
                      {isOwner && <th className="p-2.5 text-right">Stock Cost Value</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.products?.map((p: any) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-bold text-slate-900">
                          {p.brand} {p.model}
                        </td>
                        <td className="p-2.5 text-slate-600">{p.product_type}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">{p.sku}</td>
                        <td className="p-2.5 text-center font-bold text-slate-900">{p.quantity}</td>
                        {isOwner && (
                          <td className="p-2.5 text-right text-slate-600">
                            {formatCurrency(p.cost_price)}
                          </td>
                        )}
                        <td className="p-2.5 text-right font-medium">
                          {formatCurrency(p.selling_price)}
                        </td>
                        {isOwner && (
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatCurrency(p.stock_cost_value)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. CUSTOMER BALANCES REPORT */}
            {activeReport === 'balances' && data && (
              <div className="space-y-6">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-rose-700 font-semibold">Customers with Outstanding Dues:</span>
                    <p className="text-lg font-bold text-rose-900 mt-0.5">
                      {data.summary?.debtors_count || 0} Customers
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-rose-700 font-semibold">Total Outstanding Receivables:</span>
                    <p className="text-2xl font-black text-rose-600 mt-0.5">
                      {formatCurrency(data.summary?.total_outstanding)}
                    </p>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Customer Name</th>
                      <th className="p-2.5">Phone Number</th>
                      <th className="p-2.5 text-right">Total Purchases</th>
                      <th className="p-2.5 text-right">Total Paid</th>
                      <th className="p-2.5 text-right">Outstanding Balance</th>
                      <th className="p-2.5 text-center">Last Order Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.customers?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="p-2.5 font-bold text-slate-900">{c.full_name}</td>
                        <td className="p-2.5 text-slate-600">{c.phone}</td>
                        <td className="p-2.5 text-right text-slate-700 font-medium">
                          {formatCurrency(c.total_sales)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-600 font-medium">
                          {formatCurrency(c.total_paid)}
                        </td>
                        <td className="p-2.5 text-right font-black text-rose-600">
                          {formatCurrency(c.outstanding)}
                        </td>
                        <td className="p-2.5 text-center text-slate-500">
                          {formatDate(c.last_sale_date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
