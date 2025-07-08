import request from 'supertest';
import app from '../../src/app';
import { IUser } from '../../src/models/User';
import { generateToken } from '../../src/utils/auth';

export interface AuthenticatedRequest {
  token: string;
  user: IUser;
}

export const loginUser = async (email: string, password: string): Promise<AuthenticatedRequest> => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.body.error?.message || 'Unknown error'}`);
  }

  // Cookieからトークンを取得
  const cookies = response.headers['set-cookie'] as string[] | undefined;
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split(';')[0]?.split('=')[1];

  if (!token) {
    throw new Error('Token not found in response');
  }

  return {
    token,
    user: response.body.user,
  };
};

export const getAuthToken = (user: IUser): string => {
  return generateToken({
    id: (user as any)._id.toString(),
    email: user.email,
    role: user.role,
  });
};

export const makeAuthenticatedRequest = (method: string, url: string, token: string) => {
  const req = (request(app) as any)[method.toLowerCase()](url);
  return req.set('Cookie', `token=${token}`);
};