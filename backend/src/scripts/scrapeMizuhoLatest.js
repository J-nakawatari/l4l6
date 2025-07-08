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

async function updateLatestData() {
  try {
    // まずaxiosで試す
    console.log('=== Axios/Cheerioでの取得 ===');
    await scrapeWithAxios().catch(err => {
      console.error('Axiosエラー:', err.message);
    });
    
    // puppeteerが必要な場合
    console.log('\n=== Puppeteerでの取得（要インストール）===');
    console.log('動的コンテンツの場合は以下を実行:');
    console.log('npm install puppeteer');
    console.log('その後、scrapeWithPuppeteer()を使用');
    
    // データベース接続
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 現在のデータ状況を確認
    const currentCount = await DrawResult.countDocuments();
    const latest = await DrawResult.findOne().sort({ drawNumber: -1 });
    
    console.log(`\n現在のデータ: ${currentCount}件`);
    if (latest) {
      console.log(`最新: 第${latest.drawNumber}回 (${latest.drawDate.toLocaleDateString('ja-JP')})`);
    }
    
    // TODO: スクレイピングしたデータをパースして保存
    // TODO: 150件を超えたら古いデータを削除
    
  } catch (error) {
    console.error('エラー:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

// 実行
updateLatestData();