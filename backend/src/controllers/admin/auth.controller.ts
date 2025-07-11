import { Request, Response, NextFunction } from 'express';
import { Admin } from '../../models/Admin';
import jwt from 'jsonwebtoken';

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } });
      return;
    }

    // Find admin user
    const admin = await Admin.findOne({ email, isActive: true });
    if (!admin) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    // Check password
    const isValid = await admin.comparePassword(password);
    if (!isValid) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }
    
    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role, isAdmin: true },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 2FA is not implemented for simplicity
    res.status(404).json({ error: { code: 'NOT_IMPLEMENTED', message: '2FA is not implemented' } });
  } catch (error) {
    next(error);
  }
};

export const adminLogout = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('adminToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};