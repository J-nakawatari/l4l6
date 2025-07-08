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

async function scrapeNumbers4() {
  try {
    console.log('Numbers4の実際のデータを取得中...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 既存のテストデータを削除
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました');
    
    // 複数月のURLを試す
    const baseUrl = 'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/';
    const months = [
      'num4-202412.html',
      'num4-202411.html', 
      'num4-202410.html',
      'num4-202409.html',
      'num4-202408.html',
      'num4-202407.html'
    ];
    
    let totalSaved = 0;
    
    for (const month of months) {
      try {
        const url = baseUrl + month;
        console.log(`取得中: ${month}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        let monthCount = 0;
        
        // テーブルを探す
        $('table').each((tableIndex, table) => {
          $(table).find('tr').each((rowIndex, row) => {
            const cells = $(row).find('td');
            
            if (cells.length >= 3) {
              const cell1 = $(cells[0]).text().trim();
              const cell2 = $(cells[1]).text().trim();
              const cell3 = $(cells[2]).text().trim();
              
              // 回号を探す
              const drawMatch = cell1.match(/第(\d+)回/);
              if (!drawMatch) return;
              
              const drawNumber = parseInt(drawMatch[1]);
              
              // 日付を探す
              const dateMatch = cell2.match(/(\d+)月(\d+)日/);
              if (!dateMatch) return;
              
              // 年は月から推測
              const year = month.includes('2024') ? 2024 : 2023;
              const drawDate = new Date(year, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
              
              // 当選番号（数字のみ抽出）
              const winningNumber = cell3.replace(/[^0-9]/g, '').slice(0, 4);
              
              if (winningNumber.length === 4 && !isNaN(parseInt(winningNumber))) {
                DrawResult.create({
                  drawNumber,
                  drawDate,
                  winningNumber,
                  prize: { amount: 900000, winners: 1 },
                  fetchedAt: new Date()
                }).then(() => {
                  monthCount++;
                }).catch(() => {
                  // 重複は無視
                });
              }
            }
          });
        });
        
        totalSaved += monthCount;
        console.log(`  → ${monthCount}件取得`);
        
        // サーバーに負荷をかけないよう待機
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (err) {
        console.log(`  → 取得失敗（${err.message}）`);
      }
    }
    
    // 保存されたデータを確認
    const count = await DrawResult.countDocuments();
    console.log(`\n合計${count}件のデータを保存しました`);
    
    if (count > 0) {
      // 最新10件を表示
      const recent = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
      console.log('\n最新10件:');
      recent.forEach(d => {
        console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
      });
      
      // 頻度分析
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      if (past100.length >= 100) {
        const freq = [{}, {}, {}, {}];
        
        past100.forEach(d => {
          const n = d.winningNumber;
          for (let i = 0; i < 4; i++) {
            const digit = n[3-i] || n[i]; // 右から数える
            freq[i][digit] = (freq[i][digit] || 0) + 1;
          }
        });
        
        console.log('\n過去100回の最頻出:');
        const most = freq.map((f, idx) => {
          const sorted = Object.entries(f).sort((a, b) => b[1] - a[1]);
          const positions = ['1の位', '10の位', '100の位', '1000の位'];
          console.log(`${positions[idx]}: ${sorted[0][0]}(${sorted[0][1]}回)`);
          return sorted[0][0];
        });
        
        console.log(`\nKakoアルゴリズム基本予想: ${most.join('')}`);
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

scrapeNumbers4();