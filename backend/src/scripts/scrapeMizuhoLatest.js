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

async function scrapeWithPuppeteer() {
  // puppeteerがインストールされている場合のみ実行
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // ユーザーエージェントを設定
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      console.log('ページにアクセス中...');
      await page.goto('https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // テーブルが読み込まれるまで待機
      console.log('データの読み込みを待機中...');
      await page.waitForSelector('table', { timeout: 15000 }).catch(() => {
        console.log('テーブルが見つかりませんでした');
      });
      
      // ページのHTMLを取得
      const content = await page.content();
      
      // スクリーンショットを保存（デバッグ用）
      await page.screenshot({ path: 'mizuho-page.png' });
      console.log('スクリーンショットを保存しました: mizuho-page.png');
      
      // テーブルデータを抽出
      const results = await page.evaluate(() => {
        const data = [];
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
              data.push(cellTexts);
            }
          });
        });
        
        return data;
      });
      
      console.log(`テーブルデータ: ${results.length}行`);
      results.slice(0, 10).forEach((row, i) => {
        console.log(`行${i}: `, row.slice(0, 5));
      });
      
      return results;
      
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.log('Puppeteerが利用できません:', err.message);
    return null;
  }
}

// axios + cheerioでの試行（静的HTML用）
async function scrapeWithAxios() {
  const axios = require('axios');
  const cheerio = require('cheerio');
  
  console.log('axiosでアクセス中...');
  const response = await axios.get('https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
    }
  });
  
  const $ = cheerio.load(response.data);
  
  // タイトルとメタデータを確認
  console.log('ページタイトル:', $('title').text());
  
  // テーブルを探す
  const tables = $('table');
  console.log(`テーブル数: ${tables.length}`);
  
  // class="section__table"を探す
  const sectionTable = $('.section__table');
  console.log(`section__tableクラス: ${sectionTable.length}個`);
  
  // 当選番号のパターンを探す
  const bodyText = $('body').text();
  const drawNumberPattern = /第(\d{4,})回/g;
  const matches = bodyText.match(drawNumberPattern);
  if (matches) {
    console.log('回号パターン発見:', matches.slice(0, 5));
  }
  
  return $;
}

async function scrapeMizuhoLatest() {
  try {
    console.log('みずほ銀行から最新のNumbers4データを取得中...\n');
    
    // データベース接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/numbers4');
    
    const response = await axios.get('https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // 最新の結果を取得
    const results = [];
    
    // テーブルから情報を取得
    $('table').each((i, table) => {
      const rows = $(table).find('tr');
      let drawNumber, drawDate, winningNumber;
      
      rows.each((j, row) => {
        const th = $(row).find('th').text().trim();
        const td = $(row).find('td').text().trim();
        
        if (th.includes('回別')) {
          const match = td.match(/第(\d+)回/);
          if (match) drawNumber = parseInt(match[1]);
        } else if (th.includes('抽せん日')) {
          // 2025年07月11日(金) のような形式
          const match = td.match(/(\d{4})年(\d{2})月(\d{2})日/);
          if (match) {
            drawDate = new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3])
            );
          }
        } else if (th.includes('抽せん数字') || th.includes('当せん番号')) {
          const match = td.match(/(\d{4})/);
          if (match) winningNumber = match[1];
        }
      });
      
      if (drawNumber && drawDate && winningNumber) {
        results.push({
          drawNumber,
          drawDate,
          winningNumber
        });
      }
    });
    
    console.log(`${results.length}件のデータを発見`);
    
    // 保存
    let saved = 0;
    for (const result of results) {
      try {
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
        } else {
          console.log(`既存: 第${result.drawNumber}回`);
        }
      } catch (err) {
        console.error(`エラー: ${err.message}`);
      }
    }
    
    // 最新5件を表示
    const latest = await DrawResult.find()
      .sort({ drawNumber: -1 })
      .limit(5);
    
    console.log('\n=== 最新の抽選結果 ===');
    latest.forEach(r => {
      console.log(`第${r.drawNumber}回: ${r.drawDate.toLocaleDateString('ja-JP')} - ${r.winningNumber}`);
    });
    
    console.log(`\n新規保存: ${saved}件`);
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
scrapeMizuhoLatest();