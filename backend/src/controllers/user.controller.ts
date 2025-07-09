import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement update profile
    res.json({ message: 'Update profile not implemented' });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement delete account
    res.json({ message: 'Delete account not implemented' });
  } catch (error) {
    next(error);
  }
};