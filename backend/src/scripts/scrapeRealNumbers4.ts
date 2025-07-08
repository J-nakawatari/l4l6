import axios from 'axios';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { DrawResult } from '../models/DrawResult';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function scrapeNumbers4() {
  try {
    console.log('実際のNumbers4データを取得中...');
    
    // まず既存のテストデータを削除
    await mongoose.connect(process.env.MONGODB_URI!);
    await DrawResult.deleteMany({});
    console.log('既存のテストデータを削除しました');
    
    // みずほ銀行のNumbers4バックナンバーページ
    const urls = [
      'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-202412.html', // 2024年12月
      'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-202411.html', // 2024年11月
      'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-202410.html', // 2024年10月
      'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-202409.html', // 2024年9月
      'https://www.mizuhobank.co.jp/retail/takarakuji/numbers/backnumber/num4-202408.html', // 2024年8月
    ];
    
    let allData: any[] = [];
    
    for (const url of urls) {
      try {
        console.log(`取得中: ${url}`);
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // みずほ銀行のテーブル構造に基づいて解析
        $('table.typeTK tbody tr').each((_, element) => {
          const cells = $(element).find('td');
          if (cells.length >= 3) {
            // 回号
            const drawText = $(cells[0]).text().trim();
            const drawMatch = drawText.match(/第(\d+)回/);
            if (!drawMatch) return;
            const drawNumber = parseInt(drawMatch[1]);
            
            // 抽選日
            const dateText = $(cells[1]).text().trim();
            const dateMatch = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
            if (!dateMatch) return;
            const drawDate = new Date(
              parseInt(dateMatch[1]),
              parseInt(dateMatch[2]) - 1,
              parseInt(dateMatch[3])
            );
            
            // 当選番号
            let winningNumber = $(cells[2]).text().trim();
            // 数字以外を除去
            winningNumber = winningNumber.replace(/[^0-9]/g, '');
            
            if (winningNumber.length === 4) {
              allData.push({
                drawNumber,
                drawDate,
                winningNumber,
                prize: { amount: 900000, winners: 1 }
              });
            }
          }
        });
        
        // 少し待機（サーバーに負荷をかけないため）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`${url}の取得に失敗:`, err);
      }
    }
    
    // データを保存
    console.log(`\n${allData.length}件のデータを取得しました`);
    
    if (allData.length > 0) {
      // 重複を避けて保存
      for (const data of allData) {
        try {
          await DrawResult.create({
            ...data,
            fetchedAt: new Date()
          });
        } catch (err) {
          // 重複エラーは無視
        }
      }
      
      // 統計を表示
      const saved = await DrawResult.find().sort({ drawNumber: -1 }).limit(100);
      console.log(`\nデータベースに${saved.length}件保存されました`);
      
      // 最新10件を表示
      console.log('\n最新10件の当選番号:');
      saved.slice(0, 10).forEach((d: any) => {
        console.log(`第${d.drawNumber}回 (${d.drawDate.toLocaleDateString('ja-JP')}): ${d.winningNumber}`);
      });
    }
    
  } catch (error) {
    console.error('スクレイピングエラー:', error);
  } finally {
    await mongoose.disconnect();
  }
}

scrapeNumbers4();