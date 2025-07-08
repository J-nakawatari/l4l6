import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/dashboard',
}));

// APIレスポンスのモック
const mockUserData = {
  email: 'test@example.com',
  subscription: {
    status: 'active',
    plan: 'premium',
    expiresAt: '2025-08-01T00:00:00Z'
  }
};

const mockPredictionData = {
  latestPrediction: {
    drawNumber: 1234,
    predictions: {
      dataLogic: ['1234', '5678', '9012', '3456', '7890'],
      ai: ['2345', '6789', '0123', '4567', '8901']
    },
    createdAt: '2025-01-08T00:00:00Z'
  }
};

const mockHistoryData = {
  predictions: [
    {
      drawNumber: 1233,
      predictions: ['1111', '2222', '3333'],
      result: { winning: '1111', isWin: true, prize: 12500 },
      createdAt: '2025-01-07T00:00:00Z'
    },
    {
      drawNumber: 1232,
      predictions: ['4444', '5555', '6666'],
      result: { winning: '7777', isWin: false, prize: 0 },
      createdAt: '2025-01-06T00:00:00Z'
    }
  ]
};

describe('DashboardPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('ダッシュボードの基本要素が表示される', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredictionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText(/次回予想/)).toBeInTheDocument();
      expect(screen.getByText(/過去の予想結果/)).toBeInTheDocument();
    });
  });

  it('有料会員の場合、次回予想が表示される', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredictionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('第1234回 予想番号')).toBeInTheDocument();
      expect(screen.getByText('データ分析予想')).toBeInTheDocument();
      expect(screen.getByText('AI予想')).toBeInTheDocument();
    });
  });

  it('無料会員の場合、アップグレード案内が表示される', async () => {
    const freeUserData = {
      ...mockUserData,
      subscription: {
        status: 'inactive',
        plan: 'free',
        expiresAt: null
      }
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => freeUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ latestPrediction: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/有料会員にアップグレード/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /プランを見る/ })).toBeInTheDocument();
    });
  });

  it('過去の予想結果が表示される', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUserData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPredictionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryData,
      });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('第1233回')).toBeInTheDocument();
      expect(screen.getByText('当選！')).toBeInTheDocument();
      expect(screen.getByText('12,500円')).toBeInTheDocument();
      expect(screen.getByText('第1232回')).toBeInTheDocument();
      expect(screen.getByText('残念...')).toBeInTheDocument();
    });
  });

  it('認証エラーの場合、ログインページにリダイレクトされる', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('ローディング中はスピナーが表示される', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<DashboardPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});