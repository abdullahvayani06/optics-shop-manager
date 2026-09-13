import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { requireOwner } from '../middleware/role.js';
import { seedDatabase } from '../seed/seedData.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

// Get business settings
settingsRouter.get('/business', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM business_settings').all() as any[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json({ settings });
});

// Update business settings (Owner only)
settingsRouter.put('/business', requireOwner, (req, res) => {
  const settings = req.body;
  const now = new Date().toISOString();

  const upsert = db.prepare(`
    INSERT INTO business_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value === 'string') {
      upsert.run(key, value, now);
    }
  }

  const rows = db.prepare('SELECT key, value FROM business_settings').all() as any[];
  const updated: Record<string, string> = {};
  for (const row of rows) {
    updated[row.key] = row.value;
  }

  res.json({ settings: updated, message: 'Business settings updated successfully.' });
});

// Staff Management (Owner only)
settingsRouter.get('/staff', requireOwner, (req, res) => {
  const staffMembers = db.prepare(`
    SELECT p.id, p.full_name, p.email, p.phone, ur.role, p.created_at, p.updated_at
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    ORDER BY ur.role ASC, p.full_name ASC
  `).all();

  res.json({ staff: staffMembers });
});

// Create new staff account (Owner only - no public signup)
settingsRouter.post('/staff', requireOwner, (req, res) => {
  const { full_name, email, phone, password, role } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const assignedRole = role === 'owner' ? 'owner' : 'staff';
  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness
  const existing = db.prepare('SELECT id FROM profiles WHERE LOWER(email) = ?').get(normalizedEmail);
  if (existing) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const userId = crypto.randomUUID();
  const roleId = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN TRANSACTION');

    db.prepare(`
      INSERT INTO profiles (id, full_name, email, phone, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      full_name.trim(),
      normalizedEmail,
      phone ? phone.trim() : null,
      passwordHash,
      now,
      now
    );

    db.prepare(`
      INSERT INTO user_roles (id, user_id, role, created_at)
      VALUES (?, ?, ?, ?)
    `).run(
      roleId,
      userId,
      assignedRole,
      now
    );

    db.exec('COMMIT');

    const createdUser = db.prepare(`
      SELECT p.id, p.full_name, p.email, p.phone, ur.role, p.created_at
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = ?
    `).get(userId);

    res.status(201).json({
      user: createdUser,
      message: `Staff account for ${full_name} created successfully.`
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to create staff account: ' + err.message });
  }
});

// Update staff account (Owner only)
settingsRouter.put('/staff/:id', requireOwner, (req, res) => {
  const { id } = req.params;
  const { full_name, phone, role, password } = req.body;

  const existing = db.prepare('SELECT id FROM profiles WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const now = new Date().toISOString();

  try {
    db.exec('BEGIN TRANSACTION');

    if (full_name) {
      db.prepare('UPDATE profiles SET full_name = ?, phone = ?, updated_at = ? WHERE id = ?').run(
        full_name.trim(),
        phone ? phone.trim() : null,
        now,
        id
      );
    }

    if (role && (role === 'owner' || role === 'staff')) {
      // Prevent demoting the last owner
      if (role === 'staff') {
        const ownerCount = (db.prepare("SELECT COUNT(*) as count FROM user_roles WHERE role = 'owner'").get() as any)?.count;
        if (ownerCount <= 1) {
          db.exec('ROLLBACK');
          return res.status(400).json({ error: 'Cannot demote the only owner in the system.' });
        }
      }
      db.prepare('UPDATE user_roles SET role = ? WHERE user_id = ?').run(role, id);
    }

    if (password && password.length >= 6) {
      const passwordHash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, id);
    }

    db.exec('COMMIT');

    const updated = db.prepare(`
      SELECT p.id, p.full_name, p.email, p.phone, ur.role, p.created_at
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = ?
    `).get(id);

    res.json({ user: updated, message: 'Staff account updated successfully.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to update staff account: ' + err.message });
  }
});

// Delete/Remove staff account (Owner only)
settingsRouter.delete('/staff/:id', requireOwner, (req, res) => {
  const { id } = req.params;

  if (id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own active owner account.' });
  }

  const role = db.prepare('SELECT role FROM user_roles WHERE user_id = ?').get(id) as any;
  if (role?.role === 'owner') {
    const ownerCount = (db.prepare("SELECT COUNT(*) as count FROM user_roles WHERE role = 'owner'").get() as any)?.count;
    if (ownerCount <= 1) {
      return res.status(400).json({ error: 'Cannot remove the sole owner account.' });
    }
  }

  db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  res.json({ message: 'Staff account removed successfully.' });
});

// Reset database to demo data (Owner only)
settingsRouter.post('/reset-demo', requireOwner, (req, res) => {
  try {
    seedDatabase(true);
    res.json({ message: 'Demo data reset successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset demo data: ' + err.message });
  }
});

// Remove Demo Data (Owner only - removes all records where is_demo = 1 while preserving real production records)
settingsRouter.delete('/demo-data', requireOwner, (req, res) => {
  try {
    db.exec('BEGIN TRANSACTION');

    // 1. Remove payments on demo sales
    db.exec(`DELETE FROM payments WHERE sale_id IN (SELECT id FROM sales WHERE is_demo = 1);`);
    // 2. Remove sale items on demo sales
    db.exec(`DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE is_demo = 1);`);
    // 3. Remove demo sales
    db.exec(`DELETE FROM sales WHERE is_demo = 1;`);
    // 4. Remove demo prescriptions
    db.exec(`DELETE FROM prescriptions WHERE is_demo = 1;`);
    // 5. Remove demo products (only if not referenced by any remaining production sales)
    db.exec(`DELETE FROM products WHERE is_demo = 1 AND id NOT IN (SELECT product_id FROM sale_items);`);
    // 6. Remove demo customers (only if not referenced by any remaining production sales)
    db.exec(`DELETE FROM customers WHERE is_demo = 1 AND id NOT IN (SELECT customer_id FROM sales);`);
    // 7. Remove demo expenses
    db.exec(`DELETE FROM expenses WHERE is_demo = 1;`);
    // 8. Remove demo investments
    db.exec(`DELETE FROM investments WHERE is_demo = 1;`);

    db.exec('COMMIT');

    res.json({ message: 'All demo records removed successfully. Production records preserved.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: 'Failed to remove demo data: ' + err.message });
  }
});
