import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Eye, Edit2, Archive, Phone, Mail, FileText } from 'lucide-react';
import { api } from '../../api/client.js';
import { Customer } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.js';
import { CustomerFormModal } from './CustomerFormModal.js';
import { formatDate } from '../../utils/formatters.js';

export const CustomerListPage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToArchive, setCustomerToArchive] = useState<Customer | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Customer[]; pagination: { totalPages: number; total: number } }>(
        `/customers?search=${encodeURIComponent(search)}&page=${page}&limit=15`
      );
      setCustomers(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, page]);

  const handleArchiveConfirm = async () => {
    if (!customerToArchive) return;
    setArchiving(true);
    try {
      await api.delete(`/customers/${customerToArchive.id}`);
      setCustomerToArchive(null);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to archive customer.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage customer eyesight history, contact records, and accounts ({totalCount} total)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customers by name, phone number, or email..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Latest Rx Date</th>
                <th className="p-3.5 text-right">Total Purchases</th>
                <th className="p-3.5 text-right">Outstanding</th>
                <th className="p-3.5">Date Added</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-4 bg-slate-50/50" />
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="text-left font-bold text-slate-900 hover:text-brand-600"
                      >
                        {c.full_name}
                      </button>
                      {c.notes && (
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.notes}</p>
                      )}
                    </td>
                    <td className="p-3.5 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <Mail className="w-3 h-3" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {c.latest_prescription_date ? (
                        <span className="inline-flex items-center gap-1 font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                          <FileText className="w-3 h-3" />
                          {formatDate(c.latest_prescription_date)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-800">
                      <CurrencyDisplay amount={c.total_purchases} />
                    </td>
                    <td className="p-3.5 text-right font-bold">
                      {(c.outstanding_balance || 0) > 0 ? (
                        <span className="text-rose-600">
                          <CurrencyDisplay amount={c.outstanding_balance} />
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Rs. 0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500">{formatDate(c.created_at)}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/customers/${c.id}`)}
                          title="View Profile & Rx History"
                          className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setIsFormOpen(true);
                          }}
                          title="Edit Customer"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCustomerToArchive(c)}
                          title="Archive Customer"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* Customer Create/Edit Modal */}
      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        customerToEdit={editingCustomer}
        onSuccess={() => fetchCustomers()}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!customerToArchive}
        title="Archive Customer?"
        message={`Are you sure you want to archive "${customerToArchive?.full_name}"? Their past sales, invoices, and prescription history will remain safe.`}
        confirmLabel="Archive Customer"
        variant="warning"
        isLoading={archiving}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setCustomerToArchive(null)}
      />
    </div>
  );
};
