const puppeteer = require('puppeteer');
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
 * みずほ銀行のサイトから最新のNumbers4データをスクレイピング
 */
async function scrapeMizuhoNumbers4() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // タイムアウトを延長
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    // ユーザーエージェントを設定
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('みずほ銀行のサイトにアクセス中...');
    await page.goto('https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html', {
      waitUntil: 'networkidle2'
    });
    
    // データが読み込まれるまで待機
    console.log('データの読み込みを待機中...');
    
    // 複数の戦略で待機
    try {
      // テーブルまたは特定のセレクタを待つ
      await Promise.race([
        page.waitForSelector('table.section__table', { timeout: 30000 }),
        page.waitForSelector('.section__table', { timeout: 30000 }),
        page.waitForSelector('table', { timeout: 30000 }),
        page.waitForFunction(() => {
          const text = document.body.innerText;
          return text.includes('第') && text.includes('回') && text.includes('抽せん');
        }, { timeout: 30000 })
      ]);
    } catch (e) {
      console.log('標準的なセレクタが見つかりません。ページ全体を解析します。');
    }
    
    // 少し待機してJavaScriptの実行を完了させる
    await page.waitForTimeout(3000);
    
    // ページの内容を取得
    const pageContent = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    console.log('ページを解析中...');
    
    // データを抽出
    const results = await page.evaluate(() => {
      const data = [];
      
      // テーブルから抽出を試みる
      const tables = document.querySelectorAll('table');
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 3) {
            const rowData = Array.from(cells).map(cell => cell.textContent.trim());
            
            // 回別を含む行を探す
            const drawNumberIndex = rowData.findIndex(text => text.match(/第\d+回/));
            if (drawNumberIndex !== -1) {
              const drawMatch = rowData[drawNumberIndex].match(/第(\d+)回/);
              if (drawMatch) {
                // 日付と当選番号を探す
                let dateText = '';
                let winningNumber = '';
                
                // 同じ行または近くの行から情報を取得
                for (let i = 0; i < rowData.length; i++) {
                  if (rowData[i].match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
                    dateText = rowData[i];
                  }
                  if (rowData[i].match(/^\d{4}$/) && !dateText.includes(rowData[i])) {
                    winningNumber = rowData[i];
                  }
                }
                
                if (winningNumber) {
                  data.push({
                    drawNumber: parseInt(drawMatch[1]),
                    dateText,
                    winningNumber
                  });
                }
              }
            }
          }
        }
      }
      
      // テーブルから取得できない場合はテキスト解析
      if (data.length === 0) {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const drawMatch = line.match(/第(\d+)回/);
          
          if (drawMatch) {
            // 近くの行から日付と当選番号を探す
            let dateText = '';
            let winningNumber = '';
            
            for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 5); j++) {
              if (lines[j].match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
                dateText = lines[j];
              }
              if (lines[j].match(/^\d{4}$/) && j !== i) {
                winningNumber = lines[j];
              }
            }
            
            if (winningNumber) {
              data.push({
                drawNumber: parseInt(drawMatch[1]),
                dateText,
                winningNumber
              });
            }
          }
        }
      }
      
      return data;
    });
    
    console.log(`${results.length}件のデータを取得しました`);
    
    // 結果を表示
    if (results.length > 0) {
      console.log('\n取得したデータ（最新5件）:');
      results.slice(0, 5).forEach(r => {
        console.log(`第${r.drawNumber}回: ${r.winningNumber} (${r.dateText})`);
      });
    }
    
    // スクリーンショットを保存（デバッグ用）
    await page.screenshot({ 
      path: 'mizuho-numbers4.png',
      fullPage: true 
    });
    console.log('\nスクリーンショットを保存しました: mizuho-numbers4.png');
    
    return results;
    
  } catch (error) {
    console.error('スクレイピングエラー:', error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * データベースを更新（150件を維持）
 */
async function updateDatabase(scrapedData) {
  let addedCount = 0;
  
  for (const data of scrapedData) {
    try {
      // 日付をパース
      let drawDate = null;
      if (data.dateText) {
        const dateMatch = data.dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
          drawDate = new Date(
            parseInt(dateMatch[1]),
            parseInt(dateMatch[2]) - 1,
            parseInt(dateMatch[3])
          );
        }
      }
      
      // 既存チェック
      const existing = await DrawResult.findOne({ drawNumber: data.drawNumber });
      if (!existing && drawDate) {
        await DrawResult.create({
          drawNumber: data.drawNumber,
          drawDate,
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
    
    console.log('=== Numbers4データ自動更新 ===');
    console.log(`実行時刻: ${new Date().toLocaleString('ja-JP')}\n`);
    
    // 現在の状態を確認
    const currentCount = await DrawResult.countDocuments();
    const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`現在のデータ: ${currentCount}件`);
    if (latest) {
      console.log(`最新: 第${latest.drawNumber}回 (${latest.drawDate.toLocaleDateString('ja-JP')})\n`);
    }
    
    // スクレイピング実行
    const scrapedData = await scrapeMizuhoNumbers4();
    
    if (scrapedData.length > 0) {
      // 新しいデータのみフィルタリング
      const newData = [];
      for (const data of scrapedData) {
        const exists = await DrawResult.findOne({ drawNumber: data.drawNumber });
        if (!exists) {
          newData.push(data);
        }
      }
      
      console.log(`\n新規データ: ${newData.length}件`);
      
      if (newData.length > 0) {
        const added = await updateDatabase(newData);
        console.log(`\n${added}件のデータを追加しました`);
      } else {
        console.log('新しいデータはありません');
      }
    } else {
      console.log('\nデータを取得できませんでした');
      console.log('サイトの構造が変更された可能性があります');
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

// 実行
if (require.main === module) {
  main();
}

module.exports = {
  scrapeMizuhoNumbers4,
  updateDatabase
};