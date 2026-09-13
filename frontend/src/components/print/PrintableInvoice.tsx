import React, { useState, useEffect } from 'react';
import { Printer, X, Glasses } from 'lucide-react';
import { Sale, BusinessSettings } from '../../types/index.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { api } from '../../api/client.js';

interface PrintableInvoiceProps {
  sale: Sale;
  shopName?: string;
  shopPhone?: string;
  shopWhatsApp?: string;
  shopEmail?: string;
  shopAddress?: string;
  invoiceFooter?: string;
  logoUrl?: string;
  onClose?: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  sale,
  shopName: propShopName,
  shopPhone: propShopPhone,
  shopWhatsApp: propShopWhatsApp,
  shopEmail: propShopEmail,
  shopAddress: propShopAddress,
  invoiceFooter: propInvoiceFooter,
  logoUrl: propLogoUrl,
  onClose,
}) => {
  const [bizSettings, setBizSettings] = useState<Partial<BusinessSettings>>({});

  useEffect(() => {
    api.get<{ settings: BusinessSettings }>('/settings/business')
      .then((res) => {
        if (res.settings) {
          setBizSettings(res.settings);
        }
      })
      .catch(() => {});
  }, []);

  const shopName = propShopName || bizSettings.shop_name || 'VisionOptics Pakistan';
  const shopPhone = propShopPhone || bizSettings.phone || '+92 300 1234567';
  const shopWhatsApp = propShopWhatsApp || bizSettings.whatsapp || '+92 300 1234567';
  const shopEmail = propShopEmail || bizSettings.email || 'contact@visionoptics.pk';
  const shopAddress = propShopAddress || bizSettings.address || 'Suite 402, Al-Latif Centre, Main Boulevard, Gulberg III, Lahore, Pakistan';
  const invoiceFooter = propInvoiceFooter || bizSettings.invoice_footer || 'Thank you for choosing VisionOptics. Quality eyewear guaranteed. Exchange within 7 days with original invoice.';
  const logoUrl = propLogoUrl || bizSettings.logo_url;

  const isCancelled = sale.status === 'Cancelled';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden my-8">
        {/* Action Header (Hidden during Print) */}
        <div className="no-print flex items-center justify-between p-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold">Sales Invoice Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Invoice Page Body */}
        <div className="p-8 sm:p-12 bg-white printable-card text-slate-900">
          {/* Shop Branding & Invoice Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} className="w-12 h-12 rounded-xl object-contain border border-slate-200" />
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shrink-0">
                  <Glasses className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                  {shopName}
                </h1>
                <p className="text-xs text-slate-600 font-medium">Eyewear & Optical Solutions</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{shopAddress}</p>
                <p className="text-[11px] text-slate-500">
                  Phone: {shopPhone} • WhatsApp: {shopWhatsApp} {shopEmail ? `• Email: ${shopEmail}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-900 text-sm font-mono font-bold uppercase rounded-md">
                {sale.invoice_number}
              </span>
              <p className="text-xs text-slate-600 mt-2">
                Date: <strong className="text-slate-900">{formatDate(sale.sale_date)}</strong>
              </p>
              <p className="text-xs text-slate-600">
                Issued By: <span className="font-semibold">{sale.created_by_name || 'Staff'}</span>
              </p>
            </div>
          </div>

          {/* Cancelled Banner if status is Cancelled */}
          {isCancelled && (
            <div className="my-4 p-3.5 bg-rose-50 border-2 border-rose-500 text-rose-800 text-center rounded-lg">
              <p className="font-black tracking-wider uppercase text-sm">*** VOID / CANCELLED INVOICE ***</p>
              <p className="text-xs text-rose-700 mt-0.5 font-medium">
                This transaction was cancelled. Sold eyewear items have been returned to inventory.
              </p>
            </div>
          )}

          {/* Customer Details Box */}
          <div className="grid grid-cols-2 gap-6 my-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Billed To Customer</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{sale.customer_name}</p>
              <p className="text-xs text-slate-600 mt-0.5 font-medium">{sale.customer_phone}</p>
              {sale.customer_email && (
                <p className="text-xs text-slate-500">{sale.customer_email}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Invoice Status</p>
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold uppercase mt-1 ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-800 font-black'
                    : sale.payment_status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : sale.payment_status === 'Partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isCancelled ? 'Cancelled' : sale.payment_status}
              </span>
              {sale.customer_address && (
                <p className="text-[11px] text-slate-500 mt-2 max-w-xs ml-auto">
                  {sale.customer_address}
                </p>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="my-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sale.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">
                        {item.brand} {item.model}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{item.product_type}</td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right text-rose-600">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : 'Rs. 0'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="flex justify-end my-6">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Gross Total:</span>
                <span className="font-medium text-slate-800">{formatCurrency(sale.gross_total)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
                  <span>Overall Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-300 text-sm font-bold text-slate-900">
                <span>Final Net Total:</span>
                <span className="font-black text-brand-600">{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                <span>Amount Paid:</span>
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

          {/* Payment History / Installments */}
          {sale.payments && sale.payments.length > 0 && (
            <div className="my-6 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2 tracking-wider">
                Payment History & Installments
              </h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Date</th>
                    <th className="p-2 border-b border-slate-200">Method</th>
                    <th className="p-2 border-b border-slate-200">Reference / Notes</th>
                    <th className="p-2 border-b border-slate-200 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="p-2 text-slate-600">{formatDate(p.payment_date)}</td>
                      <td className="p-2 font-medium">{p.payment_method}</td>
                      <td className="p-2 text-slate-500">{p.notes || '-'}</td>
                      <td className="p-2 text-right font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoice Terms & Signatures */}
          <div className="flex items-end justify-between pt-8 mt-6 border-t border-slate-200">
            <div className="text-[10px] text-slate-500 max-w-sm">
              <p className="font-bold text-slate-700">Customer Notice & Policy:</p>
              <p className="mt-0.5 leading-relaxed">{invoiceFooter}</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mb-1" />
              <p className="text-xs font-bold text-slate-900">Authorized Signature</p>
              <p className="text-[10px] text-slate-400">{shopName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
