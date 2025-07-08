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
 * 単一の抽選結果をテスト
 */
async function testSingleScrape(drawNumber) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const url = `https://numbers-renban.tokyo/numbers4/result/${drawNumber}`;
    console.log(`テスト対象: ${url}`);
    
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
      console.log('日付の取得に失敗');
      return;
    }
    
    const drawDate = new Date(
      parseInt(dateMatch[1]),
      parseInt(dateMatch[2]) - 1,
      parseInt(dateMatch[3])
    );
    
    console.log(`抽選日: ${drawDate.toLocaleDateString('ja-JP')}`);
    
    // 当選番号を取得
    let winningNumber = '';
    
    // より具体的なパターンで当選番号を探す
    // 「抽選日:2024年08月13日(火曜日)」の後に表示される4桁数字
    const resultPattern = /抽選日:\d{4}年\d{1,2}月\d{1,2}日\([^)]+\)[\s\S]*?(\d{4})/;
    const resultMatch = pageText.match(resultPattern);
    if (resultMatch) {
      winningNumber = resultMatch[1];
    }
    
    console.log(`当選番号 (方法1): ${winningNumber}`);
    
    // 別の方法: HTMLタグ内の4桁数字を探す
    if (!winningNumber || winningNumber === '2024') {
      // 「第6533回ナンバーズ4抽選結果」と「ストレート」の間にある4桁数字
      const numberPattern = /第\d+回ナンバーズ4抽選結果[\s\S]*?抽選日:[^)]+\)[\s\S]*?(\d{4})[\s\S]*?ストレート/;
      const numberMatch = pageText.match(numberPattern);
      if (numberMatch) {
        winningNumber = numberMatch[1];
      }
    }
    
    console.log(`当選番号 (方法2): ${winningNumber}`);
    
    // さらに別の方法: HTMLから直接取得
    if (!winningNumber || winningNumber === '2024') {
      const htmlMatches = pageText.match(/<[^>]*>(\d{4})<[^>]*>/g);
      if (htmlMatches) {
        for (const match of htmlMatches) {
          const num = match.match(/(\d{4})/);
          if (num && num[1] !== '2024' && num[1] !== '6533') {
            winningNumber = num[1];
            break;
          }
        }
      }
    }
    
    console.log(`最終的な当選番号: ${winningNumber}`);
    
    if (winningNumber && winningNumber.length === 4) {
      console.log('✅ 取得成功');
    } else {
      console.log('❌ 取得失敗');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 第6533回をテスト
testSingleScrape(6533);