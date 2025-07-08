import { Request, Response, NextFunction } from 'express';

export const getProfile = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement get profile
    res.json({ message: 'Get profile not implemented' });
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