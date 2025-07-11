const axios = require('axios');
const cheerio = require('cheerio');

async function testMizuhoScrape() {
  console.log('みずほ銀行のサイトをテスト中...\n');
  
  // 最新の当選番号ページ
  const urls = [
    'https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html',
    'https://www.mizuhobank.co.jp/retail/takarakuji/check/numbers/numbers4/index.html',
    'https://www.mizuhobank.co.jp/takarakuji/numbers/numbers4/index.html',
    'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/numbers4/index.html'
  ];
  
  for (const url of urls) {
    console.log(`テスト中: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000,
        maxRedirects: 5
      });
      
      console.log(`  ステータス: ${response.status}`);
      console.log(`  データサイズ: ${response.data.length}文字`);
      
      const $ = cheerio.load(response.data);
      
      // タイトルを確認
      console.log(`  タイトル: ${$('title').text()}`);
      
      // Numbers4関連の文字を探す
      const bodyText = $('body').text();
      if (bodyText.includes('ナンバーズ4') || bodyText.includes('NUMBERS4')) {
        console.log('  ✓ Numbers4のコンテンツを発見！');
        
        // 当選番号のパターンを探す
        const patterns = [
          /第(\d{4,})回[\s\S]*?(\d{4})/g,
          /回号[\s\S]*?第(\d{4,})回[\s\S]*?当選番号[\s\S]*?(\d{4})/g,
          /(\d{4,})回[\s\S]*?当[せ選]番号[\s\S]*?(\d{4})/g
        ];
        
        let found = false;
        for (const pattern of patterns) {
          const matches = [...bodyText.matchAll(pattern)];
          if (matches.length > 0) {
            console.log(`  ✓ ${matches.length}件の抽選結果を発見`);
            // 最初の3件を表示
            matches.slice(0, 3).forEach(match => {
              console.log(`    第${match[1]}回: ${match[2]}`);
            });
            found = true;
            break;
          }
        }
        
        if (!found) {
          // HTMLの構造を詳しく見る
          console.log('\n  HTML構造を分析中...');
          $('table').each((i, table) => {
            const tableText = $(table).text();
            if (tableText.includes('回') || tableText.includes('当選番号')) {
              console.log(`  Table ${i + 1}に関連データの可能性`);
              $(table).find('tr').slice(0, 3).each((j, tr) => {
                console.log(`    Row ${j + 1}: ${$(tr).text().replace(/\s+/g, ' ').trim()}`);
              });
            }
          });
        }
        
        return true;
      } else {
        console.log('  ✗ Numbers4のコンテンツが見つかりません');
      }
      
    } catch (error) {
      console.log(`  ✗ エラー: ${error.message}`);
    }
    console.log('');
  }
  
  return false;
}

testMizuhoScrape().then(success => {
  if (!success) {
    console.log('みずほ銀行のサイトから取得できませんでした。');
    console.log('別の方法を検討する必要があります。');
  }
});