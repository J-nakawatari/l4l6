import mongoose from 'mongoose';
import { config } from 'dotenv';
import { DrawResult } from '../models/DrawResult';
import {
  generateTransitionBasedPrediction,
  generateCorrelationBasedPrediction,
  generatePatternBasedPrediction,
  generateHybridPrediction
} from '../services/prediction/improvedAlgorithms';

config();

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

async function testImprovedAlgorithms() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  console.log('🔍 改善されたアルゴリズムのテストを開始します...\n');
  
  // 2025年のデータでテスト
  const testResults = await DrawResult.find({
    drawDate: { $gte: new Date('2025-01-01') }
  }).sort({ drawNumber: 1 });
  
  console.log(`テスト対象: 2025年のデータ (${testResults.length}回)\n`);
  
  const algorithms: Array<{
    name: string;
    fn: (past100: any[], lastDraw?: any) => string | null;
    needsLastDraw: boolean;
  }> = [
    { 
      name: '遷移確率ベース', 
      fn: (past100: any[], lastDraw?: any) => lastDraw ? generateTransitionBasedPrediction(past100, lastDraw) : null, 
      needsLastDraw: true 
    },
    { 
      name: '位置相関ベース', 
      fn: (past100: any[]) => generateCorrelationBasedPrediction(past100), 
      needsLastDraw: false 
    },
    { 
      name: 'パターンベース', 
      fn: (past100: any[]) => generatePatternBasedPrediction(past100), 
      needsLastDraw: false 
    }
  ];
  
  const results: any[] = [];
  
  for (const algo of algorithms) {
    console.log(`\n📊 ${algo.name}アルゴリズムをテスト中...`);
    
    let totalPredictions = 0;
    let straightWins = 0;
    let boxWins = 0;
    let totalReturn = 0;
    let totalCost = 0;
    
    for (const currentDraw of testResults) {
      // 過去100回のデータを取得
      const past100 = await DrawResult.find({
        drawNumber: {
          $gte: currentDraw.drawNumber - 100,
          $lt: currentDraw.drawNumber
        }
      }).sort({ drawNumber: -1 }).limit(100);
      
      if (past100.length < 100) continue;
      
      // 最新の抽選結果
      const lastDraw = await DrawResult.findOne({
        drawNumber: currentDraw.drawNumber - 1
      });
      
      let prediction: string | null = null;
      
      if (algo.needsLastDraw && lastDraw) {
        prediction = algo.fn(past100, lastDraw);
      } else if (!algo.needsLastDraw) {
        prediction = algo.fn(past100);
      }
      
      if (!prediction) continue;
      
      totalPredictions++;
      
      // ボックス用のパターンを生成
      const patterns = generatePermutations(prediction.split(''));
      const cost = patterns.length * 200;
      totalCost += cost;
      
      // 当選チェック
      if (currentDraw.winningNumber === prediction) {
        straightWins++;
        totalReturn += 900000;
        console.log(`  🎯 ストレート的中！ 第${currentDraw.drawNumber}回: ${prediction} = ${currentDraw.winningNumber}`);
      } else if (patterns.includes(currentDraw.winningNumber)) {
        boxWins++;
        totalReturn += 37500;
        console.log(`  📦 ボックス的中！ 第${currentDraw.drawNumber}回: ${prediction} → ${currentDraw.winningNumber}`);
      }
    }
    
    const totalWins = straightWins + boxWins;
    const winRate = totalPredictions > 0 ? (totalWins / totalPredictions) * 100 : 0;
    const roi = totalCost > 0 ? ((totalReturn - totalCost) / totalCost) * 100 : 0;
    
    results.push({
      name: algo.name,
      totalPredictions,
      straightWins,
      boxWins,
      totalWins,
      winRate,
      totalReturn,
      totalCost,
      roi
    });
  }
  
  // ハイブリッドアルゴリズムもテスト
  console.log(`\n📊 ハイブリッドアルゴリズムをテスト中...`);
  
  let hybridTotalPredictions = 0;
  let hybridStraightWins = 0;
  let hybridBoxWins = 0;
  let hybridTotalReturn = 0;
  let hybridTotalCost = 0;
  
  for (const currentDraw of testResults) {
    const past100 = await DrawResult.find({
      drawNumber: {
        $gte: currentDraw.drawNumber - 100,
        $lt: currentDraw.drawNumber
      }
    }).sort({ drawNumber: -1 }).limit(100);
    
    if (past100.length < 100) continue;
    
    const lastDraw = await DrawResult.findOne({
      drawNumber: currentDraw.drawNumber - 1
    });
    
    if (!lastDraw) continue;
    
    const predictions = generateHybridPrediction(past100, lastDraw);
    
    for (const prediction of predictions) {
      hybridTotalPredictions++;
      hybridTotalCost += 200; // 1口200円
      
      if (currentDraw.winningNumber === prediction) {
        hybridStraightWins++;
        hybridTotalReturn += 900000;
        console.log(`  🎯 ストレート的中！ 第${currentDraw.drawNumber}回: ${prediction} = ${currentDraw.winningNumber}`);
      } else {
        // ボックス判定
        const predSorted = prediction.split('').sort().join('');
        const winSorted = currentDraw.winningNumber.split('').sort().join('');
        if (predSorted === winSorted) {
          hybridBoxWins++;
          hybridTotalReturn += 37500;
          console.log(`  📦 ボックス的中！ 第${currentDraw.drawNumber}回: ${prediction} → ${currentDraw.winningNumber}`);
        }
      }
    }
  }
  
  // 結果を表示
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 テスト結果サマリー');
  console.log('='.repeat(80) + '\n');
  
  results.forEach(result => {
    console.log(`【${result.name}】`);
    console.log(`├─ 予測回数: ${result.totalPredictions}回`);
    console.log(`├─ 的中率: ${result.winRate.toFixed(2)}%`);
    console.log(`├─ ストレート: ${result.straightWins}回`);
    console.log(`├─ ボックス: ${result.boxWins}回`);
    console.log(`├─ 総投資額: ${result.totalCost.toLocaleString()}円`);
    console.log(`├─ 総払戻額: ${result.totalReturn.toLocaleString()}円`);
    console.log(`├─ 収支: ${(result.totalReturn - result.totalCost).toLocaleString()}円`);
    console.log(`└─ ROI: ${result.roi.toFixed(2)}%\n`);
  });
  
  // ハイブリッドの結果
  const hybridWinRate = hybridTotalPredictions > 0 
    ? ((hybridStraightWins + hybridBoxWins) / hybridTotalPredictions) * 100 
    : 0;
  const hybridRoi = hybridTotalCost > 0 
    ? ((hybridTotalReturn - hybridTotalCost) / hybridTotalCost) * 100 
    : 0;
  
  console.log(`【ハイブリッドアルゴリズム（6予測/回）】`);
  console.log(`├─ 予測回数: ${hybridTotalPredictions}回`);
  console.log(`├─ 的中率: ${hybridWinRate.toFixed(2)}%`);
  console.log(`├─ ストレート: ${hybridStraightWins}回`);
  console.log(`├─ ボックス: ${hybridBoxWins}回`);
  console.log(`├─ 総投資額: ${hybridTotalCost.toLocaleString()}円`);
  console.log(`├─ 総払戻額: ${hybridTotalReturn.toLocaleString()}円`);
  console.log(`├─ 収支: ${(hybridTotalReturn - hybridTotalCost).toLocaleString()}円`);
  console.log(`└─ ROI: ${hybridRoi.toFixed(2)}%\n`);
  
  await mongoose.disconnect();
}

testImprovedAlgorithms().catch(console.error);