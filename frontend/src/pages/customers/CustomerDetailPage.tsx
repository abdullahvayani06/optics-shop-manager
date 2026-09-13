import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  FileText, 
  ShoppingCart, 
  PlusCircle, 
  Printer, 
  Edit, 
  Clock, 
  DollarSign 
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Customer, Prescription, Sale } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { Badge } from '../../components/common/Badge.js';
import { CustomerFormModal } from './CustomerFormModal.js';
import { PrescriptionFormModal } from '../prescriptions/PrescriptionFormModal.js';
import { PrintablePrescription } from '../../components/print/PrintablePrescription.js';
import { formatDate, formatOpticalDiopter, formatOpticalAxis } from '../../utils/formatters.js';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewRxOpen, setIsNewRxOpen] = useState(false);
  const [activePrintRx, setActivePrintRx] = useState<Prescription | null>(null);

  const fetchCustomerData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get<{
        customer: Customer;
        prescriptions: Prescription[];
        sales: Sale[];
      }>(`/customers/${id}`);
      setCustomer(res.customer);
      setPrescriptions(res.prescriptions);
      setSales(res.sales);
    } catch (err: any) {
      setError(err.message || 'Customer not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Loading customer clinical profile...
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
        {error || 'Customer not found.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers List</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          {/* Streamlined Fast Action: New Sale for this Customer */}
          <button
            onClick={() => navigate(`/sales/new?customer_id=${customer.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm shadow-brand-600/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale for Customer</span>
          </button>
        </div>
      </div>

      {/* Customer Info Card & Purchase Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Basic Info */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Account
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">{customer.full_name}</h2>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-400 text-[11px] pt-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Registered on {formatDate(customer.created_at)}</span>
            </div>
          </div>

          {customer.notes && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <p className="font-semibold text-slate-700 mb-0.5">Clinical & Frame Notes:</p>
              <p className="text-slate-600 leading-relaxed">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Purchase Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Purchases</span>
            <h4 className="text-xl font-bold text-slate-900 mt-2">
              <CurrencyDisplay amount={customer.total_purchases} />
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Lifetime spending</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Paid</span>
            <h4 className="text-xl font-bold text-emerald-600 mt-2">
              <CurrencyDisplay amount={(customer as any).total_paid} />
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Settled payments</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Balance</span>
            <h4
              className={`text-xl font-bold mt-2 ${
                ((customer as any).total_outstanding || 0) > 0 ? 'text-rose-600' : 'text-slate-800'
              }`}
            >
              <CurrencyDisplay amount={(customer as any).total_outstanding} />
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Pending dues</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Orders Count</span>
            <h4 className="text-xl font-bold text-brand-600 mt-2">
              {(customer as any).orders_count || 0}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">Invoices issued</p>
          </div>
        </div>
      </div>

      {/* Eyesight & Prescription History Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <span>Eyesight & Prescription History</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chronological immutable clinical record. Previous prescriptions are never overwritten.
            </p>
          </div>
          <button
            onClick={() => setIsNewRxOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add New Prescription</span>
          </button>
        </div>

        <div className="p-6">
          {prescriptions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              No eyesight prescriptions recorded yet for this customer.
            </div>
          ) : (
            <div className="space-y-6">
              {prescriptions.map((rx, idx) => (
                <div
                  key={rx.id}
                  className={`p-5 rounded-xl border transition-all ${
                    idx === 0
                      ? 'border-brand-300 bg-brand-50/20 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200/80 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-md bg-slate-900 text-white">
                        {idx === 0 ? 'Latest Prescription' : `Record #${prescriptions.length - idx}`}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Test Date: {formatDate(rx.test_date)}
                      </span>
                      {rx.prescribing_doctor && (
                        <span className="text-xs text-slate-500">
                          • Prescribed by {rx.prescribing_doctor}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setActivePrintRx(rx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Prescription Card</span>
                    </button>
                  </div>

                  {/* Optical Matrix Grid */}
                  <div className="my-4 overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase">
                          <th className="border border-slate-200 p-2 text-left pl-3">Eye</th>
                          <th className="border border-slate-200 p-2">SPH (Sphere)</th>
                          <th className="border border-slate-200 p-2">CYL (Cylinder)</th>
                          <th className="border border-slate-200 p-2">AXIS</th>
                          <th className="border border-slate-200 p-2">ADD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="border border-slate-200 p-2 text-left pl-3 font-bold bg-slate-50">
                            OD (Right Eye)
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.right_sphere)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.right_cylinder)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalAxis(rx.right_axis)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.right_add)}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 p-2 text-left pl-3 font-bold bg-slate-50">
                            OS (Left Eye)
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.left_sphere)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.left_cylinder)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalAxis(rx.left_axis)}
                          </td>
                          <td className="border border-slate-200 p-2 font-mono font-semibold text-slate-900">
                            {formatOpticalDiopter(rx.left_add)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      {rx.pupillary_distance && (
                        <span>
                          <strong>PD:</strong> {rx.pupillary_distance} mm
                        </span>
                      )}
                      {rx.remarks && (
                        <span>
                          <strong>Remarks:</strong> {rx.remarks}
                        </span>
                      )}
                    </div>
                    {rx.created_by_name && (
                      <span className="text-[11px] text-slate-400">
                        Recorded by {rx.created_by_name} on {formatDate(rx.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Sales / Order History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/60">
          <h3 className="text-base font-bold text-slate-900">Purchases & Invoices History</h3>
          <p className="text-xs text-slate-500">All eyewear orders placed by {customer.full_name}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Gross Total</th>
                <th className="p-3.5 text-right">Net Total</th>
                <th className="p-3.5 text-right">Paid</th>
                <th className="p-3.5 text-right">Balance</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                    No orders placed yet by this customer.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{s.invoice_number}</td>
                    <td className="p-3.5 text-slate-600">{formatDate(s.sale_date)}</td>
                    <td className="p-3.5 text-right font-medium text-slate-600">
                      <CurrencyDisplay amount={s.gross_total} />
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      <CurrencyDisplay amount={s.total} />
                    </td>
                    <td className="p-3.5 text-right font-semibold text-emerald-600">
                      <CurrencyDisplay amount={s.amount_paid} />
                    </td>
                    <td className="p-3.5 text-right font-bold">
                      {s.balance > 0 ? (
                        <span className="text-rose-600">
                          <CurrencyDisplay amount={s.balance} />
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Rs. 0</span>
                      )}
                    </td>
                    <td className="p-3.5">
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
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => navigate(`/sales/${s.id}`)}
                        className="px-2.5 py-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customerToEdit={customer}
        onSuccess={() => fetchCustomerData()}
      />

      {/* Add Prescription Modal */}
      <PrescriptionFormModal
        isOpen={isNewRxOpen}
        customerId={customer.id}
        customerName={customer.full_name}
        onClose={() => setIsNewRxOpen(false)}
        onSuccess={() => fetchCustomerData()}
      />

      {/* Printable Prescription Modal */}
      {activePrintRx && (
        <PrintablePrescription
          prescription={activePrintRx}
          customer={customer}
          onClose={() => setActivePrintRx(null)}
        />
      )}
    </div>
  );
};
