const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// DrawResultスキーマ（150件のみ保持）
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
    },
    setStraight: {
      winners: Number,
      amount: Number
    },
    setBox: {
      winners: Number,
      amount: Number
    }
  },
  salesAmount: Number,
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

function parseLocalFile() {
  // ファイルを読み込む
  const filePath = path.join(__dirname, '../../../docs/ナンバーズ4抽せん数字一覧表.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const lines = content.split('\n');
  const results = [];
  
  let currentEntry = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 回別の行を見つける（タブ区切りの場合）
    if (line.startsWith('回別\t第') || (line === '回別' && i + 1 < lines.length && lines[i+1].match(/第\d+回/))) {
      let drawMatch;
      
      if (line.startsWith('回別\t第')) {
        // タブ区切りの場合
        drawMatch = line.match(/第(\d+)回/);
      } else {
        // 次の行に回数がある場合
        drawMatch = lines[i+1].match(/第(\d+)回/);
      }
      
      if (drawMatch) {
        // 前のエントリーを保存
        if (currentEntry && currentEntry.winningNumber) {
          results.push(currentEntry);
        }
        
        // 新しいエントリーを開始
        currentEntry = {
          drawNumber: parseInt(drawMatch[1]),
          prize: {
            straight: {},
            box: {},
            setStraight: {},
            setBox: {}
          }
        };
      }
    }
    
    // 抽選日
    if (line.startsWith('抽せん日') && lines[i+1] && currentEntry) {
      const dateText = lines[i+1].trim();
      const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (dateMatch) {
        currentEntry.drawDate = new Date(
          parseInt(dateMatch[1]),
          parseInt(dateMatch[2]) - 1,
          parseInt(dateMatch[3])
        );
      }
    }
    
    // 当選番号
    if (line.startsWith('抽せん数字') && lines[i+1] && currentEntry) {
      const numText = lines[i+1].trim();
      if (numText.match(/^\d{4}$/)) {
        currentEntry.winningNumber = numText;
      }
    }
    
    // ストレート
    if (line.startsWith('ストレート') && lines[i+1] && currentEntry) {
      const dataText = lines[i+1].trim();
      const match = dataText.match(/(\d+)口\s+([\d,]+)円/);
      if (match) {
        currentEntry.prize.straight.winners = parseInt(match[1]);
        currentEntry.prize.straight.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // ボックス
    if (line.startsWith('ボックス') && lines[i+1] && currentEntry) {
      const dataText = lines[i+1].trim();
      const match = dataText.match(/(\d+)口\s+([\d,]+)円/);
      if (match) {
        currentEntry.prize.box.winners = parseInt(match[1]);
        currentEntry.prize.box.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // セット（ストレート）
    if (line.startsWith('セット（ストレート）') && lines[i+1] && currentEntry) {
      const dataText = lines[i+1].trim();
      const match = dataText.match(/(\d+)口\s+([\d,]+)円/);
      if (match) {
        currentEntry.prize.setStraight.winners = parseInt(match[1]);
        currentEntry.prize.setStraight.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // セット（ボックス）
    if (line.startsWith('セット（ボックス）') && lines[i+1] && currentEntry) {
      const dataText = lines[i+1].trim();
      const match = dataText.match(/(\d+)口\s+([\d,]+)円/);
      if (match) {
        currentEntry.prize.setBox.winners = parseInt(match[1]);
        currentEntry.prize.setBox.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // 販売実績額
    if (line.startsWith('販売実績額') && lines[i+1] && currentEntry) {
      const amountText = lines[i+1].trim();
      const match = amountText.match(/([\d,]+)円/);
      if (match) {
        currentEntry.salesAmount = parseInt(match[1].replace(/,/g, ''));
      }
    }
  }
  
  // 最後のエントリーを保存
  if (currentEntry && currentEntry.winningNumber) {
    results.push(currentEntry);
  }
  
  return results;
}

async function importToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // ローカルファイルからデータをパース
    const parsedData = parseLocalFile();
    console.log(`パースされたデータ: ${parsedData.length}件`);
    
    // データを新しい順にソート
    parsedData.sort((a, b) => b.drawNumber - a.drawNumber);
    
    // 最新150件だけを取得
    const latestData = parsedData.slice(0, 150);
    
    // 既存データをクリア
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました');
    
    // 新しいデータを保存
    let saved = 0;
    for (const data of latestData) {
      try {
        await DrawResult.create({
          ...data,
          fetchedAt: new Date()
        });
        saved++;
      } catch (err) {
        console.error(`保存エラー（第${data.drawNumber}回）:`, err.message);
      }
    }
    
    console.log(`\n${saved}件のデータを保存しました`);
    
    // 統計情報
    const total = await DrawResult.countDocuments();
    const oldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`\n=== データベース状況 ===`);
    console.log(`総データ数: ${total}件`);
    console.log(`データ範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
    console.log(`期間: ${oldest.drawDate.toLocaleDateString('ja-JP')} ～ ${newest.drawDate.toLocaleDateString('ja-JP')}`);
    
    // Kakoアルゴリズムテスト
    console.log('\n=== Kakoアルゴリズム（最新100回）===');
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
    
    // 最新10件の表示
    console.log('\n=== 最新10件 ===');
    const latest = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    latest.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber} - ストレート${d.prize.straight.winners}口/${d.prize.straight.amount.toLocaleString()}円`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
importToDatabase();