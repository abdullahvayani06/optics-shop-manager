import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

export const salesRouter = Router();
salesRouter.use(authenticate);

// Helper to generate next sequential invoice number: INV-YYYY-XXXXX
function generateInvoiceNumber(): string {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const lastSale = db.prepare(`
    SELECT invoice_number 
    FROM sales 
    WHERE invoice_number LIKE ? 
    ORDER BY invoice_number DESC 
    LIMIT 1
  `).get(`${prefix}%`) as { invoice_number: string } | undefined;

  let nextSequence = 1;
  if (lastSale && lastSale.invoice_number) {
    const parts = lastSale.invoice_number.split('-');
    if (parts.length >= 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq)) {
        nextSequence = seq + 1;
      }
    }
  }

  return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
}

// List sales with filters and pagination
salesRouter.get('/', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const customerId = typeof req.query.customer_id === 'string' ? req.query.customer_id.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const paymentStatus = typeof req.query.payment_status === 'string' ? req.query.payment_status.trim() : '';
  const dateFrom = typeof req.query.date_from === 'string' ? req.query.date_from.trim() : '';
  const dateTo = typeof req.query.date_to === 'string' ? req.query.date_to.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const filters: string[] = [];
  const params: any[] = [];

  if (search) {
    filters.push('(s.invoice_number LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (customerId) {
    filters.push('s.customer_id = ?');
    params.push(customerId);
  }

  if (status && status !== 'All') {
    filters.push('s.status = ?');
    params.push(status);
  }

  if (paymentStatus && paymentStatus !== 'All') {
    filters.push('s.payment_status = ?');
    params.push(paymentStatus);
  }

  if (dateFrom) {
    filters.push('s.sale_date >= ?');
    params.push(dateFrom);
  }

  if (dateTo) {
    filters.push('s.sale_date <= ?');
    params.push(dateTo);
  }

  const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    ${whereSql}
  `;
  const totalCount = (db.prepare(countQuery).get(...params) as { total: number })?.total || 0;

  const listQuery = `
    SELECT 
      s.id,
      s.invoice_number,
      s.sale_date,
      s.gross_total,
      s.discount,
      s.total,
      s.amount_paid,
      s.balance,
      s.payment_status,
      s.status,
      s.cancelled_at,
      s.cancelled_by,
      s.notes,
      s.created_at,
      c.id AS customer_id,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      prof.full_name AS created_by_name,
      canc.full_name AS cancelled_by_name,
      (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN profiles prof ON s.created_by = prof.id
    LEFT JOIN profiles canc ON s.cancelled_by = canc.id
    ${whereSql}
    ORDER BY s.sale_date DESC, s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const sales = db.prepare(listQuery).all(...params, limit, offset);

  res.json({
    data: sales,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  });
});

// Get single sale details (including items and payments history)
salesRouter.get('/:id', (req, res) => {
  const { id } = req.params;

  const sale = db.prepare(`
    SELECT 
      s.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      c.address AS customer_address,
      prof.full_name AS created_by_name,
      canc.full_name AS cancelled_by_name
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    LEFT JOIN profiles prof ON s.created_by = prof.id
    LEFT JOIN profiles canc ON s.cancelled_by = canc.id
    WHERE s.id = ?
  `).get(id) as any;

  if (!sale) {
    return res.status(404).json({ error: 'Sale not found.' });
  }

  // Fetch items
  const items = db.prepare(`
    SELECT 
      si.*,
      p.brand,
      p.model,
      p.sku,
      p.product_type
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = ?
    ORDER BY si.created_at ASC
  `).all(id);

  // Fetch payments
  const payments = db.prepare(`
    SELECT 
      pay.*,
      prof.full_name AS created_by_name
    FROM payments pay
    LEFT JOIN profiles prof ON pay.created_by = prof.id
    WHERE pay.sale_id = ?
    ORDER BY pay.payment_date ASC, pay.created_at ASC
  `).all(id);

  res.json({
    sale,
    items,
    payments
  });
});

// Create new sale transactionally
salesRouter.post('/', (req, res) => {
  const {
    customer_id,
    sale_date,
    items,
    overall_discount = 0,
    amount_received = 0,
    payment_method = 'Cash',
    payment_notes = '',
    notes = ''
  } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Customer is required.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one product item is required in the sale.' });
  }

  // Check customer exists
  const customer = db.prepare('SELECT id, full_name FROM customers WHERE id = ?').get(customer_id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Check negative stock setting
  const negStockSetting = db.prepare("SELECT value FROM business_settings WHERE key = 'allow_negative_stock'").get() as { value: string } | undefined;
  const allowNegativeStock = negStockSetting?.value === 'true';

  // Validate items and verify stock
  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Each item quantity must be greater than zero.' });
    }

    const product = db.prepare('SELECT id, brand, model, quantity FROM products WHERE id = ?').get(item.product_id) as any;
    if (!product) {
      return res.status(404).json({ error: `Product ID ${item.product_id} not found.` });
    }

    if (!allowNegativeStock && product.quantity < qty) {
      return res.status(400).json({
        error: `Insufficient stock for "${product.brand} ${product.model}". Available: ${product.quantity}, requested: ${qty}.`
      });
    }
  }

  // Calculate gross total
  let grossTotal = 0;
  const processedItems: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    discount: number;
    subtotal: number;
    cost_price: number;
  }> = [];

  for (const item of items) {
    const qty = parseInt(item.quantity, 10);
    const unitPrice = parseFloat(item.unit_price);
    const itemDiscount = Math.max(0, parseFloat(item.discount || 0));
    const subtotal = Math.max(0, (unitPrice * qty) - itemDiscount);

    const product = db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.product_id) as any;
    const costPrice = product ? product.cost_price : 0;

    grossTotal += subtotal;
    processedItems.push({
      product_id: item.product_id,
      quantity: qty,
      unit_price: unitPrice,
      discount: itemDiscount,
      subtotal,
      cost_price: costPrice
    });
  }

  const parsedOverallDiscount = Math.max(0, parseFloat(overall_discount) || 0);
  const total = Math.max(0, grossTotal - parsedOverallDiscount);
  const parsedReceived = Math.max(0, parseFloat(amount_received) || 0);

  if (parsedReceived > total) {
    return res.status(400).json({
      error: `Amount received (Rs. ${parsedReceived}) cannot exceed total sale amount (Rs. ${total}).`
    });
  }

  const balance = Math.max(0, total - parsedReceived);

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (balance === 0 && total > 0) {
    paymentStatus = 'Paid';
  } else if (parsedReceived > 0 && balance > 0) {
    paymentStatus = 'Partial';
  } else if (total === 0) {
    paymentStatus = 'Paid';
  }

  const saleId = crypto.randomUUID();
  const invoiceNumber = generateInvoiceNumber();
  const now = new Date().toISOString();
  const actualSaleDate = sale_date ? sale_date.trim() : now.substring(0, 10);

  // Execute database transaction atomically
  try {
    db.exec('BEGIN TRANSACTION');

    // 1. Insert sale record
    db.prepare(`
      INSERT INTO sales (
        id, invoice_number, customer_id, sale_date,
        gross_total, discount, total, amount_paid, balance,
        payment_status, notes, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      saleId,
      invoiceNumber,
      customer_id,
      actualSaleDate,
      grossTotal,
      parsedOverallDiscount,
      total,
      parsedReceived,
      balance,
      paymentStatus,
      notes ? notes.trim() : null,
      req.user!.id,
      now,
      now
    );

    // 2. Insert sale items & deduct product stock
    const insertItemStmt = db.prepare(`
      INSERT INTO sale_items (
        id, sale_id, product_id, quantity, unit_price, discount, subtotal, cost_price, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStockStmt = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?, updated_at = ?
      WHERE id = ?
    `);

    for (const item of processedItems) {
      const itemId = crypto.randomUUID();
      insertItemStmt.run(
        itemId,
        saleId,
        item.product_id,
        item.quantity,
        item.unit_price,
        item.discount,
        item.subtotal,
        item.cost_price,
        now
      );

      updateStockStmt.run(item.quantity, now, item.product_id);
    }

    // 3. Record payment if amount received > 0
    if (parsedReceived > 0) {
      const paymentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO payments (
          id, sale_id, customer_id, amount, payment_method, payment_date, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        saleId,
        customer_id,
        parsedReceived,
        payment_method,
        actualSaleDate,
        payment_notes ? payment_notes.trim() : 'Initial payment on sale creation',
        req.user!.id,
        now
      );
    }

    db.exec('COMMIT');

    // Fetch complete newly created sale
    const createdSale = db.prepare(`
      SELECT s.*, c.full_name AS customer_name, c.phone AS customer_phone
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(saleId);

    res.status(201).json({
      sale: createdSale,
      message: `Sale ${invoiceNumber} created successfully.`
    });
  } catch (error: any) {
    db.exec('ROLLBACK');
    console.error('Sale transaction error:', error);
    res.status(500).json({ error: 'Failed to process sale transaction: ' + error.message });
  }
});

// Cancel sale and restore stock (Rule 2)
salesRouter.post('/:id/cancel', (req, res) => {
  const { id } = req.params;

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any;
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found.' });
  }

  if (sale.status === 'Cancelled') {
    return res.status(400).json({ error: 'This sale has already been cancelled.' });
  }

  const items = db.prepare('SELECT product_id, quantity FROM sale_items WHERE sale_id = ?').all(id) as any[];

  try {
    db.exec('BEGIN TRANSACTION');

    const now = new Date().toISOString();

    // 1. Restore stock for all products
    const restoreStockStmt = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?, updated_at = ?
      WHERE id = ?
    `);

    for (const item of items) {
      restoreStockStmt.run(item.quantity, now, item.product_id);
    }

    // 2. Mark sale as Cancelled with audit trail
    db.prepare(`
      UPDATE sales
      SET status = 'Cancelled', cancelled_at = ?, cancelled_by = ?, updated_at = ?
      WHERE id = ?
    `).run(now, req.user!.id, now, id);

    db.exec('COMMIT');

    const updatedSale = db.prepare(`
      SELECT 
        s.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        prof.full_name AS created_by_name,
        canc.full_name AS cancelled_by_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      LEFT JOIN profiles prof ON s.created_by = prof.id
      LEFT JOIN profiles canc ON s.cancelled_by = canc.id
      WHERE s.id = ?
    `).get(id);

    res.json({
      sale: updatedSale,
      message: `Sale ${sale.invoice_number} cancelled and stock restored successfully.`
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel sale: ' + err.message });
  }
});
