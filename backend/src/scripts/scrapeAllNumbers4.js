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

// 旧形式のURL（num0001.html～num2681.html）
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
    
    // 最初のテーブルにNumbers3とNumbers4の両方が含まれる
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

// 新形式のURL（detail.html?fromto=2701_2720）
async function scrapeNewFormat(fromNum, toNum) {
  const url = `https://www.mizuhobank.co.jp/takarakuji/check/numbers/backnumber/detail.html?fromto=${fromNum}_${toNum}&type=numbers`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // テーブル構造を解析
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        
        if (cells.length >= 3) {
          let drawNumber, dateText, winningNumber;
          
          // セルの内容を確認
          const cell0 = $(cells[0]).text().trim();
          const cell1 = $(cells[1]).text().trim();
          const cell2 = $(cells[2]).text().trim();
          const cell3 = cells.length > 3 ? $(cells[3]).text().trim() : '';
          
          // 回号パターンを探す
          const drawMatch = (cell0.match(/第?(\d{4,})回?/) || cell0.match(/(\d{4,})/));
          
          if (drawMatch) {
            drawNumber = parseInt(drawMatch[1]);
            
            // Numbers4の場合、4列目に当選番号がある可能性
            if (cell3 && cell3.match(/\d{4}/)) {
              dateText = cell1;
              winningNumber = cell3;
            } else if (cell2.match(/\d{4}/)) {
              dateText = cell1;
              winningNumber = cell2;
            }
            
            const dateMatch = dateText && dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            const numMatch = winningNumber && winningNumber.match(/(\d{4})/);
            
            if (drawNumber && dateMatch && numMatch) {
              results.push({
                drawNumber,
                drawDate: new Date(
                  parseInt(dateMatch[1]),
                  parseInt(dateMatch[2]) - 1,
                  parseInt(dateMatch[3])
                ),
                winningNumber: numMatch[1]
              });
            }
          }
        }
      });
    });
    
    return results;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}

async function scrapeAllData() {
  console.log('みずほ銀行から全Numbers4データを取得開始...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 既存データをクリア
    await DrawResult.deleteMany({});
    console.log('既存データをクリアしました\n');
    
    let totalSaved = 0;
    
    // 旧形式のページを取得（num0001.html = 第1回～第20回、num0021.html = 第21回～第40回...）
    console.log('旧形式ページ（num0001.html～）を取得中...');
    let emptyPages = 0;
    
    // 第1回から始まる（1, 21, 41, 61...）
    for (let startNum = 1; startNum <= 2681; startNum += 20) {
      const results = await scrapeOldFormat(startNum);
      
      if (results === null) {
        emptyPages++;
        if (emptyPages >= 3) break;
      } else if (results.length === 0) {
        emptyPages++;
      } else {
        emptyPages = 0;
        if (results.length > 0) {
          console.log(`  第${startNum}回～第${startNum + results.length - 1}回: ${results.length}件`);
        }
        
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
      
      // 待機
      if (startNum % 200 === 1) { // 10ページごとに待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n旧形式: ${totalSaved}件保存\n`);
    
    // 新形式のページを取得（第2701回以降、20件ずつ）
    console.log('新形式ページ（detail.html）を取得中...');
    let newFormatSaved = 0;
    
    // 第2701回から第7000回まで試す（20件ずつ）
    for (let startNum = 2701; startNum <= 7000; startNum += 20) {
      const endNum = startNum + 19;
      
      try {
        const results = await scrapeNewFormat(startNum, endNum);
        
        if (results && results.length > 0) {
          console.log(`  第${startNum}回～第${endNum}回: ${results.length}件`);
          
          for (const result of results) {
            try {
              await DrawResult.create({
                ...result,
                prize: { amount: 900000, winners: 1 },
                fetchedAt: new Date()
              });
              newFormatSaved++;
            } catch (err) {
              // 重複は無視
            }
          }
        }
        
        // 待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        // エラーは無視して続行
      }
    }
    
    console.log(`\n新形式: ${newFormatSaved}件保存`);
    totalSaved += newFormatSaved;
    
    // 結果を表示
    console.log(`\n合計${totalSaved}件のデータを保存しました`);
    
    const total = await DrawResult.countDocuments();
    const oldest = await DrawResult.findOne().sort({ drawNumber: 1 });
    const newest = await DrawResult.findOne().sort({ drawNumber: -1 });
    const latest = await DrawResult.find().sort({ drawNumber: -1 }).limit(10);
    
    console.log(`\n総データ数: ${total}件`);
    if (oldest && newest) {
      console.log(`データ範囲: 第${oldest.drawNumber}回～第${newest.drawNumber}回`);
      console.log(`期間: ${oldest.drawDate.toLocaleDateString('ja-JP')} ～ ${newest.drawDate.toLocaleDateString('ja-JP')}`);
    }
    
    console.log('\n最新10件:');
    latest.forEach(d => {
      console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
    });
    
    // Kakoアルゴリズムテスト
    if (total >= 100) {
      console.log('\n過去100回分析...');
      const past100 = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      const freq = [{}, {}, {}, {}];
      
      past100.forEach(d => {
        const n = d.winningNumber;
        for (let i = 0; i < 4; i++) {
          const digit = n[3-i];
          freq[i][digit] = (freq[i][digit] || 0) + 1;
        }
      });
      
      console.log('\n各位の最頻出数字:');
      const most = [];
      ['1の位', '10の位', '100の位', '1000の位'].forEach((pos, idx) => {
        const sorted = Object.entries(freq[idx]).sort((a, b) => b[1] - a[1]);
        console.log(`${pos}: ${sorted[0][0]}（${sorted[0][1]}回）`);
        most.push(sorted[0][0]);
      });
      
      const prediction = most[0] + most[1] + most[2] + most[3];
      console.log(`\nKako予想: ${prediction}`);
      
      // 過去10回で検証
      console.log('\n過去10回での当選チェック:');
      let straightHits = 0;
      let boxHits = 0;
      
      latest.forEach(d => {
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
        console.log('当選なし');
      }
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n処理完了');
  }
}

// 実行
scrapeAllData();