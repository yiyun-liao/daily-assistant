#!/usr/bin/env node

/**
 * 每日番茄鐘規劃
 *
 * 流程：
 * 1. 讀取本週規劃文件，提取當天的任務
 * 2. 讀取行事曆，確認既有行程
 * 3. AI 用番茄鐘方式規劃當天時間
 * 4. 發送到 Telegram
 */

const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../lib/telegram');
const { chat, buildSystemPrompt } = require('../lib/ai');
const { loadActiveGoal, getWeekBoundaries, formatLocalDate } = require('../lib/goals');
const { getEventsForDate } = require('../lib/calendar');

const RECAP_DIR = path.join(__dirname, '../../goal_recap');

function readWeeklyPlan(date = new Date()) {
  const { weekStart, weekEnd } = getWeekBoundaries(date);
  const fmt = d => formatLocalDate(d, '');
  const fileName = `${fmt(weekStart)}_${fmt(weekEnd).slice(4)}_plan.md`;
  const filePath = path.join(RECAP_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function extractTodaySection(weeklyPlan, date = new Date()) {
  const dateStr = formatLocalDate(date);
  const dayName = date.toLocaleDateString('zh-TW', { weekday: 'long' });

  // 嘗試多種格式匹配當日段落
  const patterns = [
    new RegExp(`###\\s+${dayName}\\s+\\(${dateStr}\\)[\\s\\S]*?(?=###|$)`),
    new RegExp(`###\\s+.*${dateStr}[\\s\\S]*?(?=###|$)`),
    new RegExp(`##\\s+${dayName}[\\s\\S]*?(?=##|$)`),
  ];

  for (const pattern of patterns) {
    const match = weeklyPlan.match(pattern);
    if (match) return match[0];
  }
  return null;
}

async function generateDailyPlan(date = new Date()) {
  const goals = loadActiveGoal(date);
  const weeklyPlan = readWeeklyPlan(date);
  const dateStr = formatLocalDate(date);
  const dayName = date.toLocaleDateString('zh-TW', { weekday: 'long' });

  // 讀取行事曆
  let calendarEvents = [];
  try {
    calendarEvents = await getEventsForDate(date);
  } catch (err) {
    console.warn('⚠️ 無法讀取行事曆:', err.message);
  }

  const eventsText = calendarEvents.length > 0
    ? calendarEvents.map(ev => {
        const s = ev.start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        const e = ev.end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
        return `- ${s}–${e}: ${ev.title} (${ev.calendar})`;
      }).join('\n')
    : '無既有行程';

  // 週計畫中當日的段落
  const todaySection = weeklyPlan ? extractTodaySection(weeklyPlan, date) : null;

  const systemPrompt = buildSystemPrompt('secretary');

  let userPrompt = `請根據「每日番茄鐘」的規則，規劃 ${dateStr}（${dayName}）的番茄鐘時間表。\n\n`;
  userPrompt += `## 今日行事曆\n${eventsText}\n\n`;

  if (todaySection) {
    userPrompt += `## 週計畫中今天的安排\n${todaySection}\n\n`;
  } else if (!weeklyPlan && goals) {
    // 只有在完全沒有週計畫時才 fallback 到目標
    const activeTasks = goals.priorities
      .filter(t => t.status !== '已完成')
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3);
    userPrompt += `## 今日任務（無週計畫，從目標讀取前三項）\n`;
    activeTasks.forEach(t => {
      userPrompt += `- ${t.name}（${t.duration}，截止：${t.deadline}）\n`;
    });
    userPrompt += '\n';
  } else if (weeklyPlan) {
    userPrompt += `## 注意\n週計畫中沒有找到今天（${dateStr}）的段落，請根據行事曆安排輕鬆的一天。\n\n`;
  }

  userPrompt += `請輸出今日番茄鐘時間表，包含：
1. 今日概覽（既有行程 + 可用時段）
2. 番茄鐘時間表（具體到每個 25 分鐘，標示🍅）
3. 一句鼓勵的話`;

  console.log('🤖 正在生成今日番茄鐘規劃...');
  const plan = await chat(systemPrompt, userPrompt);
  console.log('✅ 生成完成');
  return plan;
}

async function main() {
  try {
    const dateArg = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));
    const date = dateArg ? new Date(dateArg) : new Date();

    const plan = await generateDailyPlan(date);
    const dateStr = date.toLocaleDateString('zh-TW');

    let msg = `🍅 <b>${dateStr} 番茄鐘計畫</b>\n═════════════════════\n\n`;
    msg += plan;
    msg += `\n\n═════════════════════`;

    await sendMessage(msg);
    console.log('✅ 今日番茄鐘計畫已發送到 Telegram');
  } catch (error) {
    console.error('❌ 生成每日計畫失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { generateDailyPlan, readWeeklyPlan };
