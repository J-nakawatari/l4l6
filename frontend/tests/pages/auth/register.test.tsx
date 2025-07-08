import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegisterPage from '@/app/register/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
};

describe('RegisterPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockPush.mockClear();
  });

  it('登録フォームが表示される', () => {
    render(<RegisterPage />);
    
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '無料会員登録' })).toBeInTheDocument();
  });

  it('利用規約への同意チェックボックスが表示される', () => {
    render(<RegisterPage />);
    
    expect(screen.getByLabelText(/利用規約に同意する/)).toBeInTheDocument();
    expect(screen.getByText(/利用規約/)).toHaveAttribute('href', '/terms');
  });

  it('ログインページへのリンクが表示される', () => {
    render(<RegisterPage />);
    
    const loginLink = screen.getByText('既にアカウントをお持ちの方');
    expect(loginLink).toBeInTheDocument();
  });

  it('空のフォームで送信するとエラーが表示される', async () => {
    render(<RegisterPage />);
    
    const submitButton = screen.getByRole('button', { name: '無料会員登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('メールアドレスを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
      expect(screen.getByText('パスワード（確認）を入力してください')).toBeInTheDocument();
    });
  });

  it('パスワードが一致しない場合エラーが表示される', async () => {
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）');
    const agreeCheckbox = screen.getByLabelText(/利用規約に同意する/);
    const submitButton = screen.getByRole('button', { name: '無料会員登録' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });
    fireEvent.click(agreeCheckbox);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  it('利用規約に同意していない場合エラーが表示される', async () => {
    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）');
    const submitButton = screen.getByRole('button', { name: '無料会員登録' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('利用規約に同意してください')).toBeInTheDocument();
    });
  });

  it('正しい情報で登録を試みる', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: '登録完了' }),
      })
    ) as jest.Mock;

    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）');
    const agreeCheckbox = screen.getByLabelText(/利用規約に同意する/);
    const submitButton = screen.getByRole('button', { name: '無料会員登録' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(agreeCheckbox);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('登録失敗時にエラーメッセージが表示される', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ message: 'このメールアドレスは既に登録されています' }),
      })
    ) as jest.Mock;

    render(<RegisterPage />);
    
    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）');
    const agreeCheckbox = screen.getByLabelText(/利用規約に同意する/);
    const submitButton = screen.getByRole('button', { name: '無料会員登録' });
    
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(agreeCheckbox);
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('このメールアドレスは既に登録されています')).toBeInTheDocument();
    });
  });
});