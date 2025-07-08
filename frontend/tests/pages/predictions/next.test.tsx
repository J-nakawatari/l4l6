import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextPredictionPage from '@/app/predictions/next/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/predictions/next',
}));

describe('NextPredictionPage', () => {
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

  it('有料会員の場合、次回予想が表示される', async () => {
    const mockData = {
      prediction: {
        id: '1',
        drawNumber: 1236,
        drawDate: '2024-01-29T00:00:00Z',
        dataLogicPredictions: ['1234', '5678', '9012'],
        aiPredictions: ['2345', '6789', '0123'],
        viewCount: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('次回予想 - 第1236回')).toBeInTheDocument();
      expect(screen.getByText('抽選日: 2024/1/29')).toBeInTheDocument();
    });
  });

  it('データロジック予想が表示される', async () => {
    const mockData = {
      prediction: {
        id: '1',
        drawNumber: 1236,
        drawDate: '2024-01-29T00:00:00Z',
        dataLogicPredictions: ['1234', '5678', '9012'],
        aiPredictions: ['2345', '6789', '0123'],
        viewCount: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('データ分析による予想')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('5678')).toBeInTheDocument();
      expect(screen.getByText('9012')).toBeInTheDocument();
    });
  });

  it('AI予想が表示される', async () => {
    const mockData = {
      prediction: {
        id: '1',
        drawNumber: 1236,
        drawDate: '2024-01-29T00:00:00Z',
        dataLogicPredictions: ['1234', '5678', '9012'],
        aiPredictions: ['2345', '6789', '0123'],
        viewCount: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('AIによる予想')).toBeInTheDocument();
      expect(screen.getByText('2345')).toBeInTheDocument();
      expect(screen.getByText('6789')).toBeInTheDocument();
      expect(screen.getByText('0123')).toBeInTheDocument();
    });
  });

  it('購入のヒントが表示される', async () => {
    const mockData = {
      prediction: {
        id: '1',
        drawNumber: 1236,
        drawDate: '2024-01-29T00:00:00Z',
        dataLogicPredictions: ['1234', '5678', '9012'],
        aiPredictions: ['2345', '6789', '0123'],
        viewCount: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('購入のヒント')).toBeInTheDocument();
      expect(screen.getByText(/ストレート購入/)).toBeInTheDocument();
      expect(screen.getByText(/ボックス購入/)).toBeInTheDocument();
    });
  });

  it('認証エラーの場合、ログインページにリダイレクトされる', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('サブスクリプションがない場合、エラーメッセージが表示される', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'Active subscription required',
        },
      }),
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('有料会員限定コンテンツ')).toBeInTheDocument();
      expect(screen.getByText(/このページは有料会員限定です/)).toBeInTheDocument();
      expect(screen.getByText('サブスクリプションに登録')).toBeInTheDocument();
    });
  });

  it('サブスクリプションが期限切れの場合、エラーメッセージが表示される', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Your subscription has expired',
        },
      }),
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('サブスクリプションの有効期限が切れています')).toBeInTheDocument();
      expect(screen.getByText(/サブスクリプションを更新してください/)).toBeInTheDocument();
      expect(screen.getByText('サブスクリプションを更新')).toBeInTheDocument();
    });
  });

  it('予想がまだない場合、適切なメッセージが表示される', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: {
          code: 'NO_PREDICTIONS',
          message: 'No predictions available',
        },
      }),
    });

    render(<NextPredictionPage />);

    await waitFor(() => {
      expect(screen.getByText('次回予想はまだ準備中です')).toBeInTheDocument();
      expect(screen.getByText(/次回予想は抽選日の3日前に公開されます/)).toBeInTheDocument();
    });
  });

  it('ローディング中はスピナーが表示される', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<NextPredictionPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});