#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numbers4');

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

// 手動で最新の結果を追加
const latestResults = [
  {
    drawNumber: 6765,
    drawDate: new Date('2025-07-09'),
    winningNumber: '1234', // 実際の当選番号に置き換える必要があります
    prize: {
      straight: { winners: 1, amount: 900000 },
      box: { winners: 24, amount: 37500 }
    }
  },
  {
    drawNumber: 6766,
    drawDate: new Date('2025-07-10'),
    winningNumber: '5678', // 実際の当選番号に置き換える必要があります
    prize: {
      straight: { winners: 1, amount: 900000 },
      box: { winners: 24, amount: 37500 }
    }
  },
  {
    drawNumber: 6767,
    drawDate: new Date('2025-07-11'),
    winningNumber: '9012', // 実際の当選番号に置き換える必要があります
    prize: {
      straight: { winners: 1, amount: 900000 },
      box: { winners: 24, amount: 37500 }
    }
  }
];

async function addResults() {
  try {
    for (const result of latestResults) {
      const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
      if (!existing) {
        await DrawResult.create({
          ...result,
          fetchedAt: new Date()
        });
        console.log(`追加: 第${result.drawNumber}回 - ${result.winningNumber}`);
      } else {
        console.log(`既存: 第${result.drawNumber}回`);
      }
    }
    
    // 最新の5件を表示
    const latest = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(5);
    
    console.log('\n=== 更新後の最新結果 ===');
    latest.forEach(r => {
      console.log(`第${r.drawNumber}回: ${r.drawDate.toLocaleDateString('ja-JP')} - ${r.winningNumber}`);
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addResults();