import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { AppError } from './errorHandler';

export interface AdminRequest extends Request {
  admin?: any;
}

export const adminAuth = async (req: AdminRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.adminToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('No admin token provided', 401, 'UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify it's an admin token
    if (!decoded.isAdmin) {
      throw new AppError('Invalid admin token', 403, 'FORBIDDEN');
    }
    
    // Load admin from database
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      throw new AppError('Admin not found or inactive', 401, 'UNAUTHORIZED');
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid admin token', 401, 'UNAUTHORIZED'));
    }
  }
};