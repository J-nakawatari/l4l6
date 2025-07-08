const axios = require('axios');
const cheerio = require('cheerio');

/**
 * ページ構造をデバッグ
 */
async function debugPageStructure(drawNumber) {
  try {
    const url = `https://numbers-renban.tokyo/numbers4/result/${drawNumber}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== ページタイトル ===');
    console.log($('title').text());
    
    console.log('\n=== 日付関連の要素 ===');
    $('.result-date').each((i, el) => {
      console.log(`result-date: "${$(el).text().trim()}"`);
    });
    
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d{4}年\d{1,2}月\d{1,2}日/)) {
        console.log(`日付発見 (${el.tagName}.${$(el).attr('class')}): "${text}"`);
      }
    });
    
    console.log('\n=== 数字関連の要素 ===');
    $('.result-numbers .number').each((i, el) => {
      console.log(`result-numbers .number: "${$(el).text().trim()}"`);
    });
    
    $('.number').each((i, el) => {
      console.log(`number: "${$(el).text().trim()}"`);
    });
    
    console.log('\n=== 4桁数字を検索 ===');
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/^\d{4}$/)) {
        console.log(`4桁数字発見 (${el.tagName}.${$(el).attr('class')}): "${text}"`);
      }
    });
    
    console.log('\n=== 賞金テーブル ===');
    $('.prize-table tr').each((i, el) => {
      const cells = $(el).find('td');
      if (cells.length >= 3) {
        console.log(`賞金行 ${i}: ${$(cells[0]).text().trim()} | ${$(cells[1]).text().trim()} | ${$(cells[2]).text().trim()}`);
      }
    });
    
    $('table tr').each((i, el) => {
      const cells = $(el).find('td');
      if (cells.length >= 2) {
        const text = $(cells[0]).text().trim();
        if (text.includes('ストレート') || text.includes('ボックス')) {
          console.log(`テーブル行 ${i}: ${text} | ${$(cells[1]).text().trim()}`);
        }
      }
    });
    
  } catch (error) {
    console.error('エラー:', error.message);
  }
}

// 第6533回と第6758回を確認
async function main() {
  console.log('=== 第6533回の構造確認 ===');
  await debugPageStructure(6533);
  
  console.log('\n\n=== 第6758回の構造確認 ===');
  await debugPageStructure(6758);
}

main();