import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { DrawResult } from '../models/DrawResult';

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
 * 過去の抽選結果とKako予想を取得
 */
router.get('/history-with-prediction', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
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
      
      results.push({
        drawNumber: currentDraw.drawNumber,
        drawDate: currentDraw.drawDate,
        dayOfWeek,
        winningNumber: currentDraw.winningNumber,
        kakoPrediction,
        patterns,
        patternCount: patterns.length,
        purchaseCount: 1, // 1口購入
        purchaseAmount: 200, // 1口200円
        winType,
        winAmount,
        prizeInfo: currentDraw.prize
      });
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

export default router;