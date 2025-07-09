const mongoose = require('mongoose');
require('dotenv').config();

const DrawResult = require('./dist/models/DrawResult').DrawResult;

async function addLatestDraw() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const newDraw = new DrawResult({
      drawNumber: 6765,
      drawDate: new Date('2025-07-09'),
      winningNumber: '5358',
      prize: {
        straight: { amount: 900000, winners: 12 },
        box: { amount: 37500, winners: 289 }
      }
    });
    
    await newDraw.save();
    console.log('追加完了: 第6765回 2025年7月9日 5358');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  }
}

addLatestDraw();