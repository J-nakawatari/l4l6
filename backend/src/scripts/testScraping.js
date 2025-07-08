const axios = require('axios');
const cheerio = require('cheerio');

async function testScraping() {
  console.log('Numbers4スクレイピングテスト\n');
  
  // PayPay銀行を試す（最新10回分）
  try {
    console.log('1. PayPay銀行から取得...');
    const response = await axios.get('https://www.paypay-bank.co.jp/lottery/numbers/n4recent.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // テーブルを探す
    let found = false;
    $('table').each((i, table) => {
      $(table).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const text1 = $(cells[0]).text().trim();
          const text2 = $(cells[1]).text().trim();
          const text3 = $(cells[2]).text().trim();
          
          // 数字パターンを探す
          if (text1.match(/\d+/) || text2.match(/\d{4}/) || text3.match(/\d{4}/)) {
            console.log(`  行${j}: [${text1}] [${text2}] [${text3}]`);
            found = true;
          }
        }
      });
    });
    
    if (!found) {
      console.log('  → テーブルデータが見つかりません');
    }
    
  } catch (err) {
    console.log('  → エラー:', err.message);
  }
  
  // 別のアプローチ
  console.log('\n2. 直接HTML内のパターンを検索...');
  try {
    const urls = [
      'https://takarakuji.rakuten.co.jp/backnumber/numbers4/',
      'https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html'
    ];
    
    for (const url of urls) {
      console.log(`\n${url}:`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const html = response.data;
      
      // 第XXXX回のパターンを探す
      const drawMatches = html.match(/第(\d{4})回/g);
      if (drawMatches) {
        console.log(`  → 回号パターン発見: ${drawMatches.slice(0, 3).join(', ')}...`);
      }
      
      // 4桁の数字パターンを探す（当選番号の可能性）
      const numberMatches = html.match(/[^\d](\d{4})[^\d]/g);
      if (numberMatches) {
        console.log(`  → 4桁数字パターン: ${numberMatches.slice(0, 5).join(', ')}...`);
      }
      
      // 日付パターン
      const dateMatches = html.match(/202[4-5]年\d{1,2}月\d{1,2}日/g);
      if (dateMatches) {
        console.log(`  → 日付パターン: ${dateMatches.slice(0, 3).join(', ')}...`);
      }
    }
    
  } catch (err) {
    console.log('エラー:', err.message);
  }
}

testScraping();