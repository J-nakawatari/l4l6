import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from '@/app/page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('LandingPage', () => {
  it('ヘッダーにサービス名が表示される', () => {
    render(<LandingPage />);
    expect(screen.getByText('ロト6予想AI')).toBeInTheDocument();
  });

  it('過去の当選実績が表示される', () => {
    render(<LandingPage />);
    expect(screen.getByText(/過去当選/)).toBeInTheDocument();
    expect(screen.getByText(/合計当選額/)).toBeInTheDocument();
  });

  it('サービスの特徴が表示される', () => {
    render(<LandingPage />);
    expect(screen.getByText('📊 過去データからの統計予想')).toBeInTheDocument();
    expect(screen.getByText('🤖 AIによる10点予想')).toBeInTheDocument();
  });

  it('ログインボタンが表示される', () => {
    render(<LandingPage />);
    const loginButton = screen.getByRole('button', { name: /ログイン/ });
    expect(loginButton).toBeInTheDocument();
  });

  it('無料会員登録ボタンが表示される', () => {
    render(<LandingPage />);
    const registerButtons = screen.getAllByRole('button', { name: /無料会員登録/ });
    expect(registerButtons.length).toBeGreaterThan(0);
  });

  it('パスワード忘れリンクが表示される', () => {
    render(<LandingPage />);
    const forgotLink = screen.getByText(/パスワードを忘れた方はこちら/);
    expect(forgotLink).toBeInTheDocument();
  });

  it('過去の予想結果サンプルが表示される', () => {
    render(<LandingPage />);
    expect(screen.getByText(/第643回/)).toBeInTheDocument();
    const winnerTexts = screen.getAllByText('当選！');
    expect(winnerTexts.length).toBeGreaterThan(0);
  });

  it('CTAセクションが表示される', () => {
    render(<LandingPage />);
    expect(screen.getByText(/ログインして過去の結果を見る/)).toBeInTheDocument();
    expect(screen.getByText(/会員登録して次回予想を見る/)).toBeInTheDocument();
  });
});