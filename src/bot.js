#!/usr/bin/env node

/**
 * Telegram Polling Bot - 互動式回覆
 * 處理用戶消息、行事曆同步確認、目標編輯
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { sendMessage, getUpdates } = require('./lib/telegram');
const { chat, buildSystemPrompt } = require('./lib/ai');
const { putEvents } = require('./lib/caldav');
const { getEventsForDate, findFreeSlots } = require('./lib/calendar');
const { loadActiveGoal, listGoalFiles, loadGoalFile, loadLatestGoal, saveGoalFile } = require('./lib/goals');

const PENDING_SYNC_PATH = path.join(__dirname, '../config/pending-sync.json');

let lastUpdateId = 0;

// ─────────────────────────────────────────────
// AI response
// ─────────────────────────────────────────────

async function generateResponse(userMessage, agentType = 'secretary') {
  let additionalContext = `\n\n現在是 ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`;

  if (agentType === 'secretary' &&
      (userMessage.includes('今天') || userMessage.includes('做什麼') ||
       userMessage.includes('時間') || userMessage.includes('安排'))) {
    try {
      const goals = loadActiveGoal();
      const calendarEvents = await getEventsForDate();
      const freeSlots = await findFreeSlots();

      additionalContext += '\n\n## 今日行事曆\n';
      if (calendarEvents.length > 0) {
        calendarEvents.forEach(ev => {
          const s = ev.start.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
          const e = ev.end.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
          additionalContext += `- ${s}-${e}: ${ev.title} (${ev.calendar})\n`;
        });
      } else {
        additionalContext += '無既有行程\n';
      }

      if (goals) {
        const activeTasks = goals.priorities.filter(t => t.status !== '已完成').sort((a, b) => a.rank - b.rank);
        additionalContext += '\n## 當前任務\n';
        activeTasks.forEach(t => {
          additionalContext += `- [${t.rank}] ${t.name}（${t.duration}，截止：${t.deadline}）\n`;
        });
      }
    } catch (error) {
      console.warn('⚠️ 無法獲取日曆信息:', error.message);
    }
  }

  const systemPrompt = buildSystemPrompt(agentType) + additionalContext;
  return chat(systemPrompt, userMessage, { maxTokens: 1024 });
}

// ─────────────────────────────────────────────
// Calendar sync confirmation
// ─────────────────────────────────────────────

async function checkPendingCalendarSync(userMessage) {
  if (!fs.existsSync(PENDING_SYNC_PATH)) return null;

  const msg = userMessage.trim();

  if (msg === '沒問題') {
    try {
      const pending = JSON.parse(fs.readFileSync(PENDING_SYNC_PATH, 'utf-8'));
      const { syncWeeklyPlanToCalendar } = require('./routines/weekly-planner-sync');
      const weekStart = new Date(pending.weekStart);
      const result = await syncWeeklyPlanToCalendar(weekStart);
      fs.unlinkSync(PENDING_SYNC_PATH);
      return `✅ 已寫入行事曆！共新增 ${result.synced} 個事件。`;
    } catch (err) {
      console.error('❌ 行事曆同步失敗:', err.message);
      return `❌ 同步失敗：${err.message}`;
    }
  }

  if (msg === '不用了') {
    fs.unlinkSync(PENDING_SYNC_PATH);
    return '👌 已跳過行事曆寫入。';
  }

  return null;
}

// ─────────────────────────────────────────────
// Goal editor
// ─────────────────────────────────────────────

function handleGoalCommand(userMessage) {
  const msg = userMessage.toLowerCase().trim();

  if (msg === '/goal' || msg === '/goal help') {
    return `🎯 <b>目標編輯器</b>\n\n` +
           `• <code>/goal review</code> - 回顧當前目標\n` +
           `• <code>/goal list</code> - 列出所有目標\n` +
           `• <code>/goal edit</code> - 編輯當前目標`;
  }

  if (msg === '/goal review') {
    const latest = loadLatestGoal();
    if (!latest || !latest.data) return '❌ 無法讀取當前目標';

    const d = latest.data;
    let m = `📋 <b>${d.description}</b>\n${d.start_date} ~ ${d.end_date}\n\n`;
    for (const t of d.priorities) {
      const icon = t.status === '已完成' ? '✅' : '⏳';
      m += `${icon} <b>${t.rank}. ${t.name}</b>\n  ${t.duration} | 截止: ${t.deadline}\n\n`;
    }
    return m;
  }

  if (msg === '/goal list') {
    const files = listGoalFiles();
    if (files.length === 0) return '❌ 暫無目標文件';
    let m = `📂 <b>所有短期目標</b>（${files.length}）\n\n`;
    files.forEach((f, i) => {
      const data = loadGoalFile(f);
      const marker = i === files.length - 1 ? '⭐' : '📄';
      m += `${marker} <b>${f.replace('.json', '')}</b>\n`;
      if (data) m += `   ${data.description}（${data.start_date} ~ ${data.end_date}）\n\n`;
    });
    return m;
  }

  if (msg === '/goal edit') {
    return `📝 <b>編輯當前目標</b>\n\n` +
           `回覆以下格式標記完成：\n<code>完成 任務名稱</code>\n\n` +
           `或直接告訴我你想調整什麼，我來處理。`;
  }

  if (msg.includes('完成') || msg.includes('done')) {
    const taskName = userMessage.replace(/完成|done/i, '').replace(/^\/goal\s*/, '').trim();
    if (!taskName) return '請指定要標記完成的任務名稱';

    const latest = loadLatestGoal();
    if (!latest) return '❌ 無法讀取目標';

    const task = latest.data.priorities.find(t =>
      t.name.includes(taskName) || taskName.includes(t.name)
    );
    if (!task) {
      return `❌ 找不到「${taskName}」\n\n可用任務：\n` +
        latest.data.priorities.map(t => `• ${t.name}`).join('\n');
    }

    task.status = '已完成';
    saveGoalFile(latest.file, latest.data);
    return `✅ 已標記「${task.name}」為完成`;
  }

  return null;
}

// ─────────────────────────────────────────────
// Message routing
// ─────────────────────────────────────────────

function determineAgentType(message) {
  const m = message.toLowerCase();
  if (m.includes('/goal')) return 'goal-editor';
  if (m.includes('/secretary') || m.includes('今天') || m.includes('做什麼') ||
      m.includes('時間') || m.includes('日程') || m.includes('安排')) return 'secretary';
  if (m.includes('/career-coach') || m.includes('職涯') || m.includes('人生') ||
      m.includes('決定') || m.includes('建議')) return 'career-coach';
  return 'secretary';
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const userMessage = message.text;
  if (!userMessage) return;

  console.log(`📨 收到: ${userMessage}`);

  // 檢查待確認的行事曆同步
  const pendingResponse = await checkPendingCalendarSync(userMessage);
  if (pendingResponse) {
    await sendMessage(pendingResponse, 'HTML', chatId);
    return;
  }

  const agentType = determineAgentType(userMessage);
  let response;

  if (agentType === 'goal-editor') {
    response = handleGoalCommand(userMessage);
    if (!response) {
      response = await generateResponse(userMessage.replace(/^\/goal\s*/, ''), 'secretary');
    }
  } else {
    const cleanMessage = userMessage.replace(/^\/(secretary|career-coach)\s*/, '').trim();
    response = await generateResponse(cleanMessage, agentType);
  }

  // Telegram 4096 字符限制
  const maxLen = 4096;
  const replies = response.length > maxLen
    ? [response.substring(0, maxLen), response.substring(maxLen)]
    : [response];

  for (const reply of replies) {
    try {
      await sendMessage(reply, 'HTML', chatId);
      console.log(`✅ 回覆已發送 (${agentType})`);
    } catch (error) {
      console.error('❌ 發送回覆失敗:', error.message);
    }
  }
}

// ─────────────────────────────────────────────
// Polling loop
// ─────────────────────────────────────────────

async function pollingLoop() {
  console.log('🚀 Telegram Bot 已啟動');
  console.log('💬 等待消息... (Ctrl+C 停止)\n');

  while (true) {
    try {
      const updates = await getUpdates(lastUpdateId);
      for (const update of updates) {
        lastUpdateId = update.update_id + 1;
        if (update.message) {
          try { await handleMessage(update.message); }
          catch (error) { console.error('❌ 處理消息出錯:', error.message); }
        }
      }
      if (updates.length === 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (error) {
      console.error('❌ 獲取更新出錯:', error.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ─────────────────────────────────────────────
// Scheduled routines (Asia/Taipei)
// ─────────────────────────────────────────────

function scheduleRoutines() {
  const opts = { timezone: 'Asia/Taipei' };

  // 每天 08:00 — 番茄鐘計畫
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [cron] 觸發: daily-plan');
    try {
      const { generateDailyPlan } = require('./routines/daily-planner');
      const plan = await generateDailyPlan();
      const dateStr = new Date().toLocaleDateString('zh-TW');
      let msg = `🍅 <b>${dateStr} 番茄鐘計畫</b>\n═════════════════════\n\n`;
      msg += plan;
      msg += `\n\n═════════════════════`;
      await sendMessage(msg);
      console.log('✅ [cron] daily-plan 已發送');
    } catch (err) {
      console.error('❌ [cron] daily-plan 失敗:', err.message);
    }
  }, opts);

  // 週日 12:00 — 提醒更新行事曆
  cron.schedule('0 12 * * 0', async () => {
    console.log('⏰ [cron] 觸發: noon-reminder');
    try {
      const { generateNoonReminder } = require('./routines/sunday-noon-reminder');
      await sendMessage(generateNoonReminder());
      console.log('✅ [cron] noon-reminder 已發送');
    } catch (err) {
      console.error('❌ [cron] noon-reminder 失敗:', err.message);
    }
  }, opts);

  // 週日 21:55 — 週回顧
  cron.schedule('55 21 * * 0', async () => {
    console.log('⏰ [cron] 觸發: weekly-recap');
    try {
      const { generateWeeklyRecap } = require('./routines/weekly-recap');
      const recap = await generateWeeklyRecap();
      const header = `📊 <b>本週回顧</b>\n═════════════════════\n\n`;
      const footer = `\n\n═════════════════════\n🤖 5 分鐘後將生成下週規劃`;
      await sendMessage(header + recap + footer);
      console.log('✅ [cron] weekly-recap 已發送');
    } catch (err) {
      console.error('❌ [cron] weekly-recap 失敗:', err.message);
    }
  }, opts);

  // 週日 22:00 — 下週規劃
  cron.schedule('0 22 * * 0', async () => {
    console.log('⏰ [cron] 觸發: weekly-plan');
    try {
      const { generateWeeklyPlan, savePlan, savePendingSync, formatTelegramMessage } = require('./routines/weekly-planner');
      const plan = await generateWeeklyPlan();
      if (plan) {
        savePlan(plan);
        savePendingSync();
        await sendMessage(formatTelegramMessage(plan));
        console.log('✅ [cron] weekly-plan 已發送');
      }
    } catch (err) {
      console.error('❌ [cron] weekly-plan 失敗:', err.message);
    }
  }, opts);

  console.log('📅 排程已啟動:');
  console.log('   • 每天 08:00 — 番茄鐘計畫');
  console.log('   • 週日 12:00 — 行事曆更新提醒');
  console.log('   • 週日 21:55 — 週回顧');
  console.log('   • 週日 22:00 — 下週規劃');
}

if (require.main === module) {
  scheduleRoutines();
  pollingLoop().catch(err => { console.error('❌ Bot 錯誤:', err); process.exit(1); });
}

module.exports = { handleMessage, generateResponse, determineAgentType, checkPendingCalendarSync, handleGoalCommand };
