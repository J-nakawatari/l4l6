import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DrawResult } from '../models/DrawResult';
import { 
  generateHybridPrediction,
  generateTransitionBasedPrediction,
  generateCorrelationBasedPrediction,
  generatePatternBasedPrediction
} from '../services/prediction/improvedAlgorithms';

const router = Router();

/**
 * Kakoアルゴリズムで予想を生成
 */
function generateKakoPrediction(past100: any[]): string | null {
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[3-i];
      freq[i]![digit] = (freq[i]![digit] || 0) + 1;
    }
  });
  
  const most: string[] = [];
  for (let idx = 0; idx < 4; idx++) {
    const freqData = freq[idx]!;
    const sorted = Object.entries(freqData).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (sorted.length > 0) {
      most.push(sorted[0]![0]);
    }
  }
  
  if (most.length === 4) {
    return most[0]! + most[1]! + most[2]! + most[3]!;
  }
  return null;
}

/**
 * 並び替えパターンを生成
 */
function generatePermutations(digits: string[]): string[] {
  if (digits.length <= 1) return digits;
  
  const result: string[] = [];
  for (let i = 0; i < digits.length; i++) {
    const current = digits[i];
    const remaining = [...digits.slice(0, i), ...digits.slice(i + 1)];
    const perms = generatePermutations(remaining);
    
    for (const perm of perms) {
      result.push(current + perm);
    }
  }
  
  // 重複を削除
  return Array.from(new Set(result));
}

/**
 * 過去の抽選結果とKako予想、AIランダム予想を取得
 */
router.get('/history-with-prediction', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const includeAiRandom = req.query.includeAiRandom === 'true';
    
    // 最新の抽選結果を取得（予想生成用に追加で100件）
    const allResults = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(limit + 100);
    
    if (allResults.length < limit + 100) {
      res.json({ results: [] });
      return;
    }
    
    const results = [];
    
    // 各回について予想を生成
    for (let i = 0; i < Math.min(limit, allResults.length - 100); i++) {
      const currentDraw = allResults[i];
      if (!currentDraw) continue;
      
      const past100 = allResults.slice(i + 1, i + 101);
      
      // Kako予想を生成
      const kakoPrediction = generateKakoPrediction(past100);
      
      if (!kakoPrediction) continue;
      
      // 並び替えパターンを生成
      const patterns = generatePermutations(kakoPrediction.split(''));
      
      // 当選チェック
      let winType: 'straight' | 'box' | null = null;
      let winAmount = 0;
      
      if (currentDraw.winningNumber === kakoPrediction) {
        winType = 'straight';
        winAmount = 900000; // デフォルト値
      } else if (patterns.includes(currentDraw.winningNumber)) {
        winType = 'box';
        winAmount = 37500; // デフォルト値
      }
      
      // 曜日を計算
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][currentDraw.drawDate.getDay()];
      
      const result: any = {
        drawNumber: currentDraw.drawNumber,
        drawDate: currentDraw.drawDate,
        dayOfWeek,
        winningNumber: currentDraw.winningNumber,
        kakoPrediction,
        patterns,
        patternCount: patterns.length,
        purchaseCount: patterns.length, // パターン数分購入
        purchaseAmount: patterns.length * 200, // パターン数 × 200円
        winType,
        winAmount,
        prizeInfo: currentDraw.prize
      };
      
      // AIランダム予想も含める場合
      if (includeAiRandom) {
        const aiRandomPredictions = generateAIRandomPredictions(currentDraw.drawNumber);
        const aiRandomWins: Array<{
          prediction: string;
          winType: 'straight' | 'box' | null;
          winAmount: number;
        }> = [];
        
        let aiRandomTotalWinAmount = 0;
        
        for (const prediction of aiRandomPredictions) {
          const aiPatterns = generatePermutations(prediction.split(''));
          let aiWinType: 'straight' | 'box' | null = null;
          let aiWinAmount = 0;
          
          if (currentDraw.winningNumber === prediction) {
            aiWinType = 'straight';
            aiWinAmount = 900000;
          } else if (aiPatterns.includes(currentDraw.winningNumber)) {
            aiWinType = 'box';
            aiWinAmount = 37500;
          }
          
          aiRandomWins.push({
            prediction,
            winType: aiWinType,
            winAmount: aiWinAmount
          });
          
          aiRandomTotalWinAmount += aiWinAmount;
        }
        
        result.aiRandomPredictions = aiRandomPredictions;
        result.aiRandomWins = aiRandomWins;
        result.aiRandomPurchaseAmount = 2400; // 12個 × 200円
        result.aiRandomTotalWinAmount = aiRandomTotalWinAmount;
      }
      
      results.push(result);
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('Error fetching draw history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch draw history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * AI予想を生成（改善されたハイブリッドアルゴリズム）
 */
function generateAIPredictions(past100: any[]): string[] {
  // 最新の抽選結果を取得
  const lastDraw = past100[0];
  
  // ハイブリッド予測を生成
  const hybridPredictions = generateHybridPrediction(past100, lastDraw);
  
  // 12個の予測を返す
  return hybridPredictions.slice(0, 12);
}

/**
 * 期間指定で全ての予想結果を取得（AI予想・Kako予想）
 */
router.get('/history-with-all-predictions', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // 期間内の抽選結果を取得
    const periodResults = await DrawResult.find({
      drawDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ drawNumber: 1 }); // 古い順

    if (periodResults.length === 0) {
      res.json({ 
        kakoResults: [],
        aiResults: []
      });
      return;
    }

    const kakoResults = [];
    const aiResults = [];

    // 各回について予想を生成
    for (const currentDraw of periodResults) {
      // この回より100回前のデータを取得
      const past100 = await DrawResult.find({
        drawNumber: {
          $gte: currentDraw.drawNumber - 100,
          $lt: currentDraw.drawNumber
        }
      }).sort({ drawNumber: -1 }).limit(100);

      if (past100.length < 100) {
        // 100回分のデータがない場合はスキップ
        continue;
      }

      // 曜日を計算
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][currentDraw.drawDate.getDay()];

      // Kako予想を生成
      const kakoPrediction = generateKakoPrediction(past100);
      if (kakoPrediction) {
        const patterns = generatePermutations(kakoPrediction.split(''));
        
        // 当選チェック
        let winType: 'straight' | 'box' | null = null;
        let winAmount = 0;
        
        if (currentDraw.winningNumber === kakoPrediction) {
          winType = 'straight';
          winAmount = 900000; // デフォルト値
        } else if (patterns.includes(currentDraw.winningNumber)) {
          winType = 'box';
          winAmount = 37500; // デフォルト値
        }
        
        kakoResults.push({
          drawNumber: currentDraw.drawNumber,
          drawDate: currentDraw.drawDate,
          dayOfWeek,
          winningNumber: currentDraw.winningNumber,
          kakoPrediction,
          patterns,
          patternCount: patterns.length,
          purchaseCount: patterns.length,
          purchaseAmount: patterns.length * 200,
          winType,
          winAmount,
          prizeInfo: currentDraw.prize
        });
      }

      // AI予想を生成
      const aiPredictions = generateAIPredictions(past100);
      
      // AI予想の当選チェック
      const aiWins: Array<{ prediction: string; winType: 'straight' | 'box' | null; winAmount: number }> = [];
      
      for (const prediction of aiPredictions) {
        let winType: 'straight' | 'box' | null = null;
        let winAmount = 0;
        
        if (currentDraw.winningNumber === prediction) {
          winType = 'straight';
          winAmount = 900000; // デフォルト値
        } else {
          // ボックス判定
          const predictionSorted = prediction.split('').sort().join('');
          const winningSorted = currentDraw.winningNumber.split('').sort().join('');
          if (predictionSorted === winningSorted) {
            winType = 'box';
            winAmount = 37500; // デフォルト値
          }
        }
        
        aiWins.push({ prediction, winType, winAmount });
      }
      
      aiResults.push({
        drawNumber: currentDraw.drawNumber,
        drawDate: currentDraw.drawDate,
        dayOfWeek,
        winningNumber: currentDraw.winningNumber,
        aiPredictions: aiWins.map(w => w.prediction),
        aiWins,
        purchaseCount: aiPredictions.length,
        purchaseAmount: aiPredictions.length * 200,
        totalWinAmount: aiWins.reduce((sum, w) => sum + w.winAmount, 0),
        prizeInfo: currentDraw.prize
      });
    }

    res.json({ 
      kakoResults,
      aiResults,
      totalCount: {
        kako: kakoResults.length,
        ai: aiResults.length
      },
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching all prediction history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch all prediction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * AIランダム予想を12個生成（固定シード使用）
 */
function generateAIRandomPredictions(drawNumber: number): string[] {
  // 抽選回数をシードとして使用し、同じ回には常に同じ予想を生成
  let random = drawNumber;
  
  // 線形合同法で疑似乱数を生成
  const lcg = () => {
    random = (random * 1664525 + 1013904223) % 4294967296;
    return random / 4294967296;
  };
  
  // 12個の4桁数字を生成
  const predictions: string[] = [];
  for (let j = 0; j < 12; j++) {
    const digits = [];
    for (let i = 0; i < 4; i++) {
      digits.push(Math.floor(lcg() * 10).toString());
    }
    predictions.push(digits.join(''));
  }
  
  return predictions;
}

/**
 * 期間指定でkako予想結果を取得
 */
router.get('/history-with-prediction-period', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // 期間内の抽選結果を取得
    const periodResults = await DrawResult.find({
      drawDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ drawNumber: 1 }); // 古い順

    if (periodResults.length === 0) {
      res.json({ results: [] });
      return;
    }

    const results = [];

    // 各回について予想を生成
    for (const currentDraw of periodResults) {
      // この回より100回前のデータを取得
      const past100 = await DrawResult.find({
        drawNumber: {
          $gte: currentDraw.drawNumber - 100,
          $lt: currentDraw.drawNumber
        }
      }).sort({ drawNumber: -1 }).limit(100);

      if (past100.length < 100) {
        // 100回分のデータがない場合はスキップ
        continue;
      }

      // Kako予想を生成
      const kakoPrediction = generateKakoPrediction(past100);

      if (!kakoPrediction) continue;

      // 並び替えパターンを生成
      const patterns = generatePermutations(kakoPrediction.split(''));

      // 当選チェック
      let winType: 'straight' | 'box' | null = null;
      let winAmount = 0;

      if (currentDraw.winningNumber === kakoPrediction) {
        winType = 'straight';
        winAmount = 900000; // デフォルト値
      } else if (patterns.includes(currentDraw.winningNumber)) {
        winType = 'box';
        winAmount = 37500; // デフォルト値
      }

      // 曜日を計算
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][currentDraw.drawDate.getDay()];

      results.push({
        drawNumber: currentDraw.drawNumber,
        drawDate: currentDraw.drawDate,
        dayOfWeek,
        winningNumber: currentDraw.winningNumber,
        kakoPrediction,
        patterns,
        patternCount: patterns.length,
        purchaseCount: patterns.length, // パターン数分購入
        purchaseAmount: patterns.length * 200, // パターン数 × 200円
        winType,
        winAmount,
        prizeInfo: currentDraw.prize
      });
    }

    res.json({ 
      results,
      totalCount: results.length,
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching period prediction history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch period prediction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 期間指定でAIランダム予想結果を取得
 */
router.get('/history-with-ai-random-period', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // 期間内の抽選結果を取得
    const periodResults = await DrawResult.find({
      drawDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ drawNumber: 1 }); // 古い順

    if (periodResults.length === 0) {
      res.json({ results: [] });
      return;
    }

    const results = [];

    // 各回についてAIランダム予想を生成
    for (const currentDraw of periodResults) {
      // AIランダム予想を12個生成
      const aiRandomPredictions = generateAIRandomPredictions(currentDraw.drawNumber);

      // 各予想の当選チェック結果を格納
      const aiRandomWins: Array<{
        prediction: string;
        winType: 'straight' | 'box' | null;
        winAmount: number;
      }> = [];

      let totalPurchaseAmount = 0;
      let totalWinAmount = 0;

      // 12個の予想それぞれをチェック
      for (const prediction of aiRandomPredictions) {
        const patterns = generatePermutations(prediction.split(''));
        let winType: 'straight' | 'box' | null = null;
        let winAmount = 0;

        if (currentDraw.winningNumber === prediction) {
          winType = 'straight';
          winAmount = 900000; // デフォルト値
        } else if (patterns.includes(currentDraw.winningNumber)) {
          winType = 'box';
          winAmount = 37500; // デフォルト値
        }

        aiRandomWins.push({
          prediction,
          winType,
          winAmount
        });

        totalPurchaseAmount += 200; // 各予想1口 × 200円
        totalWinAmount += winAmount;
      }

      // 曜日を計算
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][currentDraw.drawDate.getDay()];

      results.push({
        drawNumber: currentDraw.drawNumber,
        drawDate: currentDraw.drawDate,
        dayOfWeek,
        winningNumber: currentDraw.winningNumber,
        aiRandomPredictions,
        aiRandomWins,
        purchaseCount: 12, // 12個の予想
        purchaseAmount: totalPurchaseAmount,
        totalWinAmount,
        prizeInfo: currentDraw.prize
      });
    }

    res.json({ 
      results,
      totalCount: results.length,
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching AI random prediction history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch AI random prediction history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 最新の抽選結果を取得
 */
router.get('/latest', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const latest = await DrawResult.findOne()
      .sort({ drawNumber: -1 });
    
    if (!latest) {
      res.status(404).json({ error: 'No draw results found' });
      return;
    }
    
    res.json({ result: latest });
    
  } catch (error) {
    console.error('Error fetching latest draw:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest draw',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 次回予想を取得
 */
router.get('/next-prediction', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    // 最新の抽選結果を取得
    const latestDraw = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    if (!latestDraw) {
      res.status(404).json({ error: 'No draw results found' });
      return;
    }
    
    // 過去100回のデータを取得
    const past100 = await DrawResult.find({
      drawNumber: { $lte: latestDraw.drawNumber }
    }).sort({ drawNumber: -1 }).limit(100);
    
    if (past100.length < 100) {
      res.status(400).json({ error: 'Not enough historical data' });
      return;
    }
    
    // 各アルゴリズムで予測を生成
    const hybridPredictions = generateHybridPrediction(past100, latestDraw);
    const transitionPrediction = generateTransitionBasedPrediction(past100, latestDraw);
    const correlationPrediction = generateCorrelationBasedPrediction(past100);
    const patternPrediction = generatePatternBasedPrediction(past100);
    
    // 次回の抽選日を計算（月曜日から金曜日）
    const nextDrawDate = new Date(latestDraw.drawDate);
    do {
      nextDrawDate.setDate(nextDrawDate.getDate() + 1);
    } while (nextDrawDate.getDay() === 0 || nextDrawDate.getDay() === 6); // 土日をスキップ
    
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][nextDrawDate.getDay()];
    
    res.json({
      drawNumber: latestDraw.drawNumber + 1,
      drawDate: nextDrawDate.toISOString(),
      dayOfWeek,
      predictions: {
        hybrid: hybridPredictions,
        transition: transitionPrediction || '0000',
        correlation: correlationPrediction || '0000',
        pattern: patternPrediction || '0000'
      }
    });
    
  } catch (error) {
    console.error('Error fetching next prediction:', error);
    res.status(500).json({ 
      error: 'Failed to fetch next prediction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;