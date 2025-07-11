const axios = require('axios');
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

async function fetchFromMizuhoAPI() {
  console.log('みずほ銀行のAPIから最新データを取得中...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numbers4');
    
    // 可能性のあるAPIエンドポイントを試す
    const apiUrls = [
      'https://www.mizuhobank.co.jp/retail/api/webapi/toto_api/getLot.do?method=get&constLotName=toto&holdingName=numbers4',
      'https://www.mizuhobank.co.jp/api/takarakuji/numbers4/latest.json',
      'https://www.mizuhobank.co.jp/takarakuji/api/numbers4/result.json'
    ];
    
    for (const url of apiUrls) {
      console.log(`試行中: ${url}`);
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html'
          },
          timeout: 10000
        });
        
        console.log('✓ 成功!');
        console.log('データ:', JSON.stringify(response.data, null, 2).substring(0, 500));
        
      } catch (err) {
        console.log(`✗ エラー: ${err.response?.status || err.message}`);
      }
    }
    
    // 楽天×宝くじも試す
    console.log('\n楽天×宝くじサイトも確認...');
    try {
      const response = await axios.get('https://takarakuji.rakuten.co.jp/backnumber/numbers4/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      
      // 最新の結果を探す
      const results = [];
      $('.tbl-basic tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const drawText = $(cells[0]).text().trim();
          const dateText = $(cells[1]).text().trim();
          const numberText = $(cells[2]).text().trim();
          
          const drawMatch = drawText.match(/第(\d+)回/);
          const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
          const numberMatch = numberText.match(/(\d{4})/);
          
          if (drawMatch && dateMatch && numberMatch) {
            results.push({
              drawNumber: parseInt(drawMatch[1]),
              drawDate: new Date(
                parseInt(dateMatch[1]),
                parseInt(dateMatch[2]) - 1,
                parseInt(dateMatch[3])
              ),
              winningNumber: numberMatch[1]
            });
          }
        }
      });
      
      console.log(`${results.length}件のデータを発見`);
      
      // 保存
      let saved = 0;
      for (const result of results.slice(0, 10)) {
        const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
        if (!existing) {
          await DrawResult.create({
            ...result,
            prize: {
              straight: { winners: 0, amount: 900000 },
              box: { winners: 0, amount: 37500 }
            },
            fetchedAt: new Date()
          });
          console.log(`新規追加: 第${result.drawNumber}回 (${result.drawDate.toLocaleDateString('ja-JP')}): ${result.winningNumber}`);
          saved++;
        }
      }
      
      console.log(`\n新規保存: ${saved}件`);
      
    } catch (err) {
      console.log(`楽天エラー: ${err.message}`);
    }
    
    // 最新の結果を表示
    const latest = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(5);
    
    console.log('\n=== 最新の抽選結果 ===');
    latest.forEach(r => {
      console.log(`第${r.drawNumber}回: ${r.drawDate.toLocaleDateString('ja-JP')} - ${r.winningNumber}`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fetchFromMizuhoAPI();