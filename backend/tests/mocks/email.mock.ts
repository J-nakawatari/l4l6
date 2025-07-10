// メール送信のモック
export const mockSendEmail = jest.fn().mockResolvedValue(undefined);
export const mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined);
export const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);
export const mockSendSubscriptionConfirmationEmail = jest.fn().mockResolvedValue(undefined);
export const mockSendPredictionNotificationEmail = jest.fn().mockResolvedValue(undefined);

// utils/emailモジュールをモック
jest.mock('../../src/utils/email', () => ({
  sendEmail: mockSendEmail,
  sendVerificationEmail: mockSendVerificationEmail,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  sendSubscriptionConfirmationEmail: mockSendSubscriptionConfirmationEmail,
  sendPredictionNotificationEmail: mockSendPredictionNotificationEmail,
}));