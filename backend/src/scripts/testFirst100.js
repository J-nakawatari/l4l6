// scrapeAllNumbers4.jsの最初の100件だけテストするバージョン
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
require('dotenv').config();

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

async function scrapeOldFormat(startNum) {
  const url = `https://www.mizuhobank.co.jp/takarakuji/check/numbers/backnumber/num${startNum.toString().padStart(4, '0')}.html`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    const firstTable = $('table').first();
    if (firstTable.length > 0) {
      let drawCounter = 0;
      
      firstTable.find('tr').each((j, row) => {
        const cells = $(row).find('td');
        
        if (cells.length === 3 && j > 0) {
          drawCounter++;
          const dateText = $(cells[0]).text().trim();
          const numbers4Text = $(cells[2]).text().trim();
          
          const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
          const numMatch = numbers4Text.match(/(\d{4})/);
          
          if (dateMatch && numMatch) {
            results.push({
              drawNumber: startNum + drawCounter - 1,
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
      return null;
    }
    throw error;
  }
}

async function testFirst100() {
  console.log('最初の100件をテスト取得...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await DrawResult.deleteMany({});
    
    let totalSaved = 0;
    
    // 最初の100件（第1回～第100回）を取得
    for (let startNum = 1; startNum <= 81; startNum += 20) {
      console.log(`第${startNum}回から取得中...`);
      const results = await scrapeOldFormat(startNum);
      
      if (results && results.length > 0) {
        console.log(`  → ${results.length}件取得`);
        
        for (const result of results) {
          try {
            await DrawResult.create({
              ...result,
              prize: { amount: 900000, winners: 1 },
              fetchedAt: new Date()
            });
            totalSaved++;
          } catch (err) {
            // 重複は無視
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n合計${totalSaved}件保存`);
    
    // 結果を表示
    const latest = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    console.log('\n最新10件:');
    latest.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testFirst100();