import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

export const customersRouter = Router();
customersRouter.use(authenticate);

// List customers with search, pagination, and calculated balances
customersRouter.get('/', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const includeInactive = req.query.include_inactive === 'true';

  const filterSql = includeInactive ? '' : 'AND c.active = 1';
  const searchSql = search ? 'AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)' : '';
  const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  // Count total matching
  const countQuery = `
    SELECT COUNT(*) as total
    FROM customers c
    WHERE 1=1 ${filterSql} ${searchSql}
  `;
  const countRes = db.prepare(countQuery).get(...searchParams) as { total: number };
  const total = countRes ? countRes.total : 0;

  // Query customers with aggregation for latest prescription date, total purchases, and outstanding balance
  const listQuery = `
    SELECT 
      c.id,
      c.full_name,
      c.phone,
      c.email,
      c.address,
      c.notes,
      c.active,
      c.created_at,
      c.updated_at,
      (
        SELECT MAX(test_date)
        FROM prescriptions p
        WHERE p.customer_id = c.id
      ) AS latest_prescription_date,
      COALESCE((
        SELECT SUM(s.total)
        FROM sales s
        WHERE s.customer_id = c.id AND s.status != 'Cancelled'
      ), 0) AS total_purchases,
      COALESCE((
        SELECT SUM(s.balance)
        FROM sales s
        WHERE s.customer_id = c.id AND s.status != 'Cancelled'
      ), 0) AS outstanding_balance,
      (
        SELECT COUNT(*)
        FROM sales s
        WHERE s.customer_id = c.id AND s.status != 'Cancelled'
      ) AS orders_count
    FROM customers c
    WHERE 1=1 ${filterSql} ${searchSql}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const customers = db.prepare(listQuery).all(...searchParams, limit, offset);

  res.json({
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Get single customer details with full history
customersRouter.get('/:id', (req, res) => {
  const { id } = req.params;

  const customer = db.prepare(`
    SELECT 
      c.*,
      COALESCE((SELECT SUM(s.total) FROM sales s WHERE s.customer_id = c.id AND s.status != 'Cancelled'), 0) AS total_purchases,
      COALESCE((SELECT SUM(s.amount_paid) FROM sales s WHERE s.customer_id = c.id AND s.status != 'Cancelled'), 0) AS total_paid,
      COALESCE((SELECT SUM(s.balance) FROM sales s WHERE s.customer_id = c.id AND s.status != 'Cancelled'), 0) AS total_outstanding,
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status != 'Cancelled') AS orders_count
    FROM customers c
    WHERE c.id = ?
  `).get(id) as any;

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Fetch prescriptions chronologically (latest first)
  const prescriptions = db.prepare(`
    SELECT p.*, prof.full_name AS created_by_name
    FROM prescriptions p
    LEFT JOIN profiles prof ON p.created_by = prof.id
    WHERE p.customer_id = ?
    ORDER BY p.test_date DESC, p.created_at DESC
  `).all(id);

  // Fetch sales history
  const sales = db.prepare(`
    SELECT 
      s.*,
      prof.full_name AS created_by_name,
      (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS items_count
    FROM sales s
    LEFT JOIN profiles prof ON s.created_by = prof.id
    WHERE s.customer_id = ?
    ORDER BY s.sale_date DESC, s.created_at DESC
  `).all(id);

  res.json({
    customer,
    prescriptions,
    sales
  });
});

// Create customer
customersRouter.post('/', (req, res) => {
  const { full_name, phone, email, address, notes } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Customer full name is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Customer phone number is required.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customers (id, full_name, phone, email, address, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    id,
    full_name.trim(),
    phone.trim(),
    email ? email.trim() : null,
    address ? address.trim() : null,
    notes ? notes.trim() : null,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.status(201).json({ customer: created, message: 'Customer created successfully.' });
});

// Update customer
customersRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { full_name, phone, email, address, notes } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Customer full name is required.' });
  }
  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Customer phone number is required.' });
  }

  const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE customers
    SET full_name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    full_name.trim(),
    phone.trim(),
    email ? email.trim() : null,
    address ? address.trim() : null,
    notes ? notes.trim() : null,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json({ customer: updated, message: 'Customer updated successfully.' });
});

// Soft archive customer
customersRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id, full_name FROM customers WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  db.prepare('UPDATE customers SET active = 0, updated_at = ? WHERE id = ?').run(now, id);
  res.json({ message: `Customer ${existing.full_name} archived successfully.` });
});

// Restore customer
customersRouter.post('/:id/restore', (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  db.prepare('UPDATE customers SET active = 1, updated_at = ? WHERE id = ?').run(now, id);
  res.json({ message: 'Customer restored successfully.' });
});
