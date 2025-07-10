import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Email and password are required' } });
      return;
    }

    // Find admin user
    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
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
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};