const axios = require('axios');
const cheerio = require('cheerio');

async function debugScrape() {
  const url = 'https://www.mizuhobank.co.jp/takarakuji/check/numbers/backnumber/num0001.html';
  
  try {
    console.log('URLアクセス中:', url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('\nステータスコード:', response.status);
    console.log('コンテンツタイプ:', response.headers['content-type']);
    
    const $ = cheerio.load(response.data);
    
    // HTMLの一部を表示
    console.log('\nHTML冒頭（500文字）:');
    console.log(response.data.substring(0, 500));
    
    // テーブルの数を確認
    console.log('\nテーブル数:', $('table').length);
    
    // 各テーブルを調査
    $('table').each((i, table) => {
      console.log(`\nテーブル${i + 1}:`);
      const rows = $(table).find('tr');
      console.log(`  行数: ${rows.length}`);
      
      // 最初の3行を詳しく見る
      rows.slice(0, 3).each((j, row) => {
        const cells = $(row).find('td,th');
        console.log(`  行${j + 1}: ${cells.length}列`);
        cells.each((k, cell) => {
          const text = $(cell).text().trim().replace(/\s+/g, ' ');
          console.log(`    列${k + 1}: "${text}"`);
        });
      });
    });
    
    // 「第X回」パターンを探す
    const drawPatterns = response.data.match(/第\d+回/g);
    if (drawPatterns) {
      console.log('\n「第X回」パターン発見:');
      console.log(drawPatterns.slice(0, 5));
    }
    
    // 4桁数字パターンを探す
    const numberPatterns = response.data.match(/\b\d{4}\b/g);
    if (numberPatterns) {
      console.log('\n4桁数字パターン:');
      console.log(numberPatterns.slice(0, 10));
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
    if (error.response) {
      console.error('ステータス:', error.response.status);
    }
  }
}

debugScrape();