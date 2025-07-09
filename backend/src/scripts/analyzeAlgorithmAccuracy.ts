import mongoose from 'mongoose';
import { config } from 'dotenv';
import { DrawResult } from '../models/DrawResult';

config();

interface AlgorithmResult {
  name: string;
  totalPredictions: number;
  straightWins: number;
  boxWins: number;
  totalWins: number;
  winRate: number;
  straightRate: number;
  boxRate: number;
  totalReturn: number;
  totalCost: number;
  roi: number;
}

// Kakoアルゴリズム
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

// 位置別頻度（上位2つ）アルゴリズム
function generateTop2FrequencyPrediction(past100: any[]): string | null {
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  past100.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[i];
      freq[i]![digit] = (freq[i]![digit] || 0) + 1;
    }
  });
  
  const prediction: string[] = [];
  for (let idx = 0; idx < 4; idx++) {
    const freqData = freq[idx]!;
    const sorted = Object.entries(freqData).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (sorted.length >= 2) {
      // 上位2つからランダムに選択
      const topTwo = [sorted[0]![0], sorted[1]![0]];
      prediction.push(topTwo[Math.floor(Math.random() * 2)]!);
    } else if (sorted.length > 0) {
      prediction.push(sorted[0]![0]);
    }
  }
  
  if (prediction.length === 4) {
    return prediction.join('');
  }
  return null;
}

// 最近の傾向重視アルゴリズム
function generateRecentTrendPrediction(past100: any[]): string | null {
  // 直近30回を重視
  const recent30 = past100.slice(0, 30);
  const freq: Record<string, number>[] = [{}, {}, {}, {}];
  
  // 直近30回は重み2倍
  recent30.forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[i];
      freq[i]![digit] = (freq[i]![digit] || 0) + 2;
    }
  });
  
  // 残りの70回は重み1倍
  past100.slice(30).forEach(d => {
    const n = d.winningNumber;
    for (let i = 0; i < 4; i++) {
      const digit = n[i];
      freq[i]![digit] = (freq[i]![digit] || 0) + 1;
    }
  });
  
  const prediction: string[] = [];
  for (let idx = 0; idx < 4; idx++) {
    const freqData = freq[idx]!;
    const sorted = Object.entries(freqData).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (sorted.length > 0) {
      prediction.push(sorted[0]![0]);
    }
  }
  
  if (prediction.length === 4) {
    return prediction.join('');
  }
  return null;
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

async function analyzeAlgorithms() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  console.log('🔍 予測アルゴリズムの精度分析を開始します...\n');
  
  // 全データで分析（最新100回を除く）
  const allResults = await DrawResult.find().sort({ drawNumber: -1 });
  const testResults = allResults.slice(100).reverse(); // 古い順に並び替え
  
  console.log(`分析対象: 全データ (${testResults.length}回)\n`);
  
  const algorithms = [
    { name: 'Kako（位置別最頻出）', fn: generateKakoPrediction },
    { name: '位置別上位2頻度', fn: generateTop2FrequencyPrediction },
    { name: '直近傾向重視', fn: generateRecentTrendPrediction }
  ];
  
  const results: AlgorithmResult[] = [];
  
  for (const algo of algorithms) {
    let totalPredictions = 0;
    let straightWins = 0;
    let boxWins = 0;
    let totalReturn = 0;
    let totalCost = 0;
    
    console.log(`\n📊 ${algo.name}アルゴリズムを分析中...`);
    
    for (const currentDraw of testResults) {
      // 過去100回のデータを取得
      const past100 = await DrawResult.find({
        drawNumber: {
          $gte: currentDraw.drawNumber - 100,
          $lt: currentDraw.drawNumber
        }
      }).sort({ drawNumber: -1 }).limit(100);
      
      if (past100.length < 100) continue;
      
      const prediction = algo.fn(past100);
      if (!prediction) continue;
      
      totalPredictions++;
      
      // ボックス用のパターンを生成
      const patterns = generatePermutations(prediction.split(''));
      const cost = patterns.length * 200;
      totalCost += cost;
      
      // 当選チェック
      if (currentDraw.winningNumber === prediction) {
        straightWins++;
        totalReturn += 900000; // ストレート当選
      } else if (patterns.includes(currentDraw.winningNumber)) {
        boxWins++;
        totalReturn += 37500; // ボックス当選
      }
    }
    
    const totalWins = straightWins + boxWins;
    const winRate = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;
    const straightRate = totalPredictions > 0 ? (straightWins / totalPredictions) * 100 : 0;
    const boxRate = totalPredictions > 0 ? (boxWins / totalPredictions) * 100 : 0;
    const roi = totalCost > 0 ? ((totalReturn - totalCost) / totalCost) * 100 : 0;
    
    results.push({
      name: algo.name,
      totalPredictions,
      straightWins,
      boxWins,
      totalWins,
      winRate,
      straightRate,
      boxRate,
      totalReturn,
      totalCost,
      roi
    });
  }
  
  // 結果を表示
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 分析結果サマリー');
  console.log('='.repeat(80) + '\n');
  
  results.forEach(result => {
    console.log(`【${result.name}】`);
    console.log(`├─ 予測回数: ${result.totalPredictions}回`);
    console.log(`├─ 的中率: ${result.winRate.toFixed(2)}%`);
    console.log(`├─ ストレート: ${result.straightWins}回 (${result.straightRate.toFixed(2)}%)`);
    console.log(`├─ ボックス: ${result.boxWins}回 (${result.boxRate.toFixed(2)}%)`);
    console.log(`├─ 総投資額: ${result.totalCost.toLocaleString()}円`);
    console.log(`├─ 総払戻額: ${result.totalReturn.toLocaleString()}円`);
    console.log(`├─ 収支: ${(result.totalReturn - result.totalCost).toLocaleString()}円`);
    console.log(`└─ ROI: ${result.roi.toFixed(2)}%\n`);
  });
  
  // 理論値との比較
  console.log('='.repeat(80));
  console.log('📊 理論値との比較');
  console.log('='.repeat(80) + '\n');
  console.log('理論的な当選確率:');
  console.log('├─ ストレート: 0.01% (1/10,000)');
  console.log('├─ ボックス（全て異なる数字）: 0.24% (24/10,000)');
  console.log('└─ ボックス（平均）: 約0.15%\n');
  
  await mongoose.disconnect();
}

analyzeAlgorithms().catch(console.error);