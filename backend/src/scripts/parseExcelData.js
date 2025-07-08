const XLSX = require('xlsx');
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

function parseExcelFile() {
  const filePath = path.join(__dirname, '../../../docs/ナンバーズ4抽せん数字一覧表.xlsx');
  
  // Excelファイルを読み込む
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSONに変換
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  const results = [];
  let currentEntry = null;
  
  // データを解析
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    if (!row || row.length === 0) continue;
    
    // 回別を探す（1列にまとまっている場合）
    const cellValue = row[0] ? row[0].toString() : '';
    
    if (cellValue.includes('回別') && cellValue.includes('第')) {
      if (currentEntry && currentEntry.winningNumber) {
        results.push(currentEntry);
      }
      
      const match = cellValue.match(/第(\d+)回/);
      if (match) {
        currentEntry = {
          drawNumber: parseInt(match[1]),
          prize: {
            straight: {},
            box: {}
          }
        };
      }
    }
    
    // 抽選日
    if (cellValue.includes('抽せん日') && currentEntry) {
      const match = cellValue.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (match) {
        currentEntry.drawDate = new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3])
        );
      }
    }
    
    // 抽選数字
    if (cellValue.includes('抽せん数字') && currentEntry) {
      const match = cellValue.match(/(\d{4})/);
      if (match) {
        currentEntry.winningNumber = match[1];
      }
    }
    
    // ストレート
    if (cellValue.startsWith('ストレート') && !cellValue.includes('（') && currentEntry) {
      const match = cellValue.match(/(\d+)口\s*([\d,]+)円/);
      if (match) {
        currentEntry.prize.straight.winners = parseInt(match[1]);
        currentEntry.prize.straight.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // ボックス
    if (cellValue.startsWith('ボックス') && !cellValue.includes('（') && currentEntry) {
      const match = cellValue.match(/(\d+)口\s*([\d,]+)円/);
      if (match) {
        currentEntry.prize.box.winners = parseInt(match[1]);
        currentEntry.prize.box.amount = parseInt(match[2].replace(/,/g, ''));
      }
    }
    
    // 販売実績額
    if (cellValue.includes('販売実績額') && currentEntry) {
      const match = cellValue.match(/([\d,]+)円/);
      if (match) {
        currentEntry.salesAmount = parseInt(match[1].replace(/,/g, ''));
      }
    }
  }
  
  // 最後のエントリーを追加
  if (currentEntry && currentEntry.winningNumber) {
    results.push(currentEntry);
  }
  
  return results;
}

async function importToDatabase() {
  try {
    // xlsxパッケージがインストールされているか確認
    try {
      require.resolve('xlsx');
    } catch (e) {
      console.log('xlsxパッケージをインストールしています...');
      const { execSync } = require('child_process');
      execSync('npm install xlsx', { stdio: 'inherit' });
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Excelファイルからデータをパース
    const parsedData = parseExcelFile();
    console.log(`パースされたデータ: ${parsedData.length}件`);
    
    if (parsedData.length === 0) {
      console.log('データが見つかりません。');
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