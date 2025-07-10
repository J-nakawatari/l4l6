import { User, IUser } from '../../src/models/User';

interface UserFactoryOptions {
  email?: string;
  password?: string;
  name?: string;
  bio?: string;
  role?: 'user' | 'admin';
  emailVerified?: boolean;
  subscription?: {
    status: 'active' | 'inactive' | 'cancelled';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
  };
}

let userCounter = 0;

export const createUser = async (options: UserFactoryOptions = {}): Promise<IUser> => {
  userCounter++;
  
  const defaultData = {
    email: `user${userCounter}@example.com`,
    password: 'SecurePass123!',
    name: `テストユーザー${userCounter}`,
    role: 'user' as const,
    emailVerified: false,
  };

  const userData = { ...defaultData, ...options };
  return User.create(userData);
};

export const createAdmin = async (options: UserFactoryOptions = {}): Promise<IUser> => {
  return createUser({
    ...options,
    role: 'admin',
    name: options.name || '管理者',
  });
};

export const createSubscribedUser = async (options: UserFactoryOptions = {}): Promise<IUser> => {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1); // 1ヶ月後

  return createUser({
    ...options,
    subscription: {
      status: 'active',
      stripeCustomerId: `cus_test_${Date.now()}`,
      stripeSubscriptionId: `sub_test_${Date.now()}`,
      currentPeriodEnd: futureDate,
      ...options.subscription,
    },
  });
};

export const resetUserCounter = (): void => {
  userCounter = 0;
};