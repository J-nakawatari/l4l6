// テスト環境用の環境変数を設定
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'mongodb://localhost:27017/l4l6-test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy_secret';
process.env.FRONTEND_URL = 'http://localhost:3001';

// 絶対にメールを送信しないようにする
delete process.env.SENDGRID_API_KEY;
delete process.env.SENDGRID_FROM_EMAIL;
delete process.env.SENDGRID_VERIFICATION_TEMPLATE_ID;

// メール送信をモック
import './mocks/email.mock';

// グローバルタイムアウトを設定
jest.setTimeout(30000);