import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

export const productsRouter = Router();
productsRouter.use(authenticate);

// List products with search and category filters
productsRouter.get('/', (req, res) => {
  const isOwner = req.user?.role === 'owner';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const productType = typeof req.query.product_type === 'string' ? req.query.product_type.trim() : '';
  const lowStockOnly = req.query.low_stock === 'true';
  const includeInactive = req.query.include_inactive === 'true';

  const filterClauses: string[] = [];
  const params: any[] = [];

  if (!includeInactive) {
    filterClauses.push('active = 1');
  }

  if (productType) {
    filterClauses.push('product_type = ?');
    params.push(productType);
  }

  if (lowStockOnly) {
    filterClauses.push('quantity <= low_stock_threshold');
  }

  if (search) {
    filterClauses.push('(brand LIKE ? OR model LIKE ? OR sku LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';

  // Select fields; mask cost_price if user is not owner
  const selectFields = isOwner
    ? '*'
    : 'id, product_type, brand, model, sku, description, NULL as cost_price, selling_price, quantity, low_stock_threshold, supplier, active, created_at, updated_at';

  const query = `
    SELECT ${selectFields}
    FROM products
    ${whereSql}
    ORDER BY brand ASC, model ASC
  `;

  const products = db.prepare(query).all(...params);

  res.json({ data: products });
});

// Get single product
productsRouter.get('/:id', (req, res) => {
  const isOwner = req.user?.role === 'owner';
  const { id } = req.params;

  const selectFields = isOwner
    ? '*'
    : 'id, product_type, brand, model, sku, description, NULL as cost_price, selling_price, quantity, low_stock_threshold, supplier, active, created_at, updated_at';

  const product = db.prepare(`SELECT ${selectFields} FROM products WHERE id = ?`).get(id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  res.json({ product });
});

// Create product
productsRouter.post('/', (req, res) => {
  const {
    product_type,
    brand,
    model,
    sku,
    description,
    cost_price,
    selling_price,
    quantity,
    low_stock_threshold,
    supplier
  } = req.body;

  if (!product_type || !['Frame', 'Lens', 'Sunglasses', 'Accessory'].includes(product_type)) {
    return res.status(400).json({ error: 'Valid product type (Frame, Lens, Sunglasses, Accessory) is required.' });
  }
  if (!brand || !brand.trim()) {
    return res.status(400).json({ error: 'Brand name is required.' });
  }
  if (!model || !model.trim()) {
    return res.status(400).json({ error: 'Model name/number is required.' });
  }
  if (!sku || !sku.trim()) {
    return res.status(400).json({ error: 'Unique SKU is required.' });
  }

  const parsedCost = parseFloat(cost_price);
  const parsedSelling = parseFloat(selling_price);
  const parsedQty = parseInt(quantity, 10);
  const parsedThreshold = parseInt(low_stock_threshold, 10);

  if (isNaN(parsedCost) || parsedCost < 0) {
    return res.status(400).json({ error: 'Valid non-negative cost price is required.' });
  }
  if (isNaN(parsedSelling) || parsedSelling < 0) {
    return res.status(400).json({ error: 'Valid non-negative selling price is required.' });
  }
  if (isNaN(parsedQty) || parsedQty < 0) {
    return res.status(400).json({ error: 'Valid non-negative quantity is required.' });
  }

  // Check unique SKU
  const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
  if (existing) {
    return res.status(400).json({ error: `Product with SKU "${sku.trim()}" already exists.` });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (
      id, product_type, brand, model, sku, description,
      cost_price, selling_price, quantity, low_stock_threshold, supplier,
      active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    product_type,
    brand.trim(),
    model.trim(),
    sku.trim(),
    description ? description.trim() : null,
    parsedCost,
    parsedSelling,
    parsedQty,
    isNaN(parsedThreshold) ? 5 : parsedThreshold,
    supplier ? supplier.trim() : null,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ product: created, message: 'Product created successfully.' });
});

// Update product
productsRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    product_type,
    brand,
    model,
    sku,
    description,
    cost_price,
    selling_price,
    quantity,
    low_stock_threshold,
    supplier
  } = req.body;

  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Check SKU conflict with other products
  if (sku && sku.trim() !== existing.sku) {
    const conflict = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim(), id);
    if (conflict) {
      return res.status(400).json({ error: `SKU "${sku.trim()}" is already used by another product.` });
    }
  }

  const isOwner = req.user?.role === 'owner';
  const newCostPrice = isOwner && cost_price !== undefined ? parseFloat(cost_price) : existing.cost_price;
  const newSellingPrice = selling_price !== undefined ? parseFloat(selling_price) : existing.selling_price;
  const newQty = quantity !== undefined ? parseInt(quantity, 10) : existing.quantity;
  const newThreshold = low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : existing.low_stock_threshold;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE products
    SET 
      product_type = COALESCE(?, product_type),
      brand = COALESCE(?, brand),
      model = COALESCE(?, model),
      sku = COALESCE(?, sku),
      description = ?,
      cost_price = ?,
      selling_price = ?,
      quantity = ?,
      low_stock_threshold = ?,
      supplier = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    product_type || existing.product_type,
    brand ? brand.trim() : existing.brand,
    model ? model.trim() : existing.model,
    sku ? sku.trim() : existing.sku,
    description !== undefined ? (description ? description.trim() : null) : existing.description,
    newCostPrice,
    newSellingPrice,
    newQty,
    newThreshold,
    supplier !== undefined ? (supplier ? supplier.trim() : null) : existing.supplier,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: updated, message: 'Product updated successfully.' });
});

// Soft archive product
productsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id, brand, model FROM products WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE products SET active = 0, updated_at = ? WHERE id = ?').run(now, id);
  res.json({ message: `Product "${existing.brand} ${existing.model}" archived successfully.` });
});

// Restore product
productsRouter.post('/:id/restore', (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  db.prepare('UPDATE products SET active = 1, updated_at = ? WHERE id = ?').run(now, id);
  res.json({ message: 'Product restored successfully.' });
});
