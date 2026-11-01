import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { CONFIG } from './config.js';
import { db, User } from './db.js';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  return jwt.verify(token, CONFIG.JWT_SECRET);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token is required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = db.getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token.' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = db.getUserById(payload.id);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
}
