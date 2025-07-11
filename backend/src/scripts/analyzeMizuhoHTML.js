const axios = require('axios');
const cheerio = require('cheerio');

async function analyzeMizuhoHTML() {
  console.log('みずほ銀行のHTML構造を分析中...\n');
  
  try {
    const response = await axios.get('https://www.mizuhobank.co.jp/takarakuji/check/numbers/numbers4/index.html', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // 全テーブルを調査
    console.log('=== テーブル構造の分析 ===');
    $('table').each((i, table) => {
      console.log(`\nTable ${i + 1}:`);
      console.log(`  Class: ${$(table).attr('class') || 'なし'}`);
      console.log(`  ID: ${$(table).attr('id') || 'なし'}`);
      
      // 最初の5行を表示
      $(table).find('tr').slice(0, 5).each((j, row) => {
        const cells = [];
        $(row).find('th, td').each((k, cell) => {
          cells.push($(cell).text().trim().replace(/\s+/g, ' '));
        });
        console.log(`  Row ${j + 1}: ${cells.join(' | ')}`);
      });
    });
    
    // 回別、抽せん日、抽せん数字を含む要素を探す
    console.log('\n=== キーワード検索 ===');
    const keywords = ['回別', '抽せん日', '抽せん数字', '当せん番号', '第6767回', '第6766回', '第6765回'];
    
    keywords.forEach(keyword => {
      const elements = $(`*:contains("${keyword}")`).filter(function() {
        return $(this).children().length === 0;
      });
      
      if (elements.length > 0) {
        console.log(`\n"${keyword}"を含む要素: ${elements.length}個`);
        elements.slice(0, 3).each((i, el) => {
          console.log(`  ${el.name}: ${$(el).text().trim()}`);
          console.log(`    親要素: ${$(el).parent().prop('tagName')}`);
        });
      }
    });
    
    // <dl>タグも確認
    console.log('\n=== DLタグの確認 ===');
    $('dl').each((i, dl) => {
      console.log(`\nDL ${i + 1}:`);
      $(dl).find('dt, dd').slice(0, 6).each((j, elem) => {
        console.log(`  ${elem.name}: ${$(elem).text().trim()}`);
      });
    });
    
    // classやidで関連しそうな要素を探す
    console.log('\n=== 関連クラス/IDの検索 ===');
    const patterns = ['result', 'number', 'draw', 'latest', 'current'];
    patterns.forEach(pattern => {
      const byClass = $(`[class*="${pattern}"]`);
      const byId = $(`[id*="${pattern}"]`);
      
      if (byClass.length > 0 || byId.length > 0) {
        console.log(`\n"${pattern}"を含む要素:`);
        if (byClass.length > 0) {
          console.log(`  クラス: ${byClass.length}個`);
          byClass.slice(0, 2).each((i, el) => {
            console.log(`    ${el.name}.${$(el).attr('class')}: ${$(el).text().trim().substring(0, 50)}...`);
          });
        }
        if (byId.length > 0) {
          console.log(`  ID: ${byId.length}個`);
          byId.slice(0, 2).each((i, el) => {
            console.log(`    ${el.name}#${$(el).attr('id')}: ${$(el).text().trim().substring(0, 50)}...`);
          });
        }
      }
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

analyzeMizuhoHTML();