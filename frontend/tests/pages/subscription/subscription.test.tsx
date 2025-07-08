import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SubscriptionPage from '@/app/subscription/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/subscription',
}));

// Stripeのモック
jest.mock('@stripe/stripe-js', () => {
  const mockRedirectToCheckout = jest.fn();
  return {
    loadStripe: jest.fn(() => Promise.resolve({
      redirectToCheckout: mockRedirectToCheckout,
    })),
    __mockRedirectToCheckout: mockRedirectToCheckout,
  };
});

describe('SubscriptionPage', () => {
  const mockPush = jest.fn();
  const stripeModule = require('@stripe/stripe-js') as any;
  const mockRedirectToCheckout = stripeModule.__mockRedirectToCheckout;

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
    mockRedirectToCheckout.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('サブスクリプションプランが表示される', async () => {
    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription: null }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('プランを選択')).toBeInTheDocument();
      expect(screen.getByText('ベーシックプラン')).toBeInTheDocument();
      expect(screen.getByText('プレミアムプラン')).toBeInTheDocument();
    });
  });

  it('ベーシックプランの詳細が表示される', async () => {
    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription: null }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      const basicPlan = screen.getByTestId('plan-basic');
      expect(basicPlan).toHaveTextContent('月額 980円');
      expect(basicPlan).toHaveTextContent('データ分析予想');
      expect(basicPlan).toHaveTextContent('過去の予想結果閲覧');
    });
  });

  it('プレミアムプランの詳細が表示される', async () => {
    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription: null }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      const premiumPlan = screen.getByTestId('plan-premium');
      expect(premiumPlan).toHaveTextContent('月額 1,980円');
      expect(premiumPlan).toHaveTextContent('AI予想＋データ分析予想');
      expect(premiumPlan).toHaveTextContent('予想の詳細解説');
      expect(premiumPlan).toHaveTextContent('当選確率の統計情報');
    });
  });

  it('プランを選択してCheckoutできる', async () => {
    mockRedirectToCheckout.mockResolvedValue({ error: null });

    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscription: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'test-session-id' }),
      });

    render(<SubscriptionPage />);

    // コンポーネントの初期化を待つ
    await waitFor(() => {
      expect(screen.getByText('プランを選択')).toBeInTheDocument();
    });

    const selectButton = screen.getAllByText('このプランを選択')[0];
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockRedirectToCheckout).toHaveBeenCalledWith({
        sessionId: 'test-session-id',
      });
    });
  });

  it('Checkoutエラー時にエラーメッセージが表示される', async () => {
    mockRedirectToCheckout.mockResolvedValue({ 
      error: { message: '決済処理中にエラーが発生しました' } 
    });

    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscription: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessionId: 'test-session-id' }),
      });

    render(<SubscriptionPage />);

    // コンポーネントの初期化を待つ
    await waitFor(() => {
      expect(screen.getByText('プランを選択')).toBeInTheDocument();
    });

    const selectButton = screen.getAllByText('このプランを選択')[0];
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(screen.getByText('決済処理中にエラーが発生しました')).toBeInTheDocument();
    });
  });

  it('未認証の場合、ログインページにリダイレクトされる', async () => {
    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscription: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

    render(<SubscriptionPage />);

    const selectButton = screen.getAllByText('このプランを選択')[0];
    fireEvent.click(selectButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('年間プランの割引が表示される', async () => {
    // 最初のfetchは現在のサブスクリプション情報取得
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscription: null }),
    });

    render(<SubscriptionPage />);

    // useEffectの完了を待つ
    await waitFor(() => {
      expect(screen.getByText('プランを選択')).toBeInTheDocument();
    });

    // 年間プランに切り替え
    const yearlyToggle = screen.getByLabelText('年間プラン');
    fireEvent.click(yearlyToggle);

    // ベーシックプランの年額は9,800円
    const yearlyPrices = screen.getAllByText(/年額.*円/);
    expect(yearlyPrices[0]).toHaveTextContent('年額 9,800円');
    // 両プランとも割引があるので、複数の要素が存在する
    const discountElements = screen.getAllByText('2ヶ月分お得！');
    expect(discountElements).toHaveLength(2);
  });

  it('現在のプランが表示される', async () => {
    // fetchCurrentSubscriptionで取得するユーザー情報にサブスクリプション情報を含める
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        email: 'test@example.com',
        subscription: {
          plan: 'premium',
          status: 'active',
          expiresAt: '2025-08-01T00:00:00Z',
        },
      }),
    });

    render(<SubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText('現在のプラン: プレミアムプラン')).toBeInTheDocument();
    });
    
    // 日付の表示形式が異なる可能性があるため、より柔軟な検索を行う
    expect(screen.getByText(/有効期限.*2025.*8.*1/)).toBeInTheDocument();
  });
});