#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numbers4');

// DrawResultスキーマ
const DrawResultSchema = new mongoose.Schema({
  drawNumber: Number,
  drawDate: Date,
  winningNumber: String,
  prize: Object,
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

async function checkLatestResults() {
  try {
    // 最新の5件を取得
    const latest = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(5)
      .lean();

    console.log('=== 最新の抽選結果 ===');
    latest.forEach(result => {
      console.log(`第${result.drawNumber}回: ${result.drawDate.toLocaleDateString('ja-JP')} - ${result.winningNumber}`);
    });

    // 今日の日付
    const today = new Date();
    console.log(`\n現在の日付: ${today.toLocaleDateString('ja-JP')}`);
    
    // 最新の抽選からの経過日数
    if (latest[0]) {
      const daysSinceLatest = Math.floor((today - latest[0].drawDate) / (1000 * 60 * 60 * 24));
      console.log(`最新の抽選からの経過日数: ${daysSinceLatest}日`);
      
      if (daysSinceLatest > 3) {
        console.log('\n⚠️  警告: 最新データが古い可能性があります！');
      }
    }

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkLatestResults();