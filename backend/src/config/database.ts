import mongoose from 'mongoose';
import { log } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/l4l6';
    
    await mongoose.connect(mongoUri);
    
    log.info('MongoDB connected successfully', { uri: mongoUri });
    
    mongoose.connection.on('error', (err) => {
      log.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      log.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    log.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};