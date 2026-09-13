import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Receipt, 
  Landmark, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit2, 
  PieChart as PieIcon,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Expense, Investment, ExpenseCategory, InvestmentType } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'investments'>('overview');

  // Overview State
  const [period, setPeriod] = useState<string>('month');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Expenses State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpenseCat, setSelectedExpenseCat] = useState<string>('All');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{
    id?: string;
    category: ExpenseCategory;
    amount: string;
    description: string;
    date: string;
    payment_method: string;
  }>({
    category: 'Rent',
    amount: '',
    description: '',
    date: new Date().toISOString().substring(0, 10),
    payment_method: 'Bank Transfer',
  });
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Investments State
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [investmentForm, setInvestmentForm] = useState<{
    id?: string;
    date: string;
    amount: string;
    investment_type: InvestmentType;
    description: string;
    notes: string;
  }>({
    date: new Date().toISOString().substring(0, 10),
    amount: '',
    investment_type: 'Initial Capital',
    description: '',
    notes: '',
  });
  const [deletingInvestmentId, setDeletingInvestmentId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Overview Data
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get<any>(`/finance/overview?period=${period}`);
      setOverviewData(res);
    } catch (err) {
      console.error('Failed to load financial overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load Expenses
  const fetchExpenses = async () => {
    try {
      const query = selectedExpenseCat !== 'All' ? `?category=${selectedExpenseCat}` : '';
      const res = await api.get<{ data: Expense[] }>(`/expenses${query}`);
      setExpenses(res.data);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  };

  // Load Investments
  const fetchInvestments = async () => {
    try {
      const res = await api.get<{ data: Investment[] }>('/investments');
      setInvestments(res.data);
    } catch (err) {
      console.error('Failed to load investments:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'expenses') fetchExpenses();
    if (activeTab === 'investments') fetchInvestments();
  }, [activeTab, period, selectedExpenseCat]);

  // Handle Expense Submit
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Valid expense amount is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (expenseForm.id) {
        await api.put(`/expenses/${expenseForm.id}`, expenseForm);
      } else {
        await api.post('/expenses', expenseForm);
      }
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category: 'Rent',
        amount: '',
        description: '',
        date: new Date().toISOString().substring(0, 10),
        payment_method: 'Bank Transfer',
      });
      fetchExpenses();
      fetchOverview();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Expense Delete
  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    try {
      await api.delete(`/expenses/${deletingExpenseId}`);
      setDeletingExpenseId(null);
      fetchExpenses();
      fetchOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense.');
    }
  };

  // Handle Investment Submit
  const handleInvestmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(investmentForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Valid investment amount is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (investmentForm.id) {
        await api.put(`/investments/${investmentForm.id}`, investmentForm);
      } else {
        await api.post('/investments', investmentForm);
      }
      setIsInvestmentModalOpen(false);
      setInvestmentForm({
        date: new Date().toISOString().substring(0, 10),
        amount: '',
        investment_type: 'Initial Capital',
        description: '',
        notes: '',
      });
      fetchInvestments();
      fetchOverview();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save investment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Investment Delete
  const handleDeleteInvestment = async () => {
    if (!deletingInvestmentId) return;
    try {
      await api.delete(`/investments/${deletingInvestmentId}`);
      setDeletingInvestmentId(null);
      fetchInvestments();
      fetchOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to delete investment.');
    }
  };

  const EXPENSE_CATEGORIES: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Salaries',
    'Internet',
    'Advertising',
    'Packaging',
    'Shipping',
    'Transportation',
    'Maintenance',
    'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financial Management & Accounting
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Owner Only • Revenue, COGS, Net Profit, Operating Expenses & Capital Investments
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Profit & Accounting
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'expenses'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Operating Expenses
          </button>
          <button
            onClick={() => setActiveTab('investments')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'investments'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Capital & Investments
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & PROFIT REPORT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period Pills */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Calculation Period
            </span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'year', label: 'This Year' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    period === p.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Income Statement Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                1. Net Sales Revenue
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.revenue} />
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Completed sales after discounts ({overviewData?.metrics?.sales_count || 0} orders)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                2. Cost of Goods Sold (COGS)
              </span>
              <h3 className="text-2xl font-bold text-amber-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.cogs} />
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Cost price of all sold eyewear units</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                3. Gross Profit
              </span>
              <h3 className="text-2xl font-bold text-sky-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.gross_profit} />
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Formula: Revenue minus COGS</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                4. Operating Expenses
              </span>
              <h3 className="text-2xl font-bold text-rose-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.operating_expenses} />
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Rent, electricity, salaries, marketing</p>
            </div>
          </div>

          {/* Net Profit & Profit Margin Banner */}
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                5. Final Accounting Result
              </span>
              <h2 className="text-3xl font-black mt-1 text-slate-900 flex items-center gap-3">
                <span>Net Profit:</span>
                <span
                  className={
                    (overviewData?.metrics?.net_profit || 0) >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }
                >
                  <CurrencyDisplay amount={overviewData?.metrics?.net_profit} />
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Net Profit = Gross Profit (Rs.{' '}
                {(overviewData?.metrics?.gross_profit || 0).toLocaleString()}) - Operating Expenses (Rs.{' '}
                {(overviewData?.metrics?.operating_expenses || 0).toLocaleString()})
              </p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
              <span className="text-xs font-semibold text-slate-500">Net Profit Margin</span>
              <p className="text-3xl font-black text-brand-600 mt-1">
                {overviewData?.metrics?.profit_margin_pct || '0.00'}%
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Profit per rupee of revenue</p>
            </div>
          </div>

          {/* Balance Sheet & Receivables Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Cash Collected</span>
              <h4 className="text-xl font-bold text-emerald-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.amount_collected} />
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Payments received against period orders
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Customer Receivables (Pending)
              </span>
              <h4 className="text-xl font-bold text-amber-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.all_time_outstanding} />
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Outstanding unpaid balance owed to shop
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Total Capital Invested
              </span>
              <h4 className="text-xl font-bold text-purple-600 mt-2">
                <CurrencyDisplay amount={overviewData?.metrics?.capital_invested} />
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Capital contributions (NOT counted as sales revenue)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATING EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', ...EXPENSE_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedExpenseCat(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedExpenseCat === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setExpenseForm({
                  category: 'Rent',
                  amount: '',
                  description: '',
                  date: new Date().toISOString().substring(0, 10),
                  payment_method: 'Bank Transfer',
                });
                setIsExpenseModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5 text-right">Amount (PKR)</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No operating expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{exp.description || '-'}</td>
                      <td className="p-3.5 text-slate-500">{formatDate(exp.date)}</td>
                      <td className="p-3.5 text-slate-600 font-medium">{exp.payment_method}</td>
                      <td className="p-3.5 text-right font-bold text-rose-600">
                        <CurrencyDisplay amount={exp.amount} />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setExpenseForm({
                                id: exp.id,
                                category: exp.category as ExpenseCategory,
                                amount: String(exp.amount),
                                description: exp.description || '',
                                date: exp.date,
                                payment_method: exp.payment_method,
                              });
                              setIsExpenseModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingExpenseId(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVESTMENTS & CAPITAL */}
      {activeTab === 'investments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Capital & Investments</h3>
              <p className="text-xs text-slate-500">
                Rule 7 Enforced: Investments are balance-sheet capital, NOT counted as sales revenue.
              </p>
            </div>
            <button
              onClick={() => {
                setInvestmentForm({
                  date: new Date().toISOString().substring(0, 10),
                  amount: '',
                  investment_type: 'Initial Capital',
                  description: '',
                  notes: '',
                });
                setIsInvestmentModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Record Capital Investment</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Investment Type</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Purpose / Description</th>
                  <th className="p-3.5">Notes</th>
                  <th className="p-3.5 text-right">Amount Invested (PKR)</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {investments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      No capital investments recorded yet.
                    </td>
                  </tr>
                ) : (
                  investments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                          {inv.investment_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDate(inv.date)}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{inv.description || '-'}</td>
                      <td className="p-3.5 text-slate-400">{inv.notes || '-'}</td>
                      <td className="p-3.5 text-right font-bold text-purple-700">
                        <CurrencyDisplay amount={inv.amount} />
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setInvestmentForm({
                                id: inv.id,
                                date: inv.date,
                                amount: String(inv.amount),
                                investment_type: inv.investment_type,
                                description: inv.description || '',
                                notes: inv.notes || '',
                              });
                              setIsInvestmentModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingInvestmentId(inv.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {expenseForm.id ? 'Edit Operating Expense' : 'Record Operating Expense'}
            </h3>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {formError}
              </div>
            )}
            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Category</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount (PKR Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="e.g. 85000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Vendor</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. LESCO electricity bill / Showroom rent"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Investment Modal */}
      {isInvestmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {investmentForm.id ? 'Edit Capital Investment' : 'Record Capital Contribution'}
            </h3>
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {formError}
              </div>
            )}
            <form onSubmit={handleInvestmentSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investment Type</label>
                <select
                  value={investmentForm.investment_type}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, investment_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="Initial Capital">Initial Capital</option>
                  <option value="Additional Capital">Additional Capital</option>
                  <option value="Owner Contribution">Owner Contribution</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount (PKR Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={investmentForm.amount}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, amount: e.target.value })}
                  placeholder="e.g. 500000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investment Date</label>
                <input
                  type="date"
                  required
                  value={investmentForm.date}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Purpose / Description</label>
                <input
                  type="text"
                  value={investmentForm.description}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, description: e.target.value })}
                  placeholder="e.g. Lens edging machine purchase"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={investmentForm.notes}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, notes: e.target.value })}
                  placeholder="Additional capital accounts notes..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInvestmentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={!!deletingExpenseId}
        title="Delete Expense Record?"
        message="Are you sure you want to delete this operating expense entry? This will update the net profit calculation."
        confirmLabel="Delete Expense"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeletingExpenseId(null)}
      />

      {/* Delete Investment Dialog */}
      <ConfirmDialog
        isOpen={!!deletingInvestmentId}
        title="Delete Capital Investment?"
        message="Are you sure you want to delete this capital investment record?"
        confirmLabel="Delete Investment"
        variant="danger"
        onConfirm={handleDeleteInvestment}
        onCancel={() => setDeletingInvestmentId(null)}
      />
    </div>
  );
};
