import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DrawResult } from '../models/DrawResult';
import {
  generateTransitionBasedPrediction,
  generateCorrelationBasedPrediction,
  generatePatternBasedPrediction,
  generateHybridPrediction
} from '../services/prediction/improvedAlgorithms';

const router = Router();

interface BacktestResult {
  algorithm: string;
  period: string;
  totalPredictions: number;
  straightWins: number;
  boxWins: number;
  totalWins: number;
  winRate: number;
  straightRate: number;
  boxRate: number;
  totalCost: number;
  totalReturn: number;
  profit: number;
  roi: number;
  details: Array<{
    drawNumber: number;
    drawDate: string;
    winningNumber: string;
    prediction: string;
    winType: 'straight' | 'box' | null;
    winAmount: number;
  }>;
}

// パターンを生成
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
  
  return Array.from(new Set(result));
}

// Kakoアルゴリズム
function generateKakoPrediction(past100: any[]): string | null {
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[3-i];
      if (digit !== undefined) {
        freq[i]![digit] = (freq[i]![digit] || 0) + 1;
      }
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
    return most.join('');
  }
  return null;
}

/**
 * バックテストを実行
 */
router.post('/run', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, algorithms } = req.body;
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }
    
    // テスト対象のデータを取得
    const testResults = await DrawResult.find({
      drawDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ drawNumber: 1 });
    
    if (testResults.length === 0) {
      res.json({ results: [] });
      return;
    }
    
    const results: BacktestResult[] = [];
    
    // 各アルゴリズムでバックテスト
    const algorithmMap: Record<string, any> = {
      'kako': async (past100: any[]) => generateKakoPrediction(past100),
      'transition': async (past100: any[], lastDraw: any) => generateTransitionBasedPrediction(past100, lastDraw),
      'correlation': async (past100: any[]) => generateCorrelationBasedPrediction(past100),
      'pattern': async (past100: any[]) => generatePatternBasedPrediction(past100),
      'hybrid': async (past100: any[], lastDraw: any) => generateHybridPrediction(past100, lastDraw)
    };
    
    for (const algoName of algorithms || ['kako']) {
      const algoFn = algorithmMap[algoName];
      if (!algoFn) continue;
      
      const result: BacktestResult = {
        algorithm: algoName,
        period: `${startDate} - ${endDate}`,
        totalPredictions: 0,
        straightWins: 0,
        boxWins: 0,
        totalWins: 0,
        winRate: 0,
        straightRate: 0,
        boxRate: 0,
        totalCost: 0,
        totalReturn: 0,
        profit: 0,
        roi: 0,
        details: []
      };
      
      for (const currentDraw of testResults) {
        // 過去100回のデータを取得
        const past100 = await DrawResult.find({
          drawNumber: {
            $gte: currentDraw.drawNumber - 100,
            $lt: currentDraw.drawNumber
          }
        }).sort({ drawNumber: -1 }).limit(100);
        
        if (past100.length < 100) continue;
        
        // 前回の抽選結果を取得
        const lastDraw = await DrawResult.findOne({
          drawNumber: currentDraw.drawNumber - 1
        });
        
        let predictions: string[] = [];
        
        // アルゴリズムに応じて予測を生成
        if (algoName === 'hybrid' && lastDraw) {
          predictions = await algoFn(past100, lastDraw);
        } else if (algoName === 'transition' && lastDraw) {
          const pred = await algoFn(past100, lastDraw);
          if (pred) predictions = [pred];
        } else if (algoName !== 'transition' && algoName !== 'hybrid') {
          const pred = await algoFn(past100);
          if (pred) predictions = [pred];
        }
        
        // 各予測をチェック
        for (const prediction of predictions) {
          result.totalPredictions++;
          
          let winType: 'straight' | 'box' | null = null;
          let winAmount = 0;
          let cost = 200;
          
          // Kakoアルゴリズムの場合はパターン分も購入
          if (algoName === 'kako') {
            const patterns = generatePermutations(prediction.split(''));
            cost = patterns.length * 200;
            
            if (currentDraw.winningNumber === prediction) {
              winType = 'straight';
              winAmount = 900000;
            } else if (patterns.includes(currentDraw.winningNumber)) {
              winType = 'box';
              winAmount = 37500;
            }
          } else {
            // その他のアルゴリズムはストレートのみ
            if (currentDraw.winningNumber === prediction) {
              winType = 'straight';
              winAmount = 900000;
            } else {
              // ボックス判定
              const predSorted = prediction.split('').sort().join('');
              const winSorted = currentDraw.winningNumber.split('').sort().join('');
              if (predSorted === winSorted) {
                winType = 'box';
                winAmount = 37500;
              }
            }
          }
          
          result.totalCost += cost;
          
          if (winType) {
            result.totalWins++;
            if (winType === 'straight') result.straightWins++;
            if (winType === 'box') result.boxWins++;
            result.totalReturn += winAmount;
            
            result.details.push({
              drawNumber: currentDraw.drawNumber,
              drawDate: currentDraw.drawDate.toISOString(),
              winningNumber: currentDraw.winningNumber,
              prediction,
              winType,
              winAmount
            });
          }
        }
      }
      
      // 統計を計算
      if (result.totalPredictions > 0) {
        result.winRate = (result.totalWins / result.totalPredictions) * 100;
        result.straightRate = (result.straightWins / result.totalPredictions) * 100;
        result.boxRate = (result.boxWins / result.totalPredictions) * 100;
      }
      
      result.profit = result.totalReturn - result.totalCost;
      if (result.totalCost > 0) {
        result.roi = (result.profit / result.totalCost) * 100;
      }
      
      results.push(result);
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ 
      error: 'Failed to run backtest',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;