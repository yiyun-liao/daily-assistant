#!/usr/bin/env node

/**
 * 週日 21:55 - AI 根據本週計畫生成回顧
 * 讀取本週的規劃文件，用 AI 產生結構化回顧
 */

const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../lib/telegram');
const { chat, buildSystemPrompt } = require('../lib/ai');
const { loadActiveGoal, getWeekBoundaries, formatLocalDate } = require('../lib/goals');

const RECAP_DIR = path.join(__dirname, '../../goal_recap');

function findWeeklyPlanFile(date = new Date()) {
  const { weekStart, weekEnd } = getWeekBoundaries(date);
  const fmt = d => formatLocalDate(d, '');
  const fileName = `${fmt(weekStart)}_${fmt(weekEnd).slice(4)}_plan.md`;
  const filePath = path.join(RECAP_DIR, fileName);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
}

async function generateWeeklyRecap(date = new Date()) {
  const goals = loadActiveGoal(date);
  const weeklyPlan = findWeeklyPlanFile(date);
  const { weekStart, weekEnd } = getWeekBoundaries(date);

  const weekStartStr = weekStart.toLocaleDateString('zh-TW');
  const weekEndStr = weekEnd.toLocaleDateString('zh-TW');

  const systemPrompt = buildSystemPrompt('secretary');

  let context = `## 回顧期間\n${weekStartStr} ~ ${weekEndStr}\n\n`;

  if (goals) {
    const activeTasks = goals.priorities.filter(t => t.status !== '已完成');
    context += `## 當前目標\n${goals.description}（${goals.start_date} ~ ${goals.end_date}）\n\n`;
    context += `## 活躍任務\n`;
    for (const t of activeTasks) {
      context += `- [${t.rank}] ${t.name}（${t.status}）- ${t.duration}，截止：${t.deadline}\n`;
    }
    context += '\n';
  }

  if (weeklyPlan) {
    context += `## 本週規劃內容\n${weeklyPlan}\n`;
  } else {
    context += `## 本週規劃\n（無週規劃文件）\n`;
  }

  const recap = await chat(systemPrompt, `請根據「週回顧」的規則，生成本週回顧：\n\n${context}`);

  const recapFileName = `${weekStart.toISOString().split('T')[0]}_recap.md`;
  fs.mkdirSync(RECAP_DIR, { recursive: true });
  fs.writeFileSync(path.join(RECAP_DIR, recapFileName), recap, 'utf-8');
  console.log(`✅ 回顧已保存: ${recapFileName}`);

  return recap;
}

async function main() {
  try {
    const recap = await generateWeeklyRecap();
    const header = `📊 <b>本週回顧</b>\n═════════════════════\n\n`;
    const footer = `\n\n═════════════════════\n🤖 5 分鐘後將生成下週規劃`;
    await sendMessage(header + recap + footer);
    console.log('✅ 週回顧已發送到 Telegram');
  } catch (error) {
    console.error('❌ 生成週回顧失敗:', error.message);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { generateWeeklyRecap };
