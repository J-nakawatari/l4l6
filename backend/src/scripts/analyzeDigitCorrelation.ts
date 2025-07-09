import mongoose from 'mongoose';
import { config } from 'dotenv';
import { DrawResult } from '../models/DrawResult';

config();

async function analyzeDigitCorrelations() {
  await mongoose.connect(process.env.MONGODB_URI!);
  
  console.log('🔍 数字の相関関係分析を開始します...\n');
  
  const allResults = await DrawResult.find().sort({ drawNumber: -1 });
  console.log(`分析対象: ${allResults.length}回の抽選結果\n`);
  
  // 1. 位置間の相関を分析
  console.log('='.repeat(60));
  console.log('1. 位置間の数字相関分析');
  console.log('='.repeat(60) + '\n');
  
  const positionCorrelations: Record<string, number> = {};
  
  allResults.forEach(result => {
    const digits = result.winningNumber.split('');
    
    // 各位置の組み合わせをカウント
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const key = `P${i}-${digits[i]}_P${j}-${digits[j]}`;
        positionCorrelations[key] = (positionCorrelations[key] || 0) + 1;
      }
    }
  });
  
  // 相関の強い組み合わせを表示
  const sortedCorrelations = Object.entries(positionCorrelations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  console.log('相関の強い位置と数字の組み合わせ（上位20）:');
  sortedCorrelations.forEach(([pattern, count]) => {
    const percentage = ((count / allResults.length) * 100).toFixed(2);
    console.log(`${pattern}: ${count}回 (${percentage}%)`);
  });
  
  // 2. 連続する抽選での数字の遷移パターン
  console.log('\n' + '='.repeat(60));
  console.log('2. 連続抽選での数字遷移パターン');
  console.log('='.repeat(60) + '\n');
  
  const transitions: Record<string, Record<string, number>>[] = [{}, {}, {}, {}];
  
  for (let i = 0; i < allResults.length - 1; i++) {
    const current = allResults[i]!.winningNumber.split('');
    const next = allResults[i + 1]!.winningNumber.split('');
    
    for (let pos = 0; pos < 4; pos++) {
      const key = current[pos]!;
      const nextDigit = next[pos]!;
      
      if (!transitions[pos]![key]) {
        transitions[pos]![key] = {};
      }
      transitions[pos]![key]![nextDigit] = (transitions[pos]![key]![nextDigit] || 0) + 1;
    }
  }
  
  // 各位置で最も頻繁な遷移を表示
  for (let pos = 0; pos < 4; pos++) {
    console.log(`\n位置${pos + 1}の遷移パターン（上位5）:`);
    
    const posTransitions = transitions[pos]!;
    const topTransitions: { from: string; to: string; count: number; prob: number }[] = [];
    
    Object.entries(posTransitions).forEach(([from, toMap]) => {
      const total = Object.values(toMap).reduce((sum, count) => sum + count, 0);
      Object.entries(toMap).forEach(([to, count]) => {
        topTransitions.push({
          from,
          to,
          count,
          prob: count / total
        });
      });
    });
    
    topTransitions
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .forEach(({ from, to, count, prob }) => {
        console.log(`  ${from} → ${to}: ${count}回 (${(prob * 100).toFixed(1)}%)`);
      });
  }
  
  // 3. 特殊パターンの分析
  console.log('\n' + '='.repeat(60));
  console.log('3. 特殊パターン分析');
  console.log('='.repeat(60) + '\n');
  
  const patterns = {
    allSame: 0,
    consecutive: 0,
    pairs: 0,
    allDifferent: 0,
    sumUnder10: 0,
    sumOver30: 0,
    allOdd: 0,
    allEven: 0
  };
  
  allResults.forEach(result => {
    const digits = result.winningNumber.split('').map(Number);
    const uniqueDigits = new Set(digits);
    const sum = digits.reduce((a, b) => a + b, 0);
    
    // 全て同じ数字
    if (uniqueDigits.size === 1) patterns.allSame++;
    
    // 連続する数字があるか
    const sorted = [...digits].sort((a, b) => a - b);
    let hasConsecutive = false;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i + 1]! - sorted[i]! === 1) {
        hasConsecutive = true;
        break;
      }
    }
    if (hasConsecutive) patterns.consecutive++;
    
    // ペアがあるか
    if (uniqueDigits.size === 3) patterns.pairs++;
    
    // 全て異なる
    if (uniqueDigits.size === 4) patterns.allDifferent++;
    
    // 合計値
    if (sum < 10) patterns.sumUnder10++;
    if (sum > 30) patterns.sumOver30++;
    
    // 奇数偶数
    const oddCount = digits.filter(d => d % 2 === 1).length;
    if (oddCount === 4) patterns.allOdd++;
    if (oddCount === 0) patterns.allEven++;
  });
  
  console.log('特殊パターンの出現頻度:');
  Object.entries(patterns).forEach(([pattern, count]) => {
    const percentage = ((count / allResults.length) * 100).toFixed(2);
    console.log(`${pattern}: ${count}回 (${percentage}%)`);
  });
  
  // 4. 新しい予測アルゴリズムの提案
  console.log('\n' + '='.repeat(60));
  console.log('4. 改善された予測アルゴリズムの提案');
  console.log('='.repeat(60) + '\n');
  
  console.log('分析結果に基づく改善案:');
  console.log('1. 位置間の相関を考慮した予測');
  console.log('2. 前回の数字からの遷移確率を使用');
  console.log('3. 特殊パターンの出現確率を考慮');
  console.log('4. 複数のアルゴリズムを組み合わせたアンサンブル予測');
  
  await mongoose.disconnect();
}

analyzeDigitCorrelations().catch(console.error);