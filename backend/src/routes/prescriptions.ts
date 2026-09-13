import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

export const prescriptionsRouter = Router();
prescriptionsRouter.use(authenticate);

// Get single prescription with customer details for printing or viewing
prescriptionsRouter.get('/:id', (req, res) => {
  const { id } = req.params;

  const prescription = db.prepare(`
    SELECT 
      p.*,
      c.full_name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      c.address AS customer_address,
      prof.full_name AS created_by_name
    FROM prescriptions p
    JOIN customers c ON p.customer_id = c.id
    LEFT JOIN profiles prof ON p.created_by = prof.id
    WHERE p.id = ?
  `).get(id);

  if (!prescription) {
    return res.status(404).json({ error: 'Prescription record not found.' });
  }

  res.json({ prescription });
});

// Add new prescription (immutable chronological record)
prescriptionsRouter.post('/', (req, res) => {
  const {
    customer_id,
    right_sphere,
    right_cylinder,
    right_axis,
    right_add,
    left_sphere,
    left_cylinder,
    left_axis,
    left_add,
    pupillary_distance,
    prescribing_doctor,
    test_date,
    remarks
  } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Customer ID is required.' });
  }
  if (!test_date) {
    return res.status(400).json({ error: 'Prescription test date is required.' });
  }

  // Verify customer exists
  const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO prescriptions (
      id, customer_id,
      right_sphere, right_cylinder, right_axis, right_add,
      left_sphere, left_cylinder, left_axis, left_add,
      pupillary_distance, prescribing_doctor, test_date, remarks,
      created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    customer_id,
    right_sphere || null,
    right_cylinder || null,
    right_axis || null,
    right_add || null,
    left_sphere || null,
    left_cylinder || null,
    left_axis || null,
    left_add || null,
    pupillary_distance || null,
    prescribing_doctor || null,
    test_date,
    remarks || null,
    req.user!.id,
    now
  );

  const created = db.prepare(`
    SELECT p.*, prof.full_name AS created_by_name
    FROM prescriptions p
    LEFT JOIN profiles prof ON p.created_by = prof.id
    WHERE p.id = ?
  `).get(id);

  res.status(201).json({
    prescription: created,
    message: 'Prescription record added successfully.'
  });
});
