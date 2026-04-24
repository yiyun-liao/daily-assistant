#!/usr/bin/env node

/**
 * 週日 22:00 - AI 生成下週規劃
 *
 * 流程：
 * 1. 讀取短中長期目標、個人資料、行事曆
 * 2. AI 生成一週計畫（保留兩成空擋，不與既有行程衝突）
 * 3. Telegram 送出計畫
 * 4. 用戶確認「沒問題」後寫入 AI Assistant 行事曆（由 bot.js 處理）
 */

const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../lib/telegram');
const { chat, buildSystemPrompt } = require('../lib/ai');
const { loadActiveGoal, getNextWeekBoundaries, formatLocalDate } = require('../lib/goals');
const { getEventsForDateRange, BLOCK_CALENDARS } = require('../lib/calendar');

const RECAP_DIR = path.join(__dirname, '../../goal_recap');
const CONFIG_DIR = path.join(__dirname, '../../config');

function loadTextFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function parseTimeToHours(timeStr) {
  const isPM = /下午/.test(timeStr);
  const isAM = /上午/.test(timeStr);
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]) / 60;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h + m;
}

function calcBlockedHours(dayEvents, slotStart, slotEnd) {
  let blocked = 0;
  for (const ev of dayEvents) {
    const evStart = ev.start.getHours() + ev.start.getMinutes() / 60;
    const evEnd = ev.end.getHours() + ev.end.getMinutes() / 60;
    const overlapStart = Math.max(evStart, slotStart);
    const overlapEnd = Math.min(evEnd, slotEnd);
    if (overlapEnd > overlapStart) blocked += overlapEnd - overlapStart;
  }
  return blocked;
}

async function generateWeeklyPlan(date = new Date()) {
  const { weekStart, weekEnd } = getNextWeekBoundaries(date);
  const goals = loadActiveGoal(weekStart);
  if (!goals) {
    console.error('❌ 無法載入短期目標');
    return null;
  }

  // 讀取行事曆事件
  let existingEvents = [];
  try {
    const allEvents = await getEventsForDateRange(weekStart, weekEnd);
    existingEvents = allEvents.filter(e => BLOCK_CALENDARS.includes(e.calendar));
    console.log(`📅 讀取到 ${existingEvents.length} 個既有事件`);
  } catch (err) {
    console.warn('⚠️ 無法讀取行事曆:', err.message);
  }

  // 時段設定
  const sc = goals.schedule_config || {};
  const slots = {
    morning: {
      start: parseTimeToHours(sc.morning_start || '09:30'),
      end: parseTimeToHours(sc.morning_end || '13:00'),
    },
    afternoon: {
      start: parseTimeToHours(sc.afternoon_start || '14:00'),
      end: parseTimeToHours(sc.afternoon_end || '17:00'),
    },
    evening: {
      start: parseTimeToHours(sc.evening_start || '19:00'),
      end: parseTimeToHours(sc.evening_end || '22:00'),
    },
  };

  // 每天可用時數
  const dailyInfo = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dateStr = formatLocalDate(day);

    const dayEvents = existingEvents.filter(e =>
      e.start.toISOString().split('T')[0] === dateStr
    );

    const slotInfo = {};
    for (const [name, { start, end }] of Object.entries(slots)) {
      const blocked = calcBlockedHours(dayEvents, start, end);
      const total = end - start;
      slotInfo[name] = {
        total: parseFloat(total.toFixed(1)),
        blocked: parseFloat(blocked.toFixed(1)),
        free: parseFloat(Math.max(0, total - blocked).toFixed(1)),
      };
    }

    const totalFree = Object.values(slotInfo).reduce((sum, s) => sum + s.free, 0);

    dailyInfo[dateStr] = {
      dayName: day.toLocaleDateString('zh-TW', { weekday: 'long' }),
      events: dayEvents.map(ev => ({
        title: ev.title,
        start: ev.start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        end: ev.end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        calendar: ev.calendar,
      })),
      slots: slotInfo,
      totalFree: parseFloat(totalFree.toFixed(1)),
    };
  }

  // 組裝每日摘要
  let dailySummary = '';
  for (const [dateStr, info] of Object.entries(dailyInfo)) {
    dailySummary += `\n### ${info.dayName} (${dateStr})\n`;
    if (info.events.length > 0) {
      dailySummary += `既有行程：\n`;
      info.events.forEach(ev => {
        dailySummary += `  - ${ev.title}（${ev.start}–${ev.end}，${ev.calendar}）\n`;
      });
    } else {
      dailySummary += `既有行程：無\n`;
    }
    dailySummary += `可用時間：早晨 ${info.slots.morning.free}h / 午間 ${info.slots.afternoon.free}h / 晚間 ${info.slots.evening.free}h（共 ${info.totalFree}h）\n`;
  }

  // 任務摘要（動態，不硬編碼）
  const activeTasks = goals.priorities
    .filter(t => t.status !== '已完成')
    .sort((a, b) => a.rank - b.rank);

  const tasksSummary = activeTasks.map(t => {
    let s = `- [優先級${t.rank}] **${t.name}** (${t.type})\n`;
    s += `  時間投入: ${t.duration}\n`;
    s += `  截止: ${t.deadline}\n`;
    s += `  重要性: ${t.reason}\n`;
    s += `  狀態: ${t.status}\n`;
    if (t.daily_plan) {
      const entries = Object.entries(t.daily_plan).map(([d, v]) => `${d}: ${v}`).join('、');
      s += `  每日計畫: ${entries}\n`;
    }
    if (t.remaining_tasks) {
      s += `  剩餘子任務:\n`;
      t.remaining_tasks.forEach(rt => {
        s += `    - ${rt.task}（${rt.estimate}，${rt.priority}）\n`;
      });
    }
    return s;
  }).join('\n');

  const systemPrompt = buildSystemPrompt('secretary');

  const weekStartStr = weekStart.toLocaleDateString('zh-TW');
  const weekEndStr = weekEnd.toLocaleDateString('zh-TW');
  const generatedAt = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

  const morningLabel = `${sc.morning_start || '09:30'}-${sc.morning_end || '13:00'}`;
  const afternoonLabel = `${sc.afternoon_start || '14:00'}-${sc.afternoon_end || '17:00'}`;
  const eveningLabel = `${sc.evening_start || '19:00'}-${sc.evening_end || '22:00'}`;

  const userPrompt = `請為我生成 **${weekStartStr} ~ ${weekEndStr}** 這週的詳細週規劃，格式為 Markdown。

## 當前目標週期
${goals.description}（${goals.start_date} ~ ${goals.end_date}）

## 本週任務（按優先級排序）

${tasksSummary}

## 本週每日行事曆與可用時間

時段設定：
- 早晨：${morningLabel}
- 午間：${afternoonLabel}
- 晚間：${eveningLabel}

${dailySummary}

請根據「週規劃」和「規劃原則」的規則生成。生成時間：${generatedAt}`;

  console.log('🤖 正在呼叫 Claude AI 生成週規劃...');
  const plan = await chat(systemPrompt, userPrompt, { model: 'claude-sonnet-4-20250514', maxTokens: 4096 });
  console.log('✅ AI 生成完成');
  return plan;
}

function savePlan(plan, date = new Date()) {
  const { weekStart, weekEnd } = getNextWeekBoundaries(date);
  const fmt = d => formatLocalDate(d, '');
  const fileName = `${fmt(weekStart)}_${fmt(weekEnd).slice(4)}_plan.md`;
  const filePath = path.join(RECAP_DIR, fileName);
  fs.mkdirSync(RECAP_DIR, { recursive: true });
  fs.writeFileSync(filePath, plan, 'utf-8');
  console.log(`✅ 週規劃已保存: ${filePath}`);
  return filePath;
}

function savePendingSync(date = new Date()) {
  const { weekStart } = getNextWeekBoundaries(date);
  const pendingPath = path.join(CONFIG_DIR, 'pending-sync.json');
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(pendingPath, JSON.stringify({
    type: 'weekly_calendar_sync',
    weekStart: weekStart.toISOString(),
    createdAt: new Date().toISOString(),
  }, null, 2));
}

function formatTelegramMessage(plan) {
  // 截取計畫的前 3500 字（Telegram 限制 4096，留空間給 header/footer）
  const truncated = plan.length > 3500 ? plan.substring(0, 3500) + '\n\n...（規劃過長已截斷，完整版見 goal_recap/）' : plan;

  let msg = `📅 <b>下週規劃已生成！</b>\n═════════════════════\n\n`;
  msg += truncated;
  msg += '\n\n─────────────────';
  msg += '\n📋 <b>下一步</b>\n';
  msg += '\n• 回覆 <b>沒問題</b> → 寫入 AI Assistant 行事曆';
  msg += '\n• 回覆 <b>不用了</b> → 跳過寫入';
  msg += '\n• 回覆其他內容 → 我幫你調整';
  msg += '\n\n═════════════════════';

  return msg;
}

async function main() {
  try {
    const weekArgIdx = process.argv.indexOf('--week');
    const baseDate = weekArgIdx !== -1 ? new Date(process.argv[weekArgIdx + 1]) : new Date();

    const plan = await generateWeeklyPlan(baseDate);
    if (!plan) {
      console.error('❌ 無法生成週規劃');
      process.exit(1);
    }

    savePlan(plan, baseDate);
    savePendingSync(baseDate);

    const telegramMsg = formatTelegramMessage(plan);
    await sendMessage(telegramMsg);
    console.log('✅ 週規劃已發送到 Telegram，等待用戶確認');
  } catch (error) {
    console.error('❌ 生成週規劃失敗:', error);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { generateWeeklyPlan, savePlan, savePendingSync, formatTelegramMessage, getNextWeekBoundaries: require('../lib/goals').getNextWeekBoundaries };
