// テスト環境用の環境変数を設定
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.MONGODB_URI = 'mongodb://admin:password@localhost:27017/l4l6-test?authSource=admin';
process.env.DATABASE_URL = 'mongodb://admin:password@localhost:27017/l4l6-test?authSource=admin'; // 互換性のため両方設定
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