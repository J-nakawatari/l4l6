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
 * numbers-renban.tokyoからNumbers4データを取得
 */
async function scrapeNumbersRenban(pageNum = 1) {
  try {
    const url = `https://numbers-renban.tokyo/numbers4/result_all?s=desc&l=20&page=${pageNum}`;
    console.log(`ページ${pageNum}を取得中: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // table-stripedクラスのテーブルを探す
    $('table.table-striped tr').each((index, row) => {
      // ヘッダー行をスキップ
      if (index === 0) return;
      
      const cells = $(row).find('td');
      
      if (cells.length >= 4) {
        // 第1セル: 抽選回（第XXXX回）
        const drawText = $(cells[0]).text().trim();
        
        // 第2セル: 日付（2025-07-08（火）形式）
        let dateText = $(cells[1]).text().trim();
        const dateMatch = dateText.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          dateText = dateMatch[1];
        }
        
        // 第3セル: 当選番号（リンク内にある）
        const numCell = $(cells[2]);
        const numLink = numCell.find('a');
        let winningNum = '';
        if (numLink.length > 0) {
          winningNum = numLink.text().trim();
        } else {
          winningNum = numCell.text().trim();
        }
        
        // 第4セル: 当選口数（d-none d-sm-table-cellクラス）
        let winnersText = '';
        let amountText = '';
        
        // 当選口数を探す
        const winnersCell = $(row).find('td.d-none.d-sm-table-cell').first();
        if (winnersCell.length > 0) {
          winnersText = winnersCell.text().trim();
        }
        
        // 第5セル: 当選金額
        if (cells.length >= 5) {
          amountText = $(cells[4]).text().trim();
        }
        
        // リンクからも回号を取得
        const drawLink = $(cells[0]).find('a');
        let drawNumber = null;
        
        // URLから回号を抽出（/result/6764のような形式）
        if (drawLink.length > 0) {
          const href = drawLink.attr('href');
          const urlMatch = href && href.match(/\/result\/(\d+)$/);
          if (urlMatch) {
            drawNumber = parseInt(urlMatch[1]);
          }
        }
        
        // URLから取得できない場合はテキストから
        if (!drawNumber) {
          const drawMatch = drawText.match(/第(\d+)回/);
          if (drawMatch) {
            drawNumber = parseInt(drawMatch[1]);
          }
        }
        
        // データの検証と保存
        if (drawNumber && winningNum.match(/^\d{4}$/)) {
          const result = {
            drawNumber,
            winningNumber: winningNum
          };
          
          // 日付の解析（YYYY-MM-DD形式）
          if (dateText.match(/\d{4}-\d{2}-\d{2}/)) {
            const [year, month, day] = dateText.split('-').map(n => parseInt(n));
            result.drawDate = new Date(year, month - 1, day);
          }
          
          // 当選者数と賞金
          const winnersMatch = winnersText.match(/(\d+)/);
          const amountMatch = amountText.match(/([\d,]+)/);
          
          if (winnersMatch) {
            result.straightWinners = parseInt(winnersMatch[1]);
          }
          if (amountMatch) {
            result.straightAmount = parseInt(amountMatch[1].replace(/,/g, ''));
          }
          
          results.push(result);
        }
      }
    });
    
    console.log(`  → ${results.length}件のデータを取得`);
    
    return results;
    
  } catch (error) {
    console.error('スクレイピングエラー:', error.message);
    return [];
  }
}

/**
 * 最新データを取得してデータベースを更新
 */
async function updateFromNumbersRenban() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Numbers4データ更新（numbers-renban.tokyo）===');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}\n`);
    
    // 現在の状態を確認
    const currentCount = await DrawResult.countDocuments();
    const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`現在のデータ: ${currentCount}件`);
    if (latest) {
      console.log(`最新: 第${latest.drawNumber}回 (${latest.drawDate.toLocaleDateString('ja-JP')})\n`);
    }
    
    // 最新データを取得（最初の数ページ）
    const allResults = [];
    const maxPages = 3; // 最新60件程度を確認
    
    for (let page = 1; page <= maxPages; page++) {
      const pageResults = await scrapeNumbersRenban(page);
      allResults.push(...pageResults);
      
      // 少し待機
      if (page < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n合計${allResults.length}件のデータを取得`);
    
    // 新しいデータのみフィルタリング
    const latestDrawNumber = latest ? latest.drawNumber : 0;
    const newResults = allResults.filter(r => r.drawNumber > latestDrawNumber);
    
    console.log(`新規データ: ${newResults.length}件`);
    
    if (newResults.length > 0) {
      // 新しいデータを追加
      let addedCount = 0;
      for (const result of newResults) {
        try {
          await DrawResult.create({
            drawNumber: result.drawNumber,
            drawDate: result.drawDate,
            winningNumber: result.winningNumber,
            prize: {
              straight: {
                winners: result.straightWinners || 0,
                amount: result.straightAmount || 0
              },
              box: {
                winners: 0,
                amount: 0
              }
            },
            salesAmount: 0,
            fetchedAt: new Date()
          });
          addedCount++;
          console.log(`追加: 第${result.drawNumber}回 (${result.drawDate.toLocaleDateString('ja-JP')}): ${result.winningNumber}`);
        } catch (err) {
          if (err.code !== 11000) { // 重複以外のエラー
            console.error(`保存エラー: ${err.message}`);
          }
        }
      }
      
      console.log(`\n${addedCount}件のデータを追加しました`);
      
      // 150件を超えた分を削除
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
    
    // 最終状態を表示
    const finalCount = await DrawResult.countDocuments();
    const finalLatest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const finalOldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    
    console.log('\n=== 更新後の状態 ===');
    console.log(`総データ数: ${finalCount}件`);
    if (finalOldest && finalLatest) {
      console.log(`データ範囲: 第${finalOldest.drawNumber}回～第${finalLatest.drawNumber}回`);
      console.log(`期間: ${finalOldest.drawDate.toLocaleDateString('ja-JP')} ～ ${finalLatest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
    // 最新5件を表示
    console.log('\n最新5件:');
    const latest5 = await DrawResult.find().sort({ drawNumber: -1 }).limit(5);
    latest5.forEach(d => {
      const prizeInfo = d.prize.straight.winners > 0 
        ? ` - ${d.prize.straight.winners}口 ${d.prize.straight.amount.toLocaleString()}円`
        : '';
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}${prizeInfo}`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * 全履歴を取得（初期設定用）
 */
async function fetchAllHistory(startPage = 1, maxPages = 10) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`=== 履歴データ取得（${startPage}ページ目から最大${maxPages}ページ）===\n`);
    
    let totalFetched = 0;
    let totalAdded = 0;
    
    for (let page = startPage; page < startPage + maxPages; page++) {
      const results = await scrapeNumbersRenban(page);
      totalFetched += results.length;
      
      if (results.length === 0) {
        console.log('データが見つからなくなりました');
        break;
      }
      
      // データベースに追加
      for (const result of results) {
        try {
          const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
          if (!existing) {
            await DrawResult.create({
              drawNumber: result.drawNumber,
              drawDate: result.drawDate,
              winningNumber: result.winningNumber,
              prize: {
                straight: {
                  winners: result.straightWinners || 0,
                  amount: result.straightAmount || 0
                },
                box: { winners: 0, amount: 0 }
              },
              salesAmount: 0,
              fetchedAt: new Date()
            });
            totalAdded++;
          }
        } catch (err) {
          // エラーは無視
        }
      }
      
      // 150件に達したら終了
      const count = await DrawResult.countDocuments();
      if (count >= 150) {
        console.log('\n150件に達しました');
        break;
      }
      
      // 待機
      if (page < startPage + maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`\n取得: ${totalFetched}件, 追加: ${totalAdded}件`);
    
    // 150件を超えた分を削除
    const total = await DrawResult.countDocuments();
    if (total > 150) {
      const deleteCount = total - 150;
      const oldestDocs = await DrawResult.find()
        .sort({ drawNumber: 1 })
        .limit(deleteCount);
      
      for (const doc of oldestDocs) {
        await DrawResult.deleteOne({ _id: doc._id });
      }
      console.log(`${deleteCount}件の古いデータを削除`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// メイン実行
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === '--fetch-all') {
    // 履歴データを取得
    const startPage = parseInt(process.argv[3]) || 1;
    const maxPages = parseInt(process.argv[4]) || 10;
    fetchAllHistory(startPage, maxPages);
  } else {
    // 通常の更新
    updateFromNumbersRenban();
  }
}

module.exports = {
  scrapeNumbersRenban,
  updateFromNumbersRenban,
  fetchAllHistory
};