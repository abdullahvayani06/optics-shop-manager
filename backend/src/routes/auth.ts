import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../config/database.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

export const authRouter = Router();

// Rate limiter for login endpoint to prevent brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' }
});

// Public login endpoint
authRouter.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both email and password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = db.prepare(`
    SELECT p.id, p.full_name, p.email, p.phone, p.avatar_url, p.password_hash, ur.role
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    WHERE LOWER(p.email) = ? AND p.active = 1
  `).get(normalizedEmail) as any;

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as any }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.role
    }
  });
});

// Current user profile
authRouter.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT p.id, p.full_name, p.email, p.phone, p.avatar_url, ur.role, p.created_at
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  res.json({ user });
});

// Update own profile
authRouter.put('/profile', authenticate, (req, res) => {
  const { full_name, phone } = req.body;
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE profiles
    SET full_name = ?, phone = ?, updated_at = ?
    WHERE id = ?
  `).run(full_name.trim(), phone ? phone.trim() : null, now, req.user!.id);

  const updated = db.prepare(`
    SELECT p.id, p.full_name, p.email, p.phone, p.avatar_url, ur.role
    FROM profiles p
    JOIN user_roles ur ON p.id = ur.user_id
    WHERE p.id = ?
  `).get(req.user!.id);

  res.json({ user: updated, message: 'Profile updated successfully.' });
});

// Change password
authRouter.put('/change-password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const profile = db.prepare('SELECT password_hash FROM profiles WHERE id = ?').get(req.user!.id) as any;
  if (!profile || !bcrypt.compareSync(current_password, profile.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  const now = new Date().toISOString();
  db.prepare('UPDATE profiles SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, req.user!.id);

  res.json({ message: 'Password updated successfully.' });
});
