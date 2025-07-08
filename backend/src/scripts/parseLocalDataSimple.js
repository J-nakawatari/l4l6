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
    }
  },
  salesAmount: Number,
  fetchedAt: Date
});

const DrawResult = mongoose.model('DrawResult', DrawResultSchema);

function parseLocalFile() {
  const filePath = path.join(__dirname, '../../../docs/ナンバーズ4抽せん数字一覧表.txt');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const results = [];
  
  // 各エントリーのパターンを正規表現で抽出
  // 回別 第XXXX回 → 抽せん日 → 抽せん数字 → ストレート → ボックス → 販売実績額
  const pattern = /回別\t第(\d+)回\n抽せん日\t(\d{4})年(\d{1,2})月(\d{1,2})日\n抽せん数字\t(\d{4})\nストレート\t(\d+)口\t([\d,]+)円\nボックス\t(\d+)口\t([\d,]+)円/g;
  
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const entry = {
      drawNumber: parseInt(match[1]),
      drawDate: new Date(
        parseInt(match[2]),
        parseInt(match[3]) - 1,
        parseInt(match[4])
      ),
      winningNumber: match[5],
      prize: {
        straight: {
          winners: parseInt(match[6]),
          amount: parseInt(match[7].replace(/,/g, ''))
        },
        box: {
          winners: parseInt(match[8]),
          amount: parseInt(match[9].replace(/,/g, ''))
        }
      }
    };
    
    // 販売実績額も取得（オプション）
    const salesPattern = new RegExp(`第${match[1]}回[\\s\\S]*?販売実績額\\t([\\d,]+)円`);
    const salesMatch = content.match(salesPattern);
    if (salesMatch) {
      entry.salesAmount = parseInt(salesMatch[1].replace(/,/g, ''));
    }
    
    results.push(entry);
  }
  
  return results;
}

async function importToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // ローカルファイルからデータをパース
    const parsedData = parseLocalFile();
    console.log(`パースされたデータ: ${parsedData.length}件`);
    
    if (parsedData.length === 0) {
      console.log('データが見つかりません。ファイル形式を確認してください。');
      return;
    }
    
    // データを新しい順にソート
    parsedData.sort((a, b) => b.drawNumber - a.drawNumber);
    
    // 最新150件だけを取得
    const latestData = parsedData.slice(0, 150);
    console.log(`最新150件を保持します（第${latestData[latestData.length-1].drawNumber}回～第${latestData[0].drawNumber}回）`);
    
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
    if (oldest && newest) {
      console.log(`データ範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
      console.log(`期間: ${oldest.drawDate.toLocaleDateString('ja-JP')} ～ ${newest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
    // Kakoアルゴリズムテスト
    if (total >= 100) {
      console.log('\n=== Kakoアルゴリズム（最新100回）===');
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      const freq = [{}, {}, {}, {}];
      
      past100.forEach(d => {
        const n = d.winningNumber;
        for (let i = 0; i < 4; i++) {
          const digit = n[3-i]; // 右から数える
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
      
      // 最新10件での検証
      console.log('\n=== 最新10件での検証 ===');
      const latest10 = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
      let straightHits = 0;
      let boxHits = 0;
      
      latest10.forEach(d => {
        if (d.winningNumber === prediction) {
          console.log(`第${d.drawNumber}回: ストレート当選！`);
          straightHits++;
        }
        const sorted1 = d.winningNumber.split('').sort().join('');
        const sorted2 = prediction.split('').sort().join('');
        if (sorted1 === sorted2) {
          console.log(`第${d.drawNumber}回: ボックス当選！`);
          boxHits++;
        }
      });
      
      if (straightHits === 0 && boxHits === 0) {
        console.log('過去10回では当選なし');
      } else {
        console.log(`\n結果: ストレート ${straightHits}/10, ボックス ${boxHits}/10`);
      }
    }
    
    // 最新5件の詳細表示
    console.log('\n=== 最新5件の詳細 ===');
    const latest5 = await DrawResult.find().sort({ drawNumber: -1 }).limit(5);
    latest5.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
      console.log(`  ストレート: ${d.prize.straight.winners}口 ${d.prize.straight.amount.toLocaleString()}円`);
      console.log(`  ボックス: ${d.prize.box.winners}口 ${d.prize.box.amount.toLocaleString()}円`);
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
importToDatabase();