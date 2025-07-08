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

async function scrapeFromRakuten() {
  try {
    console.log('楽天×宝くじから過去の当選番号を取得中...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 既存データをクリア
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました');
    
    // 楽天の過去当選番号ページ（複数ページ）
    const baseUrl = 'https://takarakuji.rakuten.co.jp/backnumber/numbers4_past/';
    let totalSaved = 0;
    
    // 最初の数ページを取得
    for (let page = 1; page <= 5; page++) {
      try {
        const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
        console.log(`ページ${page}を取得中...`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        let pageCount = 0;
        
        // 楽天のテーブル構造を解析
        $('.tbl-basic').find('tr').each((index, row) => {
          if (index === 0) return; // ヘッダーをスキップ
          
          const cells = $(row).find('td');
          if (cells.length >= 2) {
            // 第1カラム: 回号と日付
            const col1 = $(cells[0]).text().trim();
            const drawMatch = col1.match(/第(\d+)回/);
            const dateMatch = col1.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            
            // 第2カラム: 当選番号
            const col2 = $(cells[1]).text().trim();
            const numberMatch = col2.match(/(\d{4})/);
            
            if (drawMatch && dateMatch && numberMatch) {
              const drawNumber = parseInt(drawMatch[1]);
              const drawDate = new Date(
                parseInt(dateMatch[1]),
                parseInt(dateMatch[2]) - 1,
                parseInt(dateMatch[3])
              );
              const winningNumber = numberMatch[1];
              
              DrawResult.create({
                drawNumber,
                drawDate,
                winningNumber,
                prize: { amount: 900000, winners: 1 },
                fetchedAt: new Date()
              }).then(() => {
                pageCount++;
              }).catch(() => {
                // 重複は無視
              });
            }
          }
        });
        
        totalSaved += pageCount;
        console.log(`  → ${pageCount}件取得`);
        
        // 待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.log(`  → ページ${page}取得失敗`);
        break;
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
      
      // 頻度分析（過去100回）
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      if (past100.length >= 50) {
        const freq = [{}, {}, {}, {}];
        
        past100.forEach(d => {
          const n = d.winningNumber;
          for (let i = 0; i < 4; i++) {
            const digit = n[i];
            freq[i][digit] = (freq[i][digit] || 0) + 1;
          }
        });
        
        console.log(`\n過去${past100.length}回の最頻出数字:`);
        const most = [];
        ['1000の位', '100の位', '10の位', '1の位'].forEach((pos, idx) => {
          const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            console.log(`${pos}: ${sorted[0][0]}(${sorted[0][1]}回)`);
            most.push(sorted[0][0]);
          }
        });
        
        if (most.length === 4) {
          // Kakoアルゴリズムの基本予想（修正版）
          const basePrediction = most[3] + most[2] + most[1] + most[0];
          console.log(`\nKakoアルゴリズム基本予想: ${basePrediction}`);
          
          // 最新10件と照合
          console.log('\n過去10回での当選チェック:');
          let hits = 0;
          recent.forEach(d => {
            if (d.winningNumber === basePrediction) {
              console.log(`第${d.drawNumber}回: ストレート当選！`);
              hits++;
            }
            const sorted1 = d.winningNumber.split('').sort().join('');
            const sorted2 = basePrediction.split('').sort().join('');
            if (sorted1 === sorted2) {
              console.log(`第${d.drawNumber}回: ボックス当選！`);
              hits++;
            }
          });
          
          if (hits === 0) {
            console.log('過去10回では当選なし');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
scrapeFromRakuten();