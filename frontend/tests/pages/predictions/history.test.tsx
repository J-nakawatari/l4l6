import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PredictionHistoryPage from '@/app/predictions/history/page';
import { useRouter } from 'next/navigation';

// モック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: () => '/predictions/history',
}));

describe('PredictionHistoryPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // グローバルなモックをリセット
    if (global.URL && global.URL.createObjectURL) {
      delete (global.URL as any).createObjectURL;
    }
    // HTMLAnchorElement.prototype.clickもリセット
    if (HTMLAnchorElement.prototype.click) {
      delete (HTMLAnchorElement.prototype as any).click;
    }
  });

  it('過去の予想結果一覧が表示される', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234', '5678', '9012'],
            ai: ['2345', '6789', '0123'],
          },
          result: {
            winning: '1234',
            isWin: true,
            prize: 70000,
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
        {
          _id: '2',
          drawNumber: 1233,
          predictions: {
            dataLogic: ['1111', '2222', '3333'],
            ai: ['4444', '5555', '6666'],
          },
          result: {
            winning: '7777',
            isWin: false,
            prize: 0,
          },
          createdAt: '2024-01-08T00:00:00Z',
        },
      ],
      totalPages: 5,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('過去の予想結果')).toBeInTheDocument();
      expect(screen.getByText('第1234回')).toBeInTheDocument();
      expect(screen.getByText('第1233回')).toBeInTheDocument();
    });
  });

  it('当選した予想が緑色で表示される', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234', '5678', '9012'],
            ai: ['2345', '6789', '0123'],
          },
          result: {
            winning: '1234',
            isWin: true,
            prize: 70000,
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      ],
      totalPages: 1,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      const winCard = screen.getByTestId('prediction-1');
      expect(winCard).toHaveClass('border-green-500');
      expect(screen.getByText('当選！')).toBeInTheDocument();
      expect(screen.getByText('70,000円')).toBeInTheDocument();
    });
  });

  it('予想方法でフィルタリングできる', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234', '5678', '9012'],
            ai: [],
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      ],
      totalPages: 1,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      const filterSelect = screen.getByLabelText('予想方法');
      fireEvent.change(filterSelect, { target: { value: 'dataLogic' } });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=dataLogic'),
        expect.any(Object)
      );
    });
  });

  it('当選結果でフィルタリングできる', async () => {
    const mockData = {
      predictions: [],
      totalPages: 0,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      const winFilter = screen.getByLabelText('当選のみ表示');
      fireEvent.click(winFilter);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('winOnly=true'),
        expect.any(Object)
      );
    });
  });

  it('ページネーションが機能する', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234'],
            ai: ['2345'],
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      ],
      totalPages: 5,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    // 次のページへ
    const nextButton = screen.getByLabelText('次のページ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.any(Object)
      );
    });
  });

  it('詳細モーダルが表示される', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234', '5678', '9012'],
            ai: ['2345', '6789', '0123'],
          },
          result: {
            winning: '1234',
            isWin: true,
            prize: 70000,
          },
          createdAt: '2024-01-15T00:00:00Z',
          analysis: {
            dataLogic: {
              frequency: { '1': 45, '2': 42, '3': 40, '4': 38 },
              patterns: ['連続数字', '偶数多め'],
            },
            ai: {
              confidence: 0.85,
              features: ['高頻度数字', '過去当選パターン'],
            },
          },
        },
      ],
      totalPages: 1,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      const detailButton = screen.getByText('詳細を見る');
      fireEvent.click(detailButton);
    });

    await waitFor(() => {
      expect(screen.getByText('予想詳細 - 第1234回')).toBeInTheDocument();
      // モーダル内の詳細セクションを確認（複数のヘッダーがあるため、より具体的なクエリを使用）
      const modal = screen.getByText('予想詳細 - 第1234回').closest('div');
      expect(modal).toBeInTheDocument();
      
      // getAllByRole を使用して複数のヘッダーを取得し、モーダル内のものを確認
      const dataLogicHeaders = screen.getAllByText('データ分析予想');
      expect(dataLogicHeaders.length).toBe(2); // 一覧と詳細モーダルで2つ
      
      const aiHeaders = screen.getAllByText('AI予想');
      expect(aiHeaders.length).toBe(2); // 一覧と詳細モーダルで2つ
      expect(screen.getByText('信頼度: 85%')).toBeInTheDocument();
    });
  });

  it('認証エラーの場合、ログインページにリダイレクトされる', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('データがない場合、適切なメッセージが表示される', async () => {
    const mockData = {
      predictions: [],
      totalPages: 0,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('まだ予想履歴がありません')).toBeInTheDocument();
    });
  });

  it('CSVエクスポートができる', async () => {
    const mockData = {
      predictions: [
        {
          _id: '1',
          drawNumber: 1234,
          predictions: {
            dataLogic: ['1234'],
            ai: ['2345'],
          },
          result: {
            winning: '1234',
            isWin: true,
            prize: 70000,
          },
          createdAt: '2024-01-15T00:00:00Z',
        },
      ],
      totalPages: 1,
      currentPage: 1,
    };

    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockData,
      })
    );

    // CSVエクスポート用のモック
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    const mockClick = jest.fn();
    
    global.URL.createObjectURL = mockCreateObjectURL;
    
    // アンカー要素のクリックをモック
    HTMLAnchorElement.prototype.click = mockClick;

    render(<PredictionHistoryPage />);

    await waitFor(() => {
      expect(screen.getByText('CSVエクスポート')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('CSVエクスポート');
    fireEvent.click(exportButton);

    // CSVエクスポート関数が実行されたことを確認
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
  });
});