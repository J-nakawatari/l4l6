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
    amount: Number,
    winners: Number
  },
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

async function scrapePage(pageNum) {
  const url = `https://www.mizuhobank.co.jp/takarakuji/check/numbers/backnumber/num${pageNum.toString().padStart(4, '0')}.html`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // 最初のテーブルを探す（Numbers3とNumbers4の両方が含まれる）
    const firstTable = $('table').first();
    if (firstTable.length > 0) {
      // 行番号から回数を推定（行1が第1回）
      let drawCounter = 0;
      
      firstTable.find('tr').each((j, row) => {
        const cells = $(row).find('td');
        
        // 3列ある行がデータ行（行0はヘッダー）
        if (cells.length === 3 && j > 0) {
          drawCounter++;
          const dateText = $(cells[0]).text().trim();
          const numbers3Text = $(cells[1]).text().trim(); 
          const numbers4Text = $(cells[2]).text().trim();
          
          // 日付を抽出（例: 1994年10月07日）
          const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
          // 当選番号を抽出（4桁の数字）
          const numMatch = numbers4Text.match(/(\d{4})/);
          
          if (dateMatch && numMatch) {
            results.push({
              drawNumber: (pageNum - 1) * 20 + drawCounter, // 各ページ20件ずつ
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
    }
    
    return results;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // ページが存在しない
    }
    throw error;
  }
}

async function scrapeAllData() {
  console.log('みずほ銀行から実際のNumbers4履歴データを取得開始...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 既存データをクリア
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました');
    
    let totalSaved = 0;
    let pageNum = 1;
    let emptyPages = 0;
    
    // 最大350ページまで取得（約7000回分）
    while (pageNum <= 350 && emptyPages < 3) {
      console.log(`\nページ${pageNum}を取得中...`);
      
      const results = await scrapePage(pageNum);
      
      if (results === null) {
        console.log(`  → ページが存在しません`);
        emptyPages++;
      } else if (results.length === 0) {
        console.log(`  → データなし`);
        emptyPages++;
      } else {
        emptyPages = 0; // リセット
        console.log(`  → ${results.length}件のデータを発見`);
        
        // データベースに保存
        for (const result of results) {
          try {
            await DrawResult.create({
              ...result,
              prize: { amount: 900000, winners: 1 },
              fetchedAt: new Date()
            });
            totalSaved++;
          } catch (err) {
            if (err.code !== 11000) { // 重複以外のエラー
              console.error(`保存エラー: ${err.message}`);
            }
          }
        }
      }
      
      pageNum++;
      
      // サーバーに負荷をかけないよう待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n合計${totalSaved}件のデータを保存しました`);
    
    // 最新のデータを表示
    const recent = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    console.log('\n最新10件:');
    recent.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
    });
    
    // データ範囲を確認
    const oldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    if (oldest && newest) {
      console.log(`\nデータ範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
      console.log(`期間: ${oldest.drawDate.toLocaleDateString('ja-JP')} ～ ${newest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
    // Kakoアルゴリズムのテスト
    if (totalSaved >= 100) {
      console.log('\n過去100回分析を実行...');
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      const freq = [{}, {}, {}, {}];
      
      past100.forEach(d => {
        const n = d.winningNumber;
        for (let i = 0; i < 4; i++) {
          const digit = n[3-i]; // 右から数える
          freq[i][digit] = (freq[i][digit] || 0) + 1;
        }
      });
      
      console.log('\n各位の最頻出数字:');
      const most = [];
      ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
        const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
        console.log(`${pos}: ${sorted[0][0]}（${sorted[0][1]}回）`);
        most.push(sorted[0][0]);
      });
      
      const prediction = most[0] + most[1] + most[2] + most[3];
      console.log(`\nKako予想: ${prediction}`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n処理完了');
  }
}

// 実行
scrapeAllData();