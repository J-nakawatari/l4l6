// Simulation of kako prediction validation without database connection
// This demonstrates how the algorithm would perform against real data

interface DrawResult {
  drawNumber: number;
  drawDate: Date;
  winningNumber: string;
}

interface ValidationResult {
  drawNumber: number;
  drawDate: Date;
  winningNumber: string;
  predictions: string[];
  straightHit: boolean;
  boxHit: boolean;
  matchedPrediction?: string;
}

// Sample historical data - simulating last 110 draws
// Using realistic Numbers4 data patterns
const sampleDrawResults: DrawResult[] = [
  // Recent 10 draws (what we'll validate against)
  { drawNumber: 6110, drawDate: new Date('2024-01-10'), winningNumber: '3827' },
  { drawNumber: 6109, drawDate: new Date('2024-01-09'), winningNumber: '4591' },
  { drawNumber: 6108, drawDate: new Date('2024-01-08'), winningNumber: '2764' },
  { drawNumber: 6107, drawDate: new Date('2024-01-07'), winningNumber: '8135' },
  { drawNumber: 6106, drawDate: new Date('2024-01-06'), winningNumber: '5903' },
  { drawNumber: 6105, drawDate: new Date('2024-01-05'), winningNumber: '7428' },
  { drawNumber: 6104, drawDate: new Date('2024-01-04'), winningNumber: '1652' },
  { drawNumber: 6103, drawDate: new Date('2024-01-03'), winningNumber: '9074' },
  { drawNumber: 6102, drawDate: new Date('2024-01-02'), winningNumber: '3518' },
  { drawNumber: 6101, drawDate: new Date('2024-01-01'), winningNumber: '6290' },
  
  // Previous 100 draws (for frequency analysis)
  { drawNumber: 6100, drawDate: new Date('2023-12-31'), winningNumber: '4725' },
  { drawNumber: 6099, drawDate: new Date('2023-12-30'), winningNumber: '8361' },
  { drawNumber: 6098, drawDate: new Date('2023-12-29'), winningNumber: '2907' },
  { drawNumber: 6097, drawDate: new Date('2023-12-28'), winningNumber: '5143' },
  { drawNumber: 6096, drawDate: new Date('2023-12-27'), winningNumber: '7689' },
  { drawNumber: 6095, drawDate: new Date('2023-12-26'), winningNumber: '0254' },
  { drawNumber: 6094, drawDate: new Date('2023-12-25'), winningNumber: '3817' },
  { drawNumber: 6093, drawDate: new Date('2023-12-24'), winningNumber: '9062' },
  { drawNumber: 6092, drawDate: new Date('2023-12-23'), winningNumber: '4598' },
  { drawNumber: 6091, drawDate: new Date('2023-12-22'), winningNumber: '1730' },
  // Adding more data with some patterns
  { drawNumber: 6090, drawDate: new Date('2023-12-21'), winningNumber: '5274' },
  { drawNumber: 6089, drawDate: new Date('2023-12-20'), winningNumber: '8369' },
  { drawNumber: 6088, drawDate: new Date('2023-12-19'), winningNumber: '2015' },
  { drawNumber: 6087, drawDate: new Date('2023-12-18'), winningNumber: '7483' },
  { drawNumber: 6086, drawDate: new Date('2023-12-17'), winningNumber: '3941' },
  { drawNumber: 6085, drawDate: new Date('2023-12-16'), winningNumber: '6527' },
  { drawNumber: 6084, drawDate: new Date('2023-12-15'), winningNumber: '0193' },
  { drawNumber: 6083, drawDate: new Date('2023-12-14'), winningNumber: '8652' },
  { drawNumber: 6082, drawDate: new Date('2023-12-13'), winningNumber: '4708' },
  { drawNumber: 6081, drawDate: new Date('2023-12-12'), winningNumber: '2364' },
];

// Generate more sample data to have 110 total
for (let i = 6080; i >= 6001; i--) {
  const date = new Date(2023, 11, 11 - (6080 - i));
  // Generate pseudo-random but reproducible numbers
  const n1 = (i * 7) % 10;
  const n2 = (i * 3) % 10;
  const n3 = (i * 5) % 10;
  const n4 = (i * 2) % 10;
  sampleDrawResults.push({
    drawNumber: i,
    drawDate: date,
    winningNumber: `${n1}${n2}${n3}${n4}`
  });
}

// ボックス判定用のヘルパー関数
function isBoxMatch(prediction: string, winningNumber: string): boolean {
  const predSorted = prediction.split('').sort().join('');
  const winningSorted = winningNumber.split('').sort().join('');
  return predSorted === winningSorted;
}

// Simplified kako prediction algorithm
function simulateKakoPrediction(historicalData: DrawResult[]): string[] {
  if (historicalData.length === 0) {
    return [];
  }

  // 各桁の頻度を計算
  const digitFrequency: Array<Record<string, number>> = [
    {}, // 1の位
    {}, // 10の位
    {}, // 100の位
    {}, // 1000の位
  ];

  // 初期化
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= 9; j++) {
      digitFrequency[i][j.toString()] = 0;
    }
  }

  // 各桁の出現回数をカウント
  historicalData.forEach(result => {
    const number = result.winningNumber.padStart(4, '0');
    
    for (let i = 0; i < 4; i++) {
      const digit = number[3 - i]; // 右から数える（1の位から）
      digitFrequency[i][digit] = (digitFrequency[i][digit] || 0) + 1;
    }
  });

  // 各桁で最も頻出する数字を取得
  const mostFrequentDigits: string[] = digitFrequency.map(freq => {
    let maxCount = 0;
    let mostFrequent = '0';
    
    Object.entries(freq).forEach(([digit, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = digit;
      }
    });
    
    return mostFrequent;
  });

  // 基本予想（最頻出数字の組み合わせ）
  const basePrediction = mostFrequentDigits[3] + mostFrequentDigits[2] + 
                        mostFrequentDigits[1] + mostFrequentDigits[0];

  // 予想結果を生成
  const predictions: Set<string> = new Set();
  
  // 1. 基本予想
  predictions.add(basePrediction);

  // 2. 各桁の2番目に多い数字も取得
  const secondFrequentDigits: string[] = digitFrequency.map(freq => {
    const sorted = Object.entries(freq)
      .sort(([, a], [, b]) => b - a);
    
    return sorted.length > 1 ? sorted[1][0] : sorted[0][0];
  });

  // 3. 最頻出と2番目の組み合わせパターンを生成
  for (let i = 0; i < 4; i++) {
    const pattern = [...mostFrequentDigits];
    pattern[i] = secondFrequentDigits[i];
    predictions.add(pattern[3] + pattern[2] + pattern[1] + pattern[0]);
  }

  // 4. 追加のバリエーション
  for (let i = 0; i < 4 && predictions.size < 10; i++) {
    const mixed = [...mostFrequentDigits];
    mixed[i] = secondFrequentDigits[i];
    
    for (let j = 0; j < 4 && predictions.size < 10; j++) {
      if (i !== j) {
        [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
        predictions.add(mixed[3]! + mixed[2]! + mixed[1]! + mixed[0]!);
      }
    }
  }

  return Array.from(predictions).slice(0, 10);
}

// Main validation function
function validateKakoPredictions() {
  console.log(`\n=== 過去10回分の抽選結果に対するKako予想アルゴリズムの検証（シミュレーション） ===\n`);

  const results: ValidationResult[] = [];
  let straightHitCount = 0;
  let boxHitCount = 0;

  // Get the last 10 draws for validation
  const recentDraws = sampleDrawResults.slice(0, 10);

  // Validate each draw
  for (const draw of recentDraws) {
    // Get historical data before this draw (100 draws)
    const historicalData = sampleDrawResults.filter(d => 
      d.drawNumber < draw.drawNumber && 
      d.drawNumber >= draw.drawNumber - 100
    );

    // Generate predictions
    const predictions = simulateKakoPrediction(historicalData);
    
    // Check if predictions match winning number
    let straightHit = false;
    let boxHit = false;
    let matchedPrediction: string | undefined;

    for (const pred of predictions) {
      if (pred === draw.winningNumber) {
        straightHit = true;
        matchedPrediction = pred;
        break;
      } else if (isBoxMatch(pred, draw.winningNumber)) {
        boxHit = true;
        matchedPrediction = pred;
      }
    }

    if (straightHit) straightHitCount++;
    if (boxHit || straightHit) boxHitCount++;

    results.push({
      drawNumber: draw.drawNumber,
      drawDate: draw.drawDate,
      winningNumber: draw.winningNumber,
      predictions,
      straightHit,
      boxHit: boxHit || straightHit,
      matchedPrediction
    });

    // Display details
    console.log(`抽選回: ${draw.drawNumber} (${draw.drawDate.toLocaleDateString('ja-JP')})`);
    console.log(`当選番号: ${draw.winningNumber}`);
    console.log(`予想番号: ${predictions.join(', ')}`);
    console.log(`結果: ${straightHit ? '✅ ストレート的中!' : boxHit ? '🔸 ボックス的中' : '❌ 不的中'}`);
    if (matchedPrediction) {
      console.log(`的中した予想: ${matchedPrediction}`);
    }
    console.log('---');
  }

  // Summary
  console.log(`\n=== 検証結果サマリー ===`);
  console.log(`総検証回数: ${results.length}回`);
  console.log(`ストレート的中: ${straightHitCount}回 (${(straightHitCount / results.length * 100).toFixed(1)}%)`);
  console.log(`ボックス的中: ${boxHitCount}回 (${(boxHitCount / results.length * 100).toFixed(1)}%)`);
  console.log(`完全不的中: ${results.length - boxHitCount}回 (${((results.length - boxHitCount) / results.length * 100).toFixed(1)}%)`);

  // Hit details
  const hits = results.filter(r => r.straightHit || r.boxHit);
  if (hits.length > 0) {
    console.log(`\n=== 的中詳細 ===`);
    hits.forEach(hit => {
      console.log(`第${hit.drawNumber}回 - ${hit.winningNumber} - ${hit.straightHit ? 'ストレート' : 'ボックス'} - 予想: ${hit.matchedPrediction}`);
    });
  }

  // Frequency analysis for the most recent prediction
  console.log(`\n=== 頻度分析例（第6110回の予想用データ） ===`);
  const latestHistorical = sampleDrawResults.filter(d => 
    d.drawNumber < 6110 && d.drawNumber >= 6010
  );
  
  const digitFreq: Array<Record<string, number>> = [{}, {}, {}, {}];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j <= 9; j++) {
      digitFreq[i]![j.toString()] = 0;
    }
  }
  
  latestHistorical.forEach(result => {
    const number = result.winningNumber.padStart(4, '0');
    for (let i = 0; i < 4; i++) {
      const digit = number[3 - i]!;
      digitFreq[i]![digit] = (digitFreq[i]![digit] || 0) + 1;
    }
  });

  for (let i = 0; i < 4; i++) {
    const position = ['1の位', '10の位', '100の位', '1000の位'][i];
    const sorted = Object.entries(digitFreq[i]!)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    console.log(`${position}: ${sorted.map(([d, c]) => `${d}(${c}回)`).join(', ')}`);
  }

  // Comparison with theoretical probability
  console.log(`\n=== 理論確率との比較 ===`);
  console.log(`ストレート理論確率: 0.01% (1/10,000)`);
  console.log(`実際の的中率: ${(straightHitCount / results.length * 100).toFixed(1)}%`);
  console.log(`ボックス理論確率: 約0.04-0.24% (組み合わせによる)`);
  console.log(`実際の的中率: ${(boxHitCount / results.length * 100).toFixed(1)}%`);
  
  console.log(`\n注：これはシミュレーションデータを使用した検証です。`);
  console.log(`実際のデータベースに接続して検証を行うには、MongoDBが実行されている必要があります。`);
}

// Run validation
validateKakoPredictions();