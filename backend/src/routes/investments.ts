import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';

export const investmentsRouter = Router();

// Strictly protect all investment operations to Owner only
investmentsRouter.use(authenticate, requireOwner);

// List investments
investmentsRouter.get('/', (req, res) => {
  const investments = db.prepare(`
    SELECT inv.*, prof.full_name AS created_by_name
    FROM investments inv
    LEFT JOIN profiles prof ON inv.created_by = prof.id
    ORDER BY inv.date DESC, inv.created_at DESC
  `).all();

  const totalInvested = investments.reduce((sum: number, inv: any) => sum + inv.amount, 0);

  res.json({
    data: investments,
    summary: {
      total_invested: totalInvested,
      count: investments.length
    }
  });
});

// Add investment
investmentsRouter.post('/', (req, res) => {
  const { date, amount, investment_type, description, notes } = req.body;

  if (!investment_type || !['Initial Capital', 'Additional Capital', 'Owner Contribution', 'Other'].includes(investment_type)) {
    return res.status(400).json({ error: 'Valid investment type (Initial Capital, Additional Capital, Owner Contribution, Other) is required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Valid investment amount greater than 0 is required.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const investDate = date ? date.trim() : now.substring(0, 10);

  db.prepare(`
    INSERT INTO investments (id, date, amount, investment_type, description, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    investDate,
    parsedAmount,
    investment_type,
    description ? description.trim() : null,
    notes ? notes.trim() : null,
    req.user!.id,
    now
  );

  const created = db.prepare(`
    SELECT inv.*, prof.full_name AS created_by_name
    FROM investments inv
    LEFT JOIN profiles prof ON inv.created_by = prof.id
    WHERE inv.id = ?
  `).get(id);

  res.status(201).json({ investment: created, message: 'Investment recorded successfully.' });
});

// Update investment
investmentsRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { date, amount, investment_type, description, notes } = req.body;

  const existing = db.prepare('SELECT id FROM investments WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Investment record not found.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Valid investment amount greater than 0 is required.' });
  }

  db.prepare(`
    UPDATE investments
    SET date = ?, amount = ?, investment_type = ?, description = ?, notes = ?
    WHERE id = ?
  `).run(
    date,
    parsedAmount,
    investment_type,
    description ? description.trim() : null,
    notes ? notes.trim() : null,
    id
  );

  const updated = db.prepare(`
    SELECT inv.*, prof.full_name AS created_by_name
    FROM investments inv
    LEFT JOIN profiles prof ON inv.created_by = prof.id
    WHERE inv.id = ?
  `).get(id);

  res.json({ investment: updated, message: 'Investment updated successfully.' });
});

// Delete investment
investmentsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM investments WHERE id = ?').run(id);
  res.json({ message: 'Investment deleted successfully.' });
});
