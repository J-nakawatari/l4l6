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

async function scrapeLatestData() {
  console.log('最新のNumbers4データを取得開始...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 既存の古いデータは残す（20件しかないので）
    const existingCount = await DrawResult.countDocuments();
    console.log(`既存データ: ${existingCount}件\n`);
    
    // 年月別のURLパターンを試す
    const urls = [];
    
    // 2025年
    for (let month = 1; month <= 7; month++) {
      urls.push({
        year: 2025,
        month,
        url: `https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-2025${month.toString().padStart(2, '0')}.html`
      });
    }
    
    // 2024年
    for (let month = 1; month <= 12; month++) {
      urls.push({
        year: 2024,
        month,
        url: `https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-2024${month.toString().padStart(2, '0')}.html`
      });
    }
    
    let totalSaved = 0;
    
    for (const {year, month, url} of urls) {
      try {
        console.log(`${year}年${month}月のデータを取得中...`);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        let monthSaved = 0;
        
        // テーブル形式を解析
        $('table').each((i, table) => {
          $(table).find('tr').each((j, row) => {
            const cells = $(row).find('td');
            
            if (cells.length >= 3) {
              let drawNumber, dateText, winningNumber;
              
              // パターン1: 回号 | 日付 | 当選番号
              const cell0 = $(cells[0]).text().trim();
              const cell1 = $(cells[1]).text().trim();
              const cell2 = $(cells[2]).text().trim();
              
              // 回号を探す
              const drawMatch = cell0.match(/第?(\d{4,})回?/) || cell0.match(/(\d{4,})/);
              if (drawMatch) {
                drawNumber = parseInt(drawMatch[1]);
                dateText = cell1;
                winningNumber = cell2;
              }
              
              // 日付と当選番号を検証
              const dateMatch = dateText && dateText.match(/(\d{1,2})月(\d{1,2})日/);
              const numMatch = winningNumber && winningNumber.match(/(\d{4})/);
              
              if (drawNumber && dateMatch && numMatch) {
                DrawResult.create({
                  drawNumber,
                  drawDate: new Date(year, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2])),
                  winningNumber: numMatch[1],
                  prize: { amount: 900000, winners: 1 },
                  fetchedAt: new Date()
                }).then(() => {
                  monthSaved++;
                  totalSaved++;
                }).catch(err => {
                  // 重複は無視
                });
              }
            }
          });
        });
        
        if (monthSaved > 0) {
          console.log(`  → ${monthSaved}件保存`);
        } else {
          console.log(`  → データなし`);
        }
        
        // 待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log(`  → ページが存在しません`);
        } else {
          console.log(`  → エラー: ${err.message}`);
        }
      }
    }
    
    console.log(`\n新規保存: ${totalSaved}件`);
    
    // 最新データを表示
    const total = await DrawResult.countDocuments();
    const latest = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    
    console.log(`総データ数: ${total}件\n`);
    console.log('最新10件:');
    latest.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
    });
    
    // Kakoアルゴリズムテスト
    if (total >= 100) {
      console.log('\n過去100回分析...');
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      const freq = [{}, {}, {}, {}];
      
      past100.forEach(d => {
        const n = d.winningNumber;
        for (let i = 0; i < 4; i++) {
          const digit = n[3-i];
          freq[i][digit] = (freq[i][digit] || 0) + 1;
        }
      });
      
      const most = [];
      ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
        const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
        console.log(`${pos}: ${sorted[0][0]}（${sorted[0][1]}回）`);
        most.push(sorted[0][0]);
      });
      
      const prediction = most[0] + most[1] + most[2] + most[3];
      console.log(`\nKako予想: ${prediction}`);
      
      // 過去10回で検証
      console.log('\n過去10回での当選チェック:');
      let hits = 0;
      latest.forEach(d => {
        if (d.winningNumber === prediction) {
          console.log(`第${d.drawNumber}回: ストレート当選！`);
          hits++;
        } else if (d.winningNumber.split('').sort().join('') === prediction.split('').sort().join('')) {
          console.log(`第${d.drawNumber}回: ボックス当選！`);
          hits++;
        }
      });
      if (hits === 0) {
        console.log('当選なし');
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n処理完了');
  }
}

scrapeLatestData();