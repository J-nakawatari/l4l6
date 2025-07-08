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

async function scrapeMizuhoNumbers4() {
  try {
    console.log('みずほ銀行から実際のNumbers4データを取得中...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました');
    
    let totalSaved = 0;
    const baseUrl = 'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/';
    
    // 2024年と2025年の月別ページを試す
    const months = [];
    
    // 2025年
    for (let month = 1; month <= 7; month++) {
      months.push(`num4-2025${month.toString().padStart(2, '0')}.html`);
    }
    
    // 2024年
    for (let month = 1; month <= 12; month++) {
      months.push(`num4-2024${month.toString().padStart(2, '0')}.html`);
    }
    
    for (const monthFile of months) {
      try {
        const url = baseUrl + monthFile;
        console.log(`取得試行: ${monthFile}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
            'Referer': 'https://www.mizuhobank.co.jp/takarakuji/check/numbers/backnumber/index.html'
          },
          timeout: 20000
        });
        
        const $ = cheerio.load(response.data);
        let monthCount = 0;
        
        // みずほ銀行のテーブル構造
        // class="typeTK" のテーブルを探す
        $('table.typeTK tbody tr, table tbody tr').each((index, element) => {
          const cells = $(element).find('td');
          
          if (cells.length >= 3) {
            // 第1セル: 回号
            const drawText = $(cells[0]).text().trim();
            const drawMatch = drawText.match(/第(\d+)回/);
            
            // 第2セル: 抽選日
            const dateText = $(cells[1]).text().trim();
            
            // 第3セル: 当選番号
            const numberText = $(cells[2]).text().trim();
            const cleanNumber = numberText.replace(/[^0-9]/g, '');
            
            if (drawMatch && cleanNumber.length === 4) {
              const drawNumber = parseInt(drawMatch[1]);
              
              // 日付のパース
              let drawDate;
              const dateMatch1 = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
              const dateMatch2 = dateText.match(/(\d{1,2})月(\d{1,2})日/);
              
              if (dateMatch1) {
                drawDate = new Date(
                  parseInt(dateMatch1[1]),
                  parseInt(dateMatch1[2]) - 1,
                  parseInt(dateMatch1[3])
                );
              } else if (dateMatch2) {
                // 年が含まれていない場合はファイル名から推測
                const year = monthFile.includes('2025') ? 2025 : 2024;
                drawDate = new Date(
                  year,
                  parseInt(dateMatch2[1]) - 1,
                  parseInt(dateMatch2[2])
                );
              } else {
                return; // forEachのcontinueはreturnを使う
              }
              
              DrawResult.create({
                drawNumber,
                drawDate,
                winningNumber: cleanNumber,
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
        
        if (monthCount > 0) {
          totalSaved += monthCount;
          console.log(`  → ${monthCount}件取得`);
        } else {
          console.log(`  → データなし`);
        }
        
        // サーバーに負荷をかけないよう待機
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log(`  → ページが存在しません`);
        } else {
          console.log(`  → エラー: ${err.message}`);
        }
      }
    }
    
    // 結果を表示
    const count = await DrawResult.countDocuments();
    console.log(`\n合計${count}件のデータを保存しました`);
    
    if (count > 0) {
      // 最新10件
      const recent = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
      console.log('\n最新10件の当選番号:');
      recent.forEach(d => {
        console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
      });
      
      // Kakoアルゴリズムの検証（100件以上ある場合）
      if (count >= 100) {
        const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
        const freq = [{}, {}, {}, {}];
        
        past100.forEach(d => {
          const n = d.winningNumber;
          for (let i = 0; i < 4; i++) {
            const digit = n[3-i]; // 右から数える（1の位から）
            freq[i][digit] = (freq[i][digit] || 0) + 1;
          }
        });
        
        console.log('\n過去100回の最頻出数字:');
        const most = [];
        ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
          const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
          console.log(`${pos}: ${sorted[0][0]}(${sorted[0][1]}回), ${sorted[1][0]}(${sorted[1][1]}回), ${sorted[2][0]}(${sorted[2][1]}回)`);
          most.push(sorted[0][0]);
        });
        
        const basePrediction = most[0] + most[1] + most[2] + most[3];
        console.log(`\nKakoアルゴリズム基本予想: ${basePrediction}`);
        
        // 過去10回での検証
        console.log('\n過去10回での当選チェック:');
        let straightHits = 0;
        let boxHits = 0;
        
        recent.forEach(d => {
          if (d.winningNumber === basePrediction) {
            console.log(`第${d.drawNumber}回: ストレート当選！`);
            straightHits++;
          }
          
          const sorted1 = d.winningNumber.split('').sort().join('');
          const sorted2 = basePrediction.split('').sort().join('');
          if (sorted1 === sorted2) {
            console.log(`第${d.drawNumber}回: ボックス当選！`);
            boxHits++;
          }
        });
        
        console.log(`\n結果: ストレート ${straightHits}/10, ボックス ${boxHits}/10`);
      }
    } else {
      console.log('\n実データが取得できなかったため、サンプルデータは生成しません。');
      console.log('みずほ銀行のサイト構造が変更されている可能性があります。');
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

scrapeMizuhoNumbers4();