const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config();

// DrawResultスキーマ（150件のみ保持）
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
 * 楽天宝くじからNumbers4データを取得
 */
async function scrapeRakutenNumbers4() {
  try {
    console.log('楽天宝くじからデータを取得中...');
    
    const response = await axios.get('https://takarakuji.rakuten.co.jp/backnumber/numbers4/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // ページのテキストから情報を抽出
    const bodyText = $('body').text();
    
    // パターン: 第XXXX回、日付、当選番号
    // より柔軟なパターンマッチング
    const lines = bodyText.split(/\n+/);
    let currentDraw = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 回号を探す
      const drawMatch = line.match(/第(\d{4,})回/);
      if (drawMatch) {
        if (currentDraw && currentDraw.winningNumber) {
          results.push(currentDraw);
        }
        currentDraw = {
          drawNumber: parseInt(drawMatch[1])
        };
      }
      
      // 日付を探す（YYYY/MM/DD または YYYY年MM月DD日）
      if (currentDraw && !currentDraw.drawDate) {
        const dateMatch = line.match(/(\d{4})[\/年](\d{1,2})[\/月](\d{1,2})/);
        if (dateMatch) {
          currentDraw.drawDate = new Date(
            parseInt(dateMatch[1]),
            parseInt(dateMatch[2]) - 1,
            parseInt(dateMatch[3])
          );
        }
      }
      
      // 当選番号を探す（4桁の数字）
      if (currentDraw && !currentDraw.winningNumber) {
        const numMatch = line.match(/\b(\d{4})\b/);
        if (numMatch && !line.includes('第') && !line.includes('年')) {
          // 第XXXX回や年号でないことを確認
          const num = numMatch[1];
          if (num !== currentDraw.drawNumber.toString()) {
            currentDraw.winningNumber = num;
          }
        }
      }
    }
    
    // 最後のエントリーを追加
    if (currentDraw && currentDraw.winningNumber) {
      results.push(currentDraw);
    }
    
    // テーブルからも試す
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        const rowText = $(row).text();
        
        const drawMatch = rowText.match(/第(\d{4,})回/);
        const dateMatch = rowText.match(/(\d{4})[\/年](\d{1,2})[\/月](\d{1,2})/);
        const numMatch = rowText.match(/当[せ選]番号[:：\s]*(\d{4})/);
        
        if (drawMatch && dateMatch && numMatch) {
          const drawNumber = parseInt(drawMatch[1]);
          const existing = results.find(r => r.drawNumber === drawNumber);
          
          if (!existing) {
            results.push({
              drawNumber,
              drawDate: new Date(
                parseInt(dateMatch[1]),
                parseInt(dateMatch[2]) - 1,
                parseInt(dateMatch[3])
              ),
              winningNumber: numMatch[1]
            });
          }
        }
      });
    });
    
    // 重複を削除し、新しい順にソート
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.drawNumber, r])).values()
    ).sort((a, b) => b.drawNumber - a.drawNumber);
    
    console.log(`${uniqueResults.length}件のデータを取得しました`);
    
    if (uniqueResults.length > 0) {
      console.log('\n取得したデータ（最新5件）:');
      uniqueResults.slice(0, 5).forEach(r => {
        console.log(`第${r.drawNumber}回 (${r.drawDate.toLocaleDateString('ja-JP')}): ${r.winningNumber}`);
      });
    }
    
    return uniqueResults;
    
  } catch (error) {
    console.error('楽天宝くじからの取得エラー:', error.message);
    return [];
  }
}

/**
 * データベースを更新（150件を維持）
 */
async function updateDatabase(newData) {
  let addedCount = 0;
  
  for (const data of newData) {
    try {
      const existing = await DrawResult.findOne({ drawNumber: data.drawNumber });
      if (!existing) {
        await DrawResult.create({
          drawNumber: data.drawNumber,
          drawDate: data.drawDate,
          winningNumber: data.winningNumber,
          prize: {
            straight: { winners: 0, amount: 0 },
            box: { winners: 0, amount: 0 }
          },
          salesAmount: 0,
          fetchedAt: new Date()
        });
        addedCount++;
        console.log(`追加: 第${data.drawNumber}回`);
      }
    } catch (err) {
      console.error(`保存エラー（第${data.drawNumber}回）:`, err.message);
    }
  }
  
  // 150件を超えた分を削除
  if (addedCount > 0) {
    const total = await DrawResult.countDocuments();
    if (total > 150) {
      const deleteCount = total - 150;
      const oldestDocs = await DrawResult.find()
        .sort({ drawNumber: 1 })
        .limit(deleteCount);
      
      for (const doc of oldestDocs) {
        await DrawResult.deleteOne({ _id: doc._id });
        console.log(`削除: 第${doc.drawNumber}回`);
      }
    }
  }
  
  return addedCount;
}

/**
 * メイン処理
 */
async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Numbers4データ自動更新（代替方法）===');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}\n`);
    
    // 現在の状態を確認
    const currentCount = await DrawResult.countDocuments();
    const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`現在のデータ: ${currentCount}件`);
    if (latest) {
      console.log(`最新: 第${latest.drawNumber}回 (${latest.drawDate.toLocaleDateString('ja-JP')})\n`);
    }
    
    // スクレイピング実行
    const scrapedData = await scrapeRakutenNumbers4();
    
    if (scrapedData.length > 0) {
      // 新しいデータのみフィルタリング
      const latestDrawNumber = latest ? latest.drawNumber : 0;
      const newData = scrapedData.filter(d => d.drawNumber > latestDrawNumber);
      
      console.log(`\n新規データ: ${newData.length}件`);
      
      if (newData.length > 0) {
        const added = await updateDatabase(newData);
        console.log(`\n${added}件のデータを追加しました`);
      } else {
        console.log('新しいデータはありません');
      }
    }
    
    // 最終状態を表示
    const finalCount = await DrawResult.countDocuments();
    const finalLatest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const finalOldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    
    console.log('\n=== 更新後の状態 ===');
    console.log(`総データ数: ${finalCount}件`);
    if (finalOldest && finalLatest) {
      console.log(`データ範囲: 第${finalOldest.drawNumber}回～第${finalLatest.drawNumber}回`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// クーロン用のエクスポート
async function cronUpdate() {
  console.log(`[CRON] ${new Date().toISOString()} - Numbers4更新開始`);
  await main();
  console.log(`[CRON] ${new Date().toISOString()} - Numbers4更新完了`);
}

// 実行
if (require.main === module) {
  main();
}

module.exports = {
  scrapeRakutenNumbers4,
  updateDatabase,
  cronUpdate
};