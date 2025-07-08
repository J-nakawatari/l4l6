const axios = require('axios');
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

async function scrapeRealData() {
  console.log('実際のNumbers4データを取得します\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 楽天から取得
    const url = 'https://takarakuji.rakuten.co.jp/backnumber/numbers4/';
    console.log('楽天×宝くじから取得中...');
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = response.data;
    
    // シンプルな正規表現で抽出
    // 例: 第6764回 2025/07/08 当せん番号 2982
    const pattern = /第(\d+)回[\s\S]{0,50}?(\d{4})\/(\d{2})\/(\d{2})[\s\S]{0,50}?当せん番号[\s:：]*(\d{4})/g;
    
    let match;
    let count = 0;
    
    while ((match = pattern.exec(html)) !== null) {
      const drawNumber = parseInt(match[1]);
      const year = parseInt(match[2]);
      const month = parseInt(match[3]);
      const day = parseInt(match[4]);
      const winningNumber = match[5];
      
      try {
        await DrawResult.create({
          drawNumber,
          drawDate: new Date(year, month - 1, day),
          winningNumber,
          prize: { amount: 900000, winners: 1 },
          fetchedAt: new Date()
        });
        
        console.log(`保存: 第${drawNumber}回 (${year}/${month}/${day}) → ${winningNumber}`);
        count++;
        
      } catch (err) {
        if (err.code === 11000) {
          console.log(`スキップ: 第${drawNumber}回 (既存)`);
        }
      }
    }
    
    console.log(`\n${count}件の新規データを保存しました`);
    
    // 現在の状況を表示
    const total = await DrawResult.countDocuments();
    const latest = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    
    console.log(`\n総データ数: ${total}件`);
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

scrapeRealData();