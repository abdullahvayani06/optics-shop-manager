import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  Eye, 
  Calendar, 
  Plus, 
  Filter, 
  DollarSign, 
  CreditCard, 
  UserCheck 
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Sale, PaymentStatus } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { Badge } from '../../components/common/Badge.js';
import { formatDate } from '../../utils/formatters.js';

export const SalesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}&page=${page}&limit=15`;
      if (paymentStatus !== 'All') {
        query += `&payment_status=${paymentStatus}`;
      }
      if (statusFilter !== 'All') {
        query += `&status=${statusFilter}`;
      }
      if (dateFrom) {
        query += `&date_from=${dateFrom}`;
      }
      if (dateTo) {
        query += `&date_to=${dateTo}`;
      }

      const res = await api.get<{ data: Sale[]; pagination: { totalPages: number; total: number } }>(
        `/sales${query}`
      );
      setSales(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, paymentStatus, statusFilter, dateFrom, dateTo, page]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage customer orders, installments, and optical invoicing ({totalCount} total)
          </p>
        </div>
        <button
          onClick={() => navigate('/sales/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Sale</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice # or customer..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Order Status Dropdown (Active/Cancelled) */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed Only</option>
              <option value="Cancelled">Cancelled Only</option>
            </select>
          </div>

          {/* Payment Status Dropdown */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-700"
            >
              <option value="All">All Payments</option>
              <option value="Paid">Paid Only</option>
              <option value="Partial">Partial Dues</option>
              <option value="Unpaid">Unpaid Only</option>
            </select>
          </div>

          {/* Date range shortcut */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700"
              title="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 px-2 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-700"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Sale Date</th>
                <th className="p-3.5 text-right">Net Total</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5 text-right">Remaining Balance</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Issued By</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="p-4 bg-slate-50/50" />
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const isCancelled = s.status === 'Cancelled';
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'bg-rose-50/20' : ''}`}>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => navigate(`/sales/${s.id}`)}
                          className="hover:text-brand-600"
                        >
                          {s.invoice_number}
                        </button>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => navigate(`/customers/${s.customer_id}`)}
                          className="font-bold text-slate-900 hover:text-brand-600 text-left"
                        >
                          {s.customer_name}
                        </button>
                        <p className="text-[11px] text-slate-400">{s.customer_phone}</p>
                      </td>
                      <td className="p-3.5 text-slate-600">{formatDate(s.sale_date)}</td>
                      <td className="p-3.5 text-right font-bold">
                        <span className={isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}>
                          <CurrencyDisplay amount={s.total} />
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-medium text-emerald-600">
                        <CurrencyDisplay amount={s.amount_paid} />
                      </td>
                      <td className="p-3.5 text-right font-bold">
                        {isCancelled ? (
                          <span className="text-slate-400 font-normal">Rs. 0</span>
                        ) : s.balance > 0 ? (
                          <span className="text-rose-600">
                            <CurrencyDisplay amount={s.balance} />
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Rs. 0</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isCancelled ? (
                          <Badge variant="danger">Cancelled</Badge>
                        ) : (
                          <Badge
                            variant={
                              s.payment_status === 'Paid'
                                ? 'success'
                                : s.payment_status === 'Partial'
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {s.payment_status}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {s.created_by_name || 'Staff'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => navigate(`/sales/${s.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isCancelled ? 'View' : 'View / Pay'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs font-medium border border-slate-300 bg-white rounded-md disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs font-medium border border-slate-300 bg-white rounded-md disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
