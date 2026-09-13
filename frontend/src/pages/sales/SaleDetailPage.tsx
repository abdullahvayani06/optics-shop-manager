import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Printer, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  X,
  RotateCcw
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Sale, PaymentMethod } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { Badge } from '../../components/common/Badge.js';
import { PrintableInvoice } from '../../components/print/PrintableInvoice.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';

export const SaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Installment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Printable Invoice Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Cancellation State
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchSale = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{ sale: Sale; items: any[]; payments: any[] }>(`/sales/${id}`);
      setSale({
        ...res.sale,
        items: res.items,
        payments: res.payments,
      });
    } catch (err: any) {
      setError(err.message || 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSale();
  }, [id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    setPaymentError(null);
    const parsedAmt = parseFloat(paymentAmount);

    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }

    if (parsedAmt > sale.balance + 0.01) {
      setPaymentError(`Payment cannot exceed outstanding balance of ${formatCurrency(sale.balance)}.`);
      return;
    }

    setSavingPayment(true);
    try {
      await api.post('/payments', {
        sale_id: sale.id,
        amount: parsedAmt,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: paymentNotes.trim() || 'Installment payment',
      });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchSale();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record installment payment.');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCancelSale = async () => {
    if (!sale) return;
    setCancelling(true);
    try {
      await api.post(`/sales/${sale.id}/cancel`);
      setIsCancelConfirmOpen(false);
      fetchSale();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel sale.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading invoice...</div>;
  }

  if (error || !sale) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
        {error || 'Invoice not found.'}
      </div>
    );
  }

  const isCancelled = sale.status === 'Cancelled' || (sale.notes && sale.notes.includes('[CANCELLED]'));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales List</span>
        </button>

        <div className="flex items-center gap-2.5">
          {sale.balance > 0 && !isCancelled && (
            <button
              onClick={() => {
                setPaymentAmount(String(sale.balance));
                setIsPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span>Record Installment</span>
            </button>
          )}

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>

          {!isCancelled && (
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Sale</span>
            </button>
          )}
        </div>
      </div>

      {isCancelled && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-rose-900">This sale has been cancelled and products returned to inventory.</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {sale.cancelled_at ? `Cancelled on ${formatDate(sale.cancelled_at)}` : ''}
                {sale.cancelled_by_name ? ` by ${sale.cancelled_by_name}` : ''}
                {' — '}Excluded from all revenue, COGS, and profit calculations.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-rose-200 text-rose-900 font-bold uppercase text-[10px] rounded tracking-wider">
            Cancelled
          </span>
        </div>
      )}

      {/* Invoice Overview Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-mono font-bold text-slate-900">{sale.invoice_number}</h2>
              {isCancelled ? (
                <Badge variant="danger">Cancelled</Badge>
              ) : (
                <Badge
                  variant={
                    sale.payment_status === 'Paid'
                      ? 'success'
                      : sale.payment_status === 'Partial'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {sale.payment_status}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Issued on {formatDate(sale.sale_date)} • Created by {sale.created_by_name || 'Staff'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Net Amount</span>
            <p className={`text-2xl font-black mt-0.5 ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              <CurrencyDisplay amount={sale.total} />
            </p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Information
            </h4>
            <button
              onClick={() => navigate(`/customers/${sale.customer_id}`)}
              className="text-sm font-bold text-slate-900 hover:text-brand-600 mt-1 block"
            >
              {sale.customer_name}
            </button>
            <p className="text-xs text-slate-600 font-medium">{sale.customer_phone}</p>
            {sale.customer_email && (
              <p className="text-xs text-slate-500">{sale.customer_email}</p>
            )}
            {sale.customer_address && (
              <p className="text-[11px] text-slate-500 mt-1">{sale.customer_address}</p>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Payment Summary
            </h4>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Gross Total:</span>
              <span className="font-semibold text-slate-800">
                <CurrencyDisplay amount={sale.gross_total} />
              </span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                <span>Discount Applied:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-semibold">
              <span>Total Paid:</span>
              <span>{formatCurrency(sale.amount_paid)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm font-bold">
              <span className={sale.balance > 0 ? 'text-rose-600' : 'text-slate-800'}>
                Remaining Balance:
              </span>
              <span className={sale.balance > 0 ? 'text-rose-600' : 'text-slate-800'}>
                {formatCurrency(sale.balance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Itemized Sale Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Ordered Optical Items</h3>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">SKU</th>
              <th className="p-3 text-center">Quantity</th>
              <th className="p-3 text-right">Unit Price</th>
              <th className="p-3 text-right">Discount</th>
              <th className="p-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items?.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="p-3 font-bold text-slate-900">
                  {item.brand} {item.model}
                </td>
                <td className="p-3 text-slate-600">{item.product_type}</td>
                <td className="p-3 font-mono text-slate-500 text-[11px]">{item.sku}</td>
                <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                <td className="p-3 text-right font-medium text-slate-700">
                  <CurrencyDisplay amount={item.unit_price} />
                </td>
                <td className="p-3 text-right text-rose-600">
                  {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                </td>
                <td className="p-3 text-right font-bold text-slate-900">
                  <CurrencyDisplay amount={item.subtotal} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Installments History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Payment & Installment Records</h3>
          {sale.balance > 0 && !isCancelled && (
            <button
              onClick={() => {
                setPaymentAmount(String(sale.balance));
                setIsPaymentModalOpen(true);
              }}
              className="text-xs font-bold text-brand-600 hover:text-brand-700"
            >
              + Add Installment
            </button>
          )}
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px]">
            <tr>
              <th className="p-3">Payment Date</th>
              <th className="p-3">Method</th>
              <th className="p-3">Reference / Notes</th>
              <th className="p-3">Recorded By</th>
              <th className="p-3 text-right">Amount Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.payments && sale.payments.length > 0 ? (
              sale.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-slate-700 font-medium">{formatDate(p.payment_date)}</td>
                  <td className="p-3 font-semibold text-slate-800">{p.payment_method}</td>
                  <td className="p-3 text-slate-500">{p.notes || 'Installment'}</td>
                  <td className="p-3 text-slate-500">{p.created_by_name || 'Staff'}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">
                    <CurrencyDisplay amount={p.amount} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                  No payments recorded yet for this invoice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Installment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Installment Payment</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {paymentError}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500">Current Remaining Balance:</span>
                <p className="text-base font-bold text-rose-600 mt-0.5">
                  <CurrencyDisplay amount={sale.balance} />
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Amount (PKR Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={sale.balance}
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Transaction Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Bank slip # / Cash handover"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {savingPayment ? 'Recording...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {isPrintModalOpen && (
        <PrintableInvoice sale={sale} onClose={() => setIsPrintModalOpen(false)} />
      )}

      {/* Cancellation Confirmation */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Cancel Sale"
        message="Are you sure you want to cancel this sale? The sale will no longer be included in revenue/profit calculations and the sold products will be returned to inventory."
        confirmLabel="Cancel Sale"
        variant="danger"
        isLoading={cancelling}
        onConfirm={handleCancelSale}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />
    </div>
  );
};
