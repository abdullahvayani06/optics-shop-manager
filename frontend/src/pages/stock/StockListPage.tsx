import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Archive, 
  Boxes, 
  AlertCircle, 
  Tag, 
  DollarSign, 
  Layers, 
  ShieldAlert 
} from 'lucide-react';
import { api } from '../../api/client.js';
import { Product, ProductType } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { CurrencyDisplay } from '../../components/common/CurrencyDisplay.js';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.js';
import { ProductFormModal } from './ProductFormModal.js';

export const StockListPage: React.FC = () => {
  const { role } = useAuth();
  const isOwner = role === 'owner';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = `?search=${encodeURIComponent(search)}`;
      if (selectedType !== 'All') {
        query += `&product_type=${selectedType}`;
      }
      if (lowStockOnly) {
        query += `&low_stock=true`;
      }
      const res = await api.get<{ data: Product[] }>(`/products${query}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedType, lowStockOnly]);

  const handleArchiveConfirm = async () => {
    if (!productToArchive) return;
    setArchiving(true);
    try {
      await api.delete(`/products/${productToArchive.id}`);
      setProductToArchive(null);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to archive product.');
    } finally {
      setArchiving(false);
    }
  };

  const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length;
  const totalStockCost = isOwner
    ? products.reduce((sum, p) => sum + (p.cost_price || 0) * p.quantity, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock & Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage frames, lenses, sunglasses, and optical accessories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Products</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-1.5">{products.length}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Active catalog items</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Units in Stock</span>
          <h3 className="text-2xl font-bold text-brand-600 mt-1.5">{totalUnits}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Available physical pieces</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
          <h3
            className={`text-2xl font-bold mt-1.5 ${
              lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {lowStockCount}
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Require supplier reorder</p>
        </div>

        {isOwner ? (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Stock Valuation</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1.5">
              <CurrencyDisplay amount={totalStockCost} />
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total inventory at cost price</p>
          </div>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Categories</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1.5">4 Types</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Frames, Lenses, Shades, Accessories</p>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['All', 'Frame', 'Lens', 'Sunglasses', 'Accessory'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedType === type
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {type === 'All' ? 'All Products' : type}
              </button>
            ))}
          </div>

          {/* Low stock toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4"
            />
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Show Low-Stock Only
            </span>
          </label>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand, model name, SKU, or optical specs..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Product & Model</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">SKU</th>
                {isOwner && <th className="p-3.5 text-right">Cost Price</th>}
                <th className="p-3.5 text-right">Selling Price</th>
                <th className="p-3.5 text-center">Available Stock</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={isOwner ? 8 : 7} className="p-4 bg-slate-50/50" />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={isOwner ? 8 : 7}
                    className="p-8 text-center text-slate-500 text-xs"
                  >
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.quantity <= p.low_stock_threshold && p.quantity > 0;
                  const isOut = p.quantity === 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">
                          {p.brand} <span className="font-medium text-slate-700">{p.model}</span>
                        </p>
                        {p.description && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {p.description}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {p.product_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 text-[11px]">{p.sku}</td>
                      {isOwner && (
                        <td className="p-3.5 text-right font-medium text-slate-500">
                          <CurrencyDisplay amount={p.cost_price} />
                        </td>
                      )}
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        <CurrencyDisplay amount={p.selling_price} />
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : `${p.quantity} units`}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{p.supplier || '-'}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsFormOpen(true);
                            }}
                            title="Edit Product"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToArchive(p)}
                            title="Archive Product"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        productToEdit={editingProduct}
        onSuccess={() => fetchProducts()}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!productToArchive}
        title="Archive Optical Product?"
        message={`Are you sure you want to archive "${productToArchive?.brand} ${productToArchive?.model}"? Past sales and invoice items will remain intact.`}
        confirmLabel="Archive Product"
        variant="warning"
        isLoading={archiving}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setProductToArchive(null)}
      />
    </div>
  );
};
