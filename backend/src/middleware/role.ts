import { Request, Response, NextFunction } from 'express';

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({
      error: 'Access denied. Owner privileges are required to view or modify financial and sensitive business information.'
    });
  }

  next();
}
