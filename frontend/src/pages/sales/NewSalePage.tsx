import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Trash2, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  CreditCard,
  User,
  Boxes
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Customer, Product, Prescription } from '../../types/index.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { CustomerFormModal } from '../customers/CustomerFormModal.js';
import { formatCurrency, formatDate, formatOpticalDiopter, formatOpticalAxis } from '../../utils/formatters.js';

interface SaleLineItem {
  id: string; // temp client key
  product_id: string;
  brand: string;
  model: string;
  sku: string;
  product_type: string;
  available_stock: number;
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export const NewSalePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id');

  // Step 1: Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [latestRx, setLatestRx] = useState<Prescription | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Step 2: Products State
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [items, setItems] = useState<SaleLineItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().substring(0, 10));

  // Step 3: Payment State
  const [amountReceived, setAmountReceived] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'Easypaisa' | 'JazzCash' | 'Other'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available active products
  useEffect(() => {
    api.get<{ data: Product[] }>('/products').then((res) => {
      setAvailableProducts(res.data);
    });
  }, []);

  // If preselectedCustomerId was passed in query, load customer and their latest prescription
  useEffect(() => {
    if (preselectedCustomerId) {
      api.get<{ customer: Customer; prescriptions: Prescription[] }>(`/customers/${preselectedCustomerId}`)
        .then((res) => {
          setSelectedCustomer(res.customer);
          if (res.prescriptions && res.prescriptions.length > 0) {
            setLatestRx(res.prescriptions[0]);
          }
        })
        .catch(console.error);
    }
  }, [preselectedCustomerId]);

  // Handle customer live search
  useEffect(() => {
    if (!customerSearch.trim() || selectedCustomer) return;
    const timer = setTimeout(() => {
      api.get<{ data: Customer[] }>(`/customers?search=${encodeURIComponent(customerSearch)}&limit=5`)
        .then((res) => setCustomerOptions(res.data))
        .catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  const selectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerSearch('');
    setCustomerOptions([]);
    // Fetch prescription history
    try {
      const res = await api.get<{ prescriptions: Prescription[] }>(`/customers/${cust.id}`);
      if (res.prescriptions && res.prescriptions.length > 0) {
        setLatestRx(res.prescriptions[0]);
      } else {
        setLatestRx(null);
      }
    } catch {
      setLatestRx(null);
    }
  };

  // Add line item
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const prod = availableProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Check if item already in list
    const existingIndex = items.findIndex((i) => i.product_id === prod.id);
    if (existingIndex > -1) {
      updateItemQuantity(existingIndex, items[existingIndex].quantity + 1);
      setSelectedProductId('');
      return;
    }

    const newItem: SaleLineItem = {
      id: Math.random().toString(36).substring(7),
      product_id: prod.id,
      brand: prod.brand,
      model: prod.model,
      sku: prod.sku,
      product_type: prod.product_type,
      available_stock: prod.quantity,
      quantity: 1,
      unit_price: prod.selling_price,
      discount: 0,
      subtotal: prod.selling_price,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    const item = updated[index];
    item.quantity = newQty;
    item.subtotal = Math.max(0, item.quantity * item.unit_price - item.discount);
    setItems(updated);
  };

  const updateItemPrice = (index: number, newPrice: number) => {
    const updated = [...items];
    const item = updated[index];
    item.unit_price = Math.max(0, newPrice);
    item.subtotal = Math.max(0, item.quantity * item.unit_price - item.discount);
    setItems(updated);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const updated = [...items];
    const item = updated[index];
    item.discount = Math.max(0, discount);
    item.subtotal = Math.max(0, item.quantity * item.unit_price - item.discount);
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate Totals
  const grossTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const parsedOverallDiscount = Math.max(0, parseFloat(overallDiscount) || 0);
  const netTotal = Math.max(0, grossTotal - parsedOverallDiscount);
  const parsedReceived = Math.max(0, parseFloat(amountReceived) || 0);
  const balance = Math.max(0, netTotal - parsedReceived);

  const paymentStatus =
    balance === 0 && netTotal > 0 ? 'Paid' : parsedReceived > 0 ? 'Partial' : 'Unpaid';

  // Quick action to set amount received to full amount
  const setFullPayment = () => {
    setAmountReceived(String(netTotal));
  };

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomer) {
      setError('Please select a customer for this order.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one optical product to the sale.');
      return;
    }

    if (parsedReceived > netTotal) {
      setError(`Amount received (Rs. ${parsedReceived}) cannot exceed net total (Rs. ${netTotal}).`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        sale_date: saleDate,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
        })),
        overall_discount: parsedOverallDiscount,
        amount_received: parsedReceived,
        payment_method: paymentMethod,
        payment_notes: paymentNotes.trim() || 'Initial payment on sale creation',
        notes: notes.trim() || null,
      };

      const res = await api.post<{ sale: any; message: string }>('/sales', payload);
      navigate(`/sales/${res.sale.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete sale transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sales</span>
        </button>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          New Optical Sale Order
        </span>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitSale} className="space-y-6">
        {/* Step 1: Customer Selection & Prescription Preview */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                1
              </span>
              <h3 className="text-sm font-bold text-slate-900">Select Customer</h3>
            </div>
            {selectedCustomer && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setLatestRx(null);
                }}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                Change Customer
              </button>
            )}
          </div>

          <div className="p-6">
            {!selectedCustomer ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer by name or mobile number (e.g. 0300...)"
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>New Customer</span>
                  </button>
                </div>

                {/* Search Results Dropdown */}
                {customerOptions.length > 0 && (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 shadow-md max-h-56 overflow-y-auto">
                    {customerOptions.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{c.full_name}</p>
                          <p className="text-slate-500">{c.phone}</p>
                        </div>
                        <span className="text-[11px] text-brand-600 font-semibold">Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Customer Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-brand-50/50 rounded-xl border border-brand-200 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                      Selected Customer
                    </span>
                    <h4 className="text-base font-bold text-slate-900">{selectedCustomer.full_name}</h4>
                    <p className="text-xs text-slate-600 font-medium">{selectedCustomer.phone}</p>
                    {selectedCustomer.address && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">
                      Account Outstanding
                    </span>
                    <p className="text-sm font-bold text-rose-600">
                      <CurrencyDisplay amount={selectedCustomer.outstanding_balance || 0} />
                    </p>
                  </div>
                </div>

                {/* Embedded Latest Eyesight Prescription (Specialized Optics UX) */}
                {latestRx ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-600" />
                        <span className="text-xs font-bold text-slate-800">
                          Active Prescription Reference (Tested {formatDate(latestRx.test_date)})
                        </span>
                      </div>
                      {latestRx.prescribing_doctor && (
                        <span className="text-[11px] text-slate-500">
                          Dr. {latestRx.prescribing_doctor}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">OD (Right):</span>{' '}
                        <span className="font-mono text-slate-900">
                          SPH {formatOpticalDiopter(latestRx.right_sphere)} | CYL{' '}
                          {formatOpticalDiopter(latestRx.right_cylinder)} | AXIS{' '}
                          {formatOpticalAxis(latestRx.right_axis)}
                          {latestRx.right_add && ` | ADD ${formatOpticalDiopter(latestRx.right_add)}`}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">OS (Left):</span>{' '}
                        <span className="font-mono text-slate-900">
                          SPH {formatOpticalDiopter(latestRx.left_sphere)} | CYL{' '}
                          {formatOpticalDiopter(latestRx.left_cylinder)} | AXIS{' '}
                          {formatOpticalAxis(latestRx.left_axis)}
                          {latestRx.left_add && ` | ADD ${formatOpticalDiopter(latestRx.left_add)}`}
                        </span>
                      </div>
                    </div>
                    {latestRx.pupillary_distance && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        <strong>PD:</strong> {latestRx.pupillary_distance} mm
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No prescription on file for this customer.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Add Products & Manage Cart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                2
              </span>
              <h3 className="text-sm font-bold text-slate-900">Add Optical Products</h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Sale Date:</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Product Picker Dropdown */}
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="">-- Choose Frame, Lens, Sunglasses, or Accessory --</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    [{p.product_type}] {p.brand} {p.model} (SKU: {p.sku}) — Rs. {p.selling_price.toLocaleString()}{' '}
                    — {p.quantity > 0 ? `${p.quantity} in stock` : 'OUT OF STOCK'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductId}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-40 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Product Description</th>
                    <th className="p-3 text-center w-24">Quantity</th>
                    <th className="p-3 text-right w-32">Unit Price (PKR)</th>
                    <th className="p-3 text-right w-28">Discount</th>
                    <th className="p-3 text-right w-32">Subtotal</th>
                    <th className="p-3 text-center w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No items added yet. Select a product above to add to this invoice.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">
                            {item.brand} {item.model}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {item.product_type} • SKU: {item.sku} • {item.available_stock} in stock
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.available_stock > 0 ? item.available_stock : undefined}
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-16 px-2 py-1 text-center font-bold border border-slate-300 rounded-md"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-right font-medium border border-slate-300 rounded-md"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.discount}
                            onChange={(e) => updateItemDiscount(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-right border border-slate-300 rounded-md text-rose-600"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Overall Discount Row */}
            <div className="flex flex-col sm:flex-row justify-end items-end gap-4 pt-2">
              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Gross Total:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(grossTotal)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Overall Discount (PKR):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(e.target.value)}
                    className="w-24 px-2 py-0.5 text-right font-bold text-rose-600 border border-slate-300 rounded-md"
                  />
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="font-bold text-slate-900">Net Payable:</span>
                  <span className="font-black text-brand-600 text-base">
                    {formatCurrency(netTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Payment & Balance Calculation */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                3
              </span>
              <h3 className="text-sm font-bold text-slate-900">Record Payment & Settle Balance</h3>
            </div>
            <button
              type="button"
              onClick={setFullPayment}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md"
            >
              Collect Full Amount (Paid)
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Received (PKR Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={netTotal}
                  step="any"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Easypaisa">Easypaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Notes / Bank Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Meezan Bank Ref / Easypaisa TID"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Balance Preview Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400">Total:</span>{' '}
                  <strong className="text-slate-800">{formatCurrency(netTotal)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Paid:</span>{' '}
                  <strong className="text-emerald-600">{formatCurrency(parsedReceived)}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Remaining Balance:</span>{' '}
                  <strong className={balance > 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {formatCurrency(balance)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : paymentStatus === 'Partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Fitting instructions, lens laboratory job number, customer delivery remarks..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={loading || items.length === 0 || !selectedCustomer}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing Sale Transaction...' : 'Complete Sale & Generate Invoice'}
          </button>
        </div>
      </form>

      {/* Customer Form Modal for quick customer addition */}
      <CustomerFormModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSuccess={(newCust) => selectCustomer(newCust)}
      />
    </div>
  );
};
