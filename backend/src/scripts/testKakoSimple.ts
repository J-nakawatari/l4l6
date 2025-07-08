// 簡易的なテストスクリプト
import { checkPredictions, countHits } from '../utils/lottery';

// 仮想的な過去10回の当選番号
const mockDrawResults = [
  { drawNumber: 5010, winningNumber: '1234' },
  { drawNumber: 5009, winningNumber: '5678' },
  { drawNumber: 5008, winningNumber: '9012' },
  { drawNumber: 5007, winningNumber: '3456' },
  { drawNumber: 5006, winningNumber: '7890' },
  { drawNumber: 5005, winningNumber: '2345' },
  { drawNumber: 5004, winningNumber: '6789' },
  { drawNumber: 5003, winningNumber: '0123' },
  { drawNumber: 5002, winningNumber: '4567' },
  { drawNumber: 5001, winningNumber: '8901' },
];

// 修正後のKakoアルゴリズムで生成される予想例
// 各桁の最頻出を仮定（実際はデータベースから計算）
const simulateKakoPredictions = () => {
  // 仮に最頻出が 1の位:3, 10の位:4, 100の位:5, 1000の位:6 の場合
  const base = '3456';
  
  // 順列を生成
  const predictions = [
    '3456', // 基本
    '3465',
    '3546',
    '3564',
    '3645',
    '3654',
    '4356',
    '4365',
    '4536',
    '4563'
  ];
  
  return predictions;
};

console.log('=== Kakoアルゴリズム検証（シミュレーション） ===\n');

let totalStraight = 0;
let totalBox = 0;

mockDrawResults.forEach(draw => {
  console.log(`\n第${draw.drawNumber}回 - 当選番号: ${draw.winningNumber}`);
  
  const predictions = simulateKakoPredictions();
  console.log(`予想: ${predictions.slice(0, 5).join(', ')}...`);
  
  const results = checkPredictions(predictions, draw.winningNumber);
  const hits = countHits(results);
  
  console.log(`結果: ストレート ${hits.straight}個, ボックス ${hits.box}個`);
  
  totalStraight += hits.straight;
  totalBox += hits.box;
});

console.log('\n=== 総合結果 ===');
console.log(`ストレート当選: ${totalStraight}/10回`);
console.log(`ボックス当選: ${totalBox}/10回`);
console.log('\n※これはシミュレーションデータでの検証です');
console.log('実際の効果を確認するには、本物の抽選データが必要です');