import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';

export const expensesRouter = Router();

// Strictly protect all expense operations to Owner only
expensesRouter.use(authenticate, requireOwner);

// List expenses with category and date filtering
expensesRouter.get('/', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const dateFrom = typeof req.query.date_from === 'string' ? req.query.date_from.trim() : '';
  const dateTo = typeof req.query.date_to === 'string' ? req.query.date_to.trim() : '';

  const filters: string[] = [];
  const params: any[] = [];

  if (category) {
    filters.push('e.category = ?');
    params.push(category);
  }
  if (dateFrom) {
    filters.push('e.date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    filters.push('e.date <= ?');
    params.push(dateTo);
  }

  const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const expenses = db.prepare(`
    SELECT e.*, prof.full_name AS created_by_name
    FROM expenses e
    LEFT JOIN profiles prof ON e.created_by = prof.id
    ${whereSql}
    ORDER BY e.date DESC, e.created_at DESC
  `).all(...params);

  const totalAmount = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

  res.json({
    data: expenses,
    summary: {
      total_expenses: totalAmount,
      count: expenses.length
    }
  });
});

// Add expense
expensesRouter.post('/', (req, res) => {
  const { category, amount, description, date, payment_method } = req.body;

  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Expense category is required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Valid expense amount greater than 0 is required.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expenseDate = date ? date.trim() : now.substring(0, 10);

  db.prepare(`
    INSERT INTO expenses (id, category, amount, description, date, payment_method, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    category.trim(),
    parsedAmount,
    description ? description.trim() : null,
    expenseDate,
    payment_method ? payment_method.trim() : 'Cash',
    req.user!.id,
    now
  );

  const created = db.prepare(`
    SELECT e.*, prof.full_name AS created_by_name
    FROM expenses e
    LEFT JOIN profiles prof ON e.created_by = prof.id
    WHERE e.id = ?
  `).get(id);

  res.status(201).json({ expense: created, message: 'Expense recorded successfully.' });
});

// Update expense
expensesRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { category, amount, description, date, payment_method } = req.body;

  const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Expense record not found.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Valid expense amount greater than 0 is required.' });
  }

  db.prepare(`
    UPDATE expenses
    SET category = ?, amount = ?, description = ?, date = ?, payment_method = ?
    WHERE id = ?
  `).run(
    category.trim(),
    parsedAmount,
    description ? description.trim() : null,
    date,
    payment_method,
    id
  );

  const updated = db.prepare(`
    SELECT e.*, prof.full_name AS created_by_name
    FROM expenses e
    LEFT JOIN profiles prof ON e.created_by = prof.id
    WHERE e.id = ?
  `).get(id);

  res.json({ expense: updated, message: 'Expense updated successfully.' });
});

// Delete expense
expensesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  res.json({ message: 'Expense deleted successfully.' });
});
