const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

// DrawResultスキーマ
const DrawResultSchema = new mongoose.Schema({
  drawNumber: { type: Number, unique: true },
  drawDate: Date,
  winningNumber: String,
  prize: {
    straight: {
      winners: Number,
      amount: Number
    },
    box: {
      winners: Number,
      amount: Number
    }
  },
  salesAmount: Number,
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

/**
 * 指定範囲の抽選結果をテストスクレイピング
 */
async function testPeriodScraping(startDrawNumber, endDrawNumber) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB接続成功');
    
    console.log(`第${startDrawNumber}回～第${endDrawNumber}回のテストスクレイピング開始`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let drawNumber = startDrawNumber; drawNumber <= endDrawNumber; drawNumber++) {
      try {
        const url = `https://numbers-renban.tokyo/numbers4/result/${drawNumber}`;
        console.log(`第${drawNumber}回を取得中: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        // 抽選日を取得
        const pageText = response.data;
        const dateMatch = pageText.match(/抽選日:(\d{4})年(\d{1,2})月(\d{1,2})日/);
        
        if (!dateMatch) {
          console.log(`第${drawNumber}回: 日付の取得に失敗`);
          errorCount++;
          continue;
        }
        
        const drawDate = new Date(
          parseInt(dateMatch[1]),
          parseInt(dateMatch[2]) - 1,
          parseInt(dateMatch[3])
        );
        
        // 当選番号を取得
        let winningNumber = '';
        
        const resultPattern = /抽選日:\d{4}年\d{1,2}月\d{1,2}日\([^)]+\)[\s\S]*?(\d{4})/;
        const resultMatch = pageText.match(resultPattern);
        if (resultMatch) {
          winningNumber = resultMatch[1];
        }
        
        if (!winningNumber || winningNumber === dateMatch[1]) {
          const numberPattern = /第\d+回ナンバーズ4抽選結果[\s\S]*?抽選日:[^)]+\)[\s\S]*?(\d{4})[\s\S]*?ストレート/;
          const numberMatch = pageText.match(numberPattern);
          if (numberMatch) {
            winningNumber = numberMatch[1];
          }
        }
        
        if (!winningNumber || winningNumber.length !== 4) {
          console.log(`第${drawNumber}回: 当選番号の取得に失敗`);
          errorCount++;
          continue;
        }
        
        console.log(`第${drawNumber}回: 成功 (${winningNumber}, ${drawDate.toLocaleDateString('ja-JP')})`);
        successCount++;
        
        // レート制限のため少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`第${drawNumber}回でエラー:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== テスト結果 ===');
    console.log(`成功: ${successCount}件`);
    console.log(`エラー: ${errorCount}件`);
    
  } catch (error) {
    console.error('スクレイピングエラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 第6533回～第6542回（10回分）をテスト
testPeriodScraping(6533, 6542);