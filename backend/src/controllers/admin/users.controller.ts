import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';

export const getUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement get users
    res.json({ message: 'Get users not implemented' });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement get user by ID
    res.json({ message: 'Get user by ID not implemented' });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement update user
    res.json({ message: 'Update user not implemented' });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement delete user
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const sendEmailToUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { subject, message, type } = req.body;

    // バリデーション
    if (!subject || !message || !type) {
      res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Subject, message, and type are required' } });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return;
    }

    // TODO: 実際のメール送信実装
    // ここでは一旦成功を返す
    res.json({ 
      message: 'Email sent successfully',
      email: {
        to: user.email,
        subject,
        type
      }
    });
  } catch (error) {
    next(error);
  }
};