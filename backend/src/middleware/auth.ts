import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'optics-shop-manager-super-secret-key-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'staff';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    // Query user profile and role
    const user = db.prepare(`
      SELECT p.id, p.full_name, p.email, ur.role
      FROM profiles p
      JOIN user_roles ur ON p.id = ur.user_id
      WHERE p.id = ?
    `).get(decoded.id) as AuthenticatedUser | undefined;

    if (!user) {
      return res.status(401).json({ error: 'User not found or account deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}
