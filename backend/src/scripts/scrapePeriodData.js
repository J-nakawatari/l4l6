const axios = require('axios');
const cheerio = require('cheerio');
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
 * 指定範囲の抽選結果をスクレイピング
 */
async function scrapePeriodData(startDrawNumber, endDrawNumber) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB接続成功');
    
    console.log(`第${startDrawNumber}回～第${endDrawNumber}回のデータをスクレイピング開始`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let drawNumber = startDrawNumber; drawNumber <= endDrawNumber; drawNumber++) {
      try {
        // 既存データをチェック
        const existing = await DrawResult.findOne({ drawNumber });
        if (existing) {
          console.log(`第${drawNumber}回: 既存データをスキップ`);
          skipCount++;
          continue;
        }
        
        const url = `https://numbers-renban.tokyo/numbers4/result/${drawNumber}`;
        console.log(`第${drawNumber}回を取得中: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // 抽選日を取得（「抽選日:2024年08月13日(火曜日)」形式）
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
        
        // より具体的なパターンで当選番号を探す
        const resultPattern = /抽選日:\d{4}年\d{1,2}月\d{1,2}日\([^)]+\)[\s\S]*?(\d{4})/;
        const resultMatch = pageText.match(resultPattern);
        if (resultMatch) {
          winningNumber = resultMatch[1];
        }
        
        // 別の方法: HTMLタグ内の4桁数字を探す
        if (!winningNumber || winningNumber === dateMatch[1]) { // 年と同じ場合は除外
          const numberPattern = /第\d+回ナンバーズ4抽選結果[\s\S]*?抽選日:[^)]+\)[\s\S]*?(\d{4})[\s\S]*?ストレート/;
          const numberMatch = pageText.match(numberPattern);
          if (numberMatch) {
            winningNumber = numberMatch[1];
          }
        }
        
        // さらに別の方法: HTMLから直接取得
        if (!winningNumber || winningNumber === dateMatch[1] || winningNumber === drawNumber.toString()) {
          const htmlMatches = pageText.match(/<[^>]*>(\d{4})<[^>]*>/g);
          if (htmlMatches) {
            for (const match of htmlMatches) {
              const num = match.match(/(\d{4})/);
              if (num && num[1] !== dateMatch[1] && num[1] !== drawNumber.toString()) {
                winningNumber = num[1];
                break;
              }
            }
          }
        }
        
        if (!winningNumber || winningNumber.length !== 4) {
          console.log(`第${drawNumber}回: 当選番号の取得に失敗`);
          errorCount++;
          continue;
        }
        
        // 賞金情報を取得
        let straightAmount = 0;
        let straightWinners = 0;
        let boxAmount = 0;
        let boxWinners = 0;
        
        $('.prize-table tr').each((i, el) => {
          const cells = $(el).find('td');
          if (cells.length >= 3) {
            const type = $(cells[0]).text().trim();
            const amount = $(cells[1]).text().trim().replace(/[^\d]/g, '');
            const winners = $(cells[2]).text().trim().replace(/[^\d]/g, '');
            
            if (type.includes('ストレート')) {
              straightAmount = parseInt(amount) || 0;
              straightWinners = parseInt(winners) || 0;
            } else if (type.includes('ボックス')) {
              boxAmount = parseInt(amount) || 0;
              boxWinners = parseInt(winners) || 0;
            }
          }
        });
        
        // データを保存
        const drawResult = new DrawResult({
          drawNumber,
          drawDate,
          winningNumber,
          prize: {
            straight: {
              winners: straightWinners,
              amount: straightAmount
            },
            box: {
              winners: boxWinners,
              amount: boxAmount
            }
          },
          salesAmount: 0, // この情報は取得できない場合があるため0とする
          fetchedAt: new Date()
        });
        
        await drawResult.save();
        console.log(`第${drawNumber}回: 保存成功 (${winningNumber}, ${drawDate.toLocaleDateString('ja-JP')})`);
        successCount++;
        
        // レート制限のため少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`第${drawNumber}回でエラー:`, error.message);
        errorCount++;
        
        // 少し待ってから次へ
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== スクレイピング完了 ===');
    console.log(`成功: ${successCount}件`);
    console.log(`スキップ: ${skipCount}件`);
    console.log(`エラー: ${errorCount}件`);
    console.log(`合計処理: ${endDrawNumber - startDrawNumber + 1}件`);
    
  } catch (error) {
    console.error('スクレイピングエラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
// 第6533回～第6758回をスクレイピング
scrapePeriodData(6533, 6758);