import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/login/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('LoginPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockPush.mockClear();
  });

  it('ログインフォームが表示される', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('「パスワードを忘れた方」リンクが表示される', () => {
    render(<LoginPage />);
    
    const forgotLink = screen.getByText('パスワードを忘れた方はこちら');
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute('href', '/forgot-password');
  });

  it('「新規登録」リンクが表示される', () => {
    render(<LoginPage />);
    
    const registerLink = screen.getByText('アカウントをお持ちでない方');
    expect(registerLink).toBeInTheDocument();
  });

  it('空のフォームで送信するとエラーが表示される', async () => {
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
    });
  });

  // HTML5のemail validationに依存しているため、JSDOMではテストできない
  it.skip('無効なメールアドレスでエラーが表示される', () => {
    // ブラウザのネイティブバリデーションに依存
  });

  it('正しい情報でログインを試みる', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
    ) as jest.Mock;

    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('ログイン失敗時にエラーメッセージが表示される', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'メールアドレスまたはパスワードが正しくありません' }),
      })
    ) as jest.Mock;

    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('メールアドレスまたはパスワードが正しくありません')).toBeInTheDocument();
    });
  });
});