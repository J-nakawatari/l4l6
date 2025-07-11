#!/usr/bin/env node

/**
 * ナンバーズ4の予想を毎日自動生成するスクリプト
 * cronで毎日20:00に実行することを想定
 * 
 * crontab設定例:
 * 0 20 * * * cd /var/www/l4l6/backend && /usr/bin/node src/scripts/generateDailyPredictions.js >> logs/prediction-cron.log 2>&1
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// TypeScript用にdist配下から読み込み
const modelPath = process.env.NODE_ENV === 'production' ? '../dist' : '..';

// 必要なモデルとサービスをインポート
const DrawResultSchema = new mongoose.Schema({
  drawNumber: { type: Number, unique: true },
  drawDate: Date,
  winningNumber: String,
  prize: {
    straight: { winners: Number, amount: Number },
    box: { winners: Number, amount: Number }
  }
});

const PredictionSchema = new mongoose.Schema({
  drawNumber: { type: Number, required: true, unique: true },
  drawDate: { type: Date, required: true },
  dataLogicPredictions: [String],
  aiPredictions: [String],
  kakoPredictions: [String],
  generatedAt: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);
const Prediction = mongoose.model('Prediction', PredictionSchema);

// 日本の祝日データ（2024-2025年）
const holidays = [
  '2024-01-01', '2024-01-08', '2024-02-11', '2024-02-12', '2024-02-23',
  '2024-03-20', '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-05-06', '2024-07-15', '2024-08-11', '2024-08-12', '2024-09-16',
  '2024-09-22', '2024-09-23', '2024-10-14', '2024-11-03', '2024-11-04',
  '2024-11-23', '2024-12-23', '2025-01-01', '2025-01-13', '2025-02-11',
  '2025-02-23', '2025-02-24', '2025-03-20', '2025-04-29', '2025-05-03',
  '2025-05-04', '2025-05-05', '2025-05-06', '2025-07-21', '2025-08-11',
  '2025-09-15', '2025-09-23', '2025-10-13', '2025-11-03', '2025-11-23',
  '2025-11-24'
];

/**
 * 次回抽選日を計算
 * @param {Date} fromDate - 基準日
 * @returns {Date} 次回抽選日
 */
function calculateNextDrawDate(fromDate = new Date()) {
  let nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  while (true) {
    const dayOfWeek = nextDate.getDay();
    const dateStr = nextDate.toISOString().split('T')[0];
    
    // 土日と祝日を除外
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
      break;
    }
    
    nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate;
}

/**
 * 簡易版遷移確率予想
 */
function generateSimpleTransitionPrediction(past100, latestDraw) {
  try {
    const lastNumber = latestDraw.winningNumber;
    const prediction = [];
    
    // 各桁で最も頻繁に続く数字を選択
    for (let pos = 0; pos < 4; pos++) {
      const digit = lastNumber[pos];
      const nextCounts = {};
      
      // 過去データで同じ数字の後に来た数字をカウント
      for (let i = 0; i < past100.length - 1; i++) {
        if (past100[i].winningNumber[pos] === digit) {
          const nextDigit = past100[i + 1].winningNumber[pos];
          nextCounts[nextDigit] = (nextCounts[nextDigit] || 0) + 1;
        }
      }
      
      // 最頻出の次の数字を選択
      let maxCount = 0;
      let selectedDigit = digit;
      for (const [d, count] of Object.entries(nextCounts)) {
        if (count > maxCount) {
          maxCount = count;
          selectedDigit = d;
        }
      }
      
      prediction.push(selectedDigit);
    }
    
    return prediction.join('');
  } catch (error) {
    console.error('遷移確率予想でエラー:', error);
    return null;
  }
}

/**
 * 簡易版相関予想
 */
function generateSimpleCorrelationPrediction(past100) {
  try {
    // 各桁で最頻出の数字を選択
    const prediction = [];
    
    for (let pos = 0; pos < 4; pos++) {
      const counts = {};
      
      for (const draw of past100) {
        const digit = draw.winningNumber[pos];
        counts[digit] = (counts[digit] || 0) + 1;
      }
      
      // 最頻出の数字を選択
      let maxCount = 0;
      let selectedDigit = '0';
      for (const [digit, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          selectedDigit = digit;
        }
      }
      
      prediction.push(selectedDigit);
    }
    
    return prediction.join('');
  } catch (error) {
    console.error('相関予想でエラー:', error);
    return null;
  }
}

/**
 * AIランダム予想を12個生成（固定シード使用）
 */
function generateAIRandomPredictions(drawNumber) {
  let random = drawNumber;
  
  const lcg = () => {
    random = (random * 1664525 + 1013904223) % 4294967296;
    return random / 4294967296;
  };
  
  const predictions = [];
  const used = new Set();
  
  while (predictions.length < 12) {
    const digits = [];
    for (let i = 0; i < 4; i++) {
      digits.push(Math.floor(lcg() * 10).toString());
    }
    const number = digits.join('');
    
    if (!used.has(number)) {
      used.add(number);
      predictions.push(number);
    }
  }
  
  return predictions;
}

/**
 * メイン処理
 */
async function generateDailyPredictions() {
  const startTime = Date.now();
  
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    console.log('データベースに接続しました');
    
    // 最新の抽選結果を取得
    const latestDraw = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    if (!latestDraw) {
      throw new Error('抽選結果が見つかりません');
    }
    
    console.log(`最新抽選結果: 第${latestDraw.drawNumber}回 (${latestDraw.winningNumber})`);
    
    // 次回抽選番号
    const nextDrawNumber = latestDraw.drawNumber + 1;
    const nextDrawDate = calculateNextDrawDate(latestDraw.drawDate);
    
    console.log(`次回抽選: 第${nextDrawNumber}回 (${nextDrawDate.toLocaleDateString('ja-JP')})`);
    
    // 既に予想が存在するかチェック
    const existingPrediction = await Prediction.findOne({ drawNumber: nextDrawNumber });
    if (existingPrediction) {
      console.log('既に予想が生成されています');
      return;
    }
    
    // 過去100回分のデータを取得
    const past100 = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(100)
      .exec();
    
    console.log(`過去${past100.length}回分のデータを取得しました`);
    
    // 各アルゴリズムで予想を生成
    console.log('予想を生成中...');
    
    // 1. ハイブリッド予想（12個）- AIランダムと同じものを使用
    const hybridPredictions = generateAIRandomPredictions(nextDrawNumber + 1000); // 別のシード
    console.log('ハイブリッド予想:', hybridPredictions);
    
    // 2. 遷移確率予想（1個）- 簡易版
    const transitionPrediction = generateSimpleTransitionPrediction(past100, latestDraw);
    const transitionArray = transitionPrediction ? [transitionPrediction] : [];
    console.log('遷移確率予想:', transitionArray);
    
    // 3. 相関予想（1個）- 最頻出の組み合わせ
    const correlationPrediction = generateSimpleCorrelationPrediction(past100);
    const correlationArray = correlationPrediction ? [correlationPrediction] : [];
    console.log('相関予想:', correlationArray);
    
    // 4. パターン予想（1個）- 最新の番号を反転
    const patternPrediction = latestDraw.winningNumber.split('').reverse().join('');
    const patternArray = [patternPrediction];
    console.log('パターン予想:', patternArray);
    
    // 5. AIランダム予想（12個）- 固定シード
    const aiRandomPredictions = generateAIRandomPredictions(nextDrawNumber);
    console.log('AIランダム予想:', aiRandomPredictions);
    
    // データロジック予想として統合（遷移確率＋相関＋パターン）
    const dataLogicPredictions = [
      ...transitionArray,
      ...correlationArray,
      ...patternArray
    ].filter(p => p !== null);
    
    // AI予想として統合（ハイブリッド12個）
    const aiPredictions = hybridPredictions.slice(0, 10); // 最大10個
    
    // 過去実績予想として統合（AIランダム予想から抜粋）
    const kakoPredictions = aiRandomPredictions.slice(0, 10); // 最大10個
    
    // 予想をデータベースに保存
    const newPrediction = new Prediction({
      drawNumber: nextDrawNumber,
      drawDate: nextDrawDate,
      dataLogicPredictions: dataLogicPredictions,
      aiPredictions: aiPredictions,
      kakoPredictions: kakoPredictions,
      generatedAt: new Date()
    });
    
    await newPrediction.save();
    console.log('予想を保存しました');
    
    // ログ記録
    console.log('予想生成完了:', {
      drawNumber: nextDrawNumber,
      drawDate: nextDrawDate,
      predictionsCount: {
        dataLogic: dataLogicPredictions.length,
        ai: aiPredictions.length,
        kako: kakoPredictions.length,
        total: dataLogicPredictions.length + aiPredictions.length + kakoPredictions.length
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`処理完了 (${duration}ms)`);
    
  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('データベース接続を終了しました');
  }
}

// スクリプト実行
if (require.main === module) {
  generateDailyPredictions()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { generateDailyPredictions, calculateNextDrawDate };