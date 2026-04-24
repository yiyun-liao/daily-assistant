#!/usr/bin/env node

/**
 * 週日 12:00 - 提醒用戶更新行事曆
 * 確保晚上 22:00 生成週計畫時，行事曆資料是最新的
 */

const { sendMessage } = require('../lib/telegram');

function generateNoonReminder() {
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  return `⏰ <b>週日中午提醒</b>\n\n` +
    `${now}\n\n` +
    `📋 請更新你的行事曆：\n` +
    `• 確認下週的既有行程（會議、約會等）\n` +
    `• 把已知的固定事項加入行事曆\n\n` +
    `🤖 今晚 22:00 我會根據行事曆 + 目標，自動生成下週規劃\n` +
    `行事曆越完整，規劃越準確！`;
}

async function main() {
  try {
    await sendMessage(generateNoonReminder());
    console.log('✅ 週日中午提醒已發送');
  } catch (error) {
    console.error('❌ 發送失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { generateNoonReminder };
