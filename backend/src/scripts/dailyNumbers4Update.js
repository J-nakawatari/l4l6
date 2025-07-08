#!/usr/bin/env node

/**
 * Numbers4の当選番号を定期的に更新するスクリプト
 * cronで毎日実行することを想定
 * 
 * crontab設定例:
 * 0 21 * * 1-5 cd /path/to/project && node src/scripts/dailyNumbers4Update.js
 */

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

// 複数のソースから取得を試みる
const dataSources = [
  {
    name: '楽天×宝くじ',
    url: 'https://takarakuji.rakuten.co.jp/backnumber/numbers4/',
    parser: parseRakuten
  },
  {
    name: 'みずほ銀行',
    url: 'https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html',
    parser: parseMizuho
  }
];

async function parseRakuten($) {
  const results = [];
  const content = $('body').text();
  const pattern = /第(\d+)回[\s\S]*?(\d{4})\/(\d{1,2})\/(\d{1,2})[\s\S]*?当[せ選]番号[:：\s]*(\d{4})/g;
  let match;
  
  while ((match = pattern.exec(content)) !== null) {
    results.push({
      drawNumber: parseInt(match[1]),
      drawDate: new Date(parseInt(match[2]), parseInt(match[3]) - 1, parseInt(match[4])),
      winningNumber: match[5]
    });
  }
  
  return results;
}

async function parseMizuho($) {
  const results = [];
  
  $('table tbody tr').each((index, element) => {
    const cells = $(element).find('td');
    if (cells.length >= 3) {
      const drawText = $(cells[0]).text().trim();
      const dateText = $(cells[1]).text().trim();
      const numberText = $(cells[2]).text().trim();
      
      const drawMatch = drawText.match(/第(\d+)回/);
      const numberMatch = numberText.match(/(\d{4})/);
      
      if (drawMatch && numberMatch) {
        // 簡易的な日付パース
        const today = new Date();
        results.push({
          drawNumber: parseInt(drawMatch[1]),
          drawDate: today, // 実際の日付解析は省略
          winningNumber: numberMatch[1]
        });
      }
    }
  });
  
  return results;
}

async function updateNumbers4Data() {
  console.log(`[${new Date().toISOString()}] Numbers4データ更新開始`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    let newDataCount = 0;
    
    // 各データソースから取得を試みる
    for (const source of dataSources) {
      try {
        console.log(`${source.name}から取得中...`);
        
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Numbers4Bot/1.0)'
          },
          timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const results = await source.parser($);
        
        console.log(`  → ${results.length}件のデータを発見`);
        
        // 新しいデータのみ保存
        for (const result of results) {
          try {
            const existing = await DrawResult.findOne({ drawNumber: result.drawNumber });
            if (!existing) {
              await DrawResult.create({
                ...result,
                prize: { amount: 900000, winners: 1 },
                fetchedAt: new Date()
              });
              newDataCount++;
              console.log(`  新規: 第${result.drawNumber}回 ${result.winningNumber}`);
            }
          } catch (err) {
            // エラーは無視
          }
        }
        
        if (results.length > 0) break; // 成功したら終了
        
      } catch (err) {
        console.log(`  ${source.name}からの取得失敗: ${err.message}`);
      }
    }
    
    console.log(`\n新規データ: ${newDataCount}件`);
    
    // 統計情報を更新
    const total = await DrawResult.countDocuments();
    const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`総データ数: ${total}件`);
    if (latest) {
      console.log(`最新: 第${latest.drawNumber}回 (${latest.winningNumber})`);
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('更新完了\n');
  }
}

// メイン実行
updateNumbers4Data();