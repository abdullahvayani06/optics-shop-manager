import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { Product, ProductType } from '../../types/index.js';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.js';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}) => {
  const { role } = useAuth();
  const isOwner = role === 'owner';

  const [productType, setProductType] = useState<ProductType>('Frame');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [supplier, setSupplier] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setProductType(productToEdit.product_type);
      setBrand(productToEdit.brand);
      setModel(productToEdit.model);
      setSku(productToEdit.sku);
      setDescription(productToEdit.description || '');
      setCostPrice(productToEdit.cost_price !== null && productToEdit.cost_price !== undefined ? String(productToEdit.cost_price) : '');
      setSellingPrice(String(productToEdit.selling_price));
      setQuantity(String(productToEdit.quantity));
      setLowStockThreshold(String(productToEdit.low_stock_threshold));
      setSupplier(productToEdit.supplier || '');
    } else {
      setProductType('Frame');
      setBrand('');
      setModel('');
      setSku('');
      setDescription('');
      setCostPrice('');
      setSellingPrice('');
      setQuantity('0');
      setLowStockThreshold('5');
      setSupplier('');
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brand.trim() || !model.trim() || !sku.trim()) {
      setError('Brand, Model, and unique SKU are required.');
      return;
    }

    const parsedSelling = parseFloat(sellingPrice);
    if (isNaN(parsedSelling) || parsedSelling < 0) {
      setError('Valid non-negative selling price is required.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      setError('Quantity must be a non-negative integer.');
      return;
    }

    const payload: any = {
      product_type: productType,
      brand: brand.trim(),
      model: model.trim(),
      sku: sku.trim(),
      description: description.trim() || null,
      selling_price: parsedSelling,
      quantity: parsedQty,
      low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
      supplier: supplier.trim() || null,
    };

    if (isOwner && costPrice) {
      payload.cost_price = parseFloat(costPrice);
    } else if (!productToEdit) {
      payload.cost_price = parseFloat(costPrice) || 0;
    }

    setLoading(true);
    try {
      if (productToEdit) {
        await api.put(`/products/${productToEdit.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">
              {productToEdit ? 'Edit Optical Product' : 'Add New Product to Inventory'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as ProductType)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="Frame">Frame</option>
                <option value="Lens">Lens</option>
                <option value="Sunglasses">Sunglasses</option>
                <option value="Accessory">Accessory</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Ray-Ban, Essilor"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model / Specification <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Aviator Optics RB6489"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU (Barcode / Item Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="RB-FRM-6489"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isOwner && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price (PKR Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="8500"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Retail Selling Price (PKR Rs.) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="16500"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stock Quantity (Units) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Threshold (Alert Limit)
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier / Distributor Name
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Luxottica Middle East"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Optical Features
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Material, frame dimensions, lens index, anti-glare specs..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              {loading ? 'Saving...' : productToEdit ? 'Update Product' : 'Add to Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
