import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

export const paymentsRouter = Router();
paymentsRouter.use(authenticate);

// Record installment payment against a sale
paymentsRouter.post('/', (req, res) => {
  const {
    sale_id,
    amount,
    payment_method,
    payment_date,
    notes
  } = req.body;

  if (!sale_id) {
    return res.status(400).json({ error: 'Sale ID is required.' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
  }

  if (!payment_method || !['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'].includes(payment_method)) {
    return res.status(400).json({ error: 'Valid payment method (Cash, Bank Transfer, Easypaisa, JazzCash, Other) is required.' });
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale_id) as any;
  if (!sale) {
    return res.status(404).json({ error: 'Sale record not found.' });
  }

  if (sale.status === 'Cancelled') {
    return res.status(400).json({ error: 'Cannot record payments against a cancelled sale.' });
  }

  // Rule 4: Payment cannot exceed remaining outstanding balance
  if (parsedAmount > sale.balance + 0.01) { // 0.01 epsilon
    return res.status(400).json({
      error: `Payment amount (Rs. ${parsedAmount.toLocaleString()}) cannot exceed remaining balance (Rs. ${sale.balance.toLocaleString()}).`
    });
  }

  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();
  const actualDate = payment_date ? payment_date.trim() : now.substring(0, 10);

  const newAmountPaid = sale.amount_paid + parsedAmount;
  const newBalance = Math.max(0, sale.balance - parsedAmount);
  const newStatus = newBalance <= 0.01 ? 'Paid' : 'Partial';

  try {
    db.exec('BEGIN TRANSACTION');

    // 1. Insert payment record
    db.prepare(`
      INSERT INTO payments (
        id, sale_id, customer_id, amount, payment_method, payment_date, notes, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      sale_id,
      sale.customer_id,
      parsedAmount,
      payment_method,
      actualDate,
      notes ? notes.trim() : 'Installment payment',
      req.user!.id,
      now
    );

    // 2. Update sale balance and payment_status
    db.prepare(`
      UPDATE sales
      SET amount_paid = ?, balance = ?, payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(newAmountPaid, newBalance, newStatus, now, sale_id);

    db.exec('COMMIT');

    const updatedSale = db.prepare(`
      SELECT s.*, c.full_name AS customer_name, c.phone AS customer_phone
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(sale_id);

    const paymentRecord = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

    res.status(201).json({
      payment: paymentRecord,
      sale: updatedSale,
      message: `Payment of Rs. ${parsedAmount.toLocaleString()} recorded successfully. Remaining balance: Rs. ${newBalance.toLocaleString()}.`
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to record payment: ' + err.message });
  }
});

// Get payment history for a specific customer or sale
paymentsRouter.get('/sale/:sale_id', (req, res) => {
  const { sale_id } = req.params;
  const payments = db.prepare(`
    SELECT pay.*, prof.full_name AS created_by_name
    FROM payments pay
    LEFT JOIN profiles prof ON pay.created_by = prof.id
    WHERE pay.sale_id = ?
    ORDER BY pay.payment_date DESC, pay.created_at DESC
  `).all(sale_id);

  res.json({ data: payments });
});
