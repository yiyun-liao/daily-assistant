/**
 * 將週規劃同步到 AI Assistant 行事曆
 * 由 bot.js 在用戶確認「沒問題」後呼叫
 */

const fs = require('fs');
const path = require('path');
const { putEvents } = require('../lib/caldav');
const { getWeekBoundaries, formatLocalDate } = require('../lib/goals');

const RECAP_DIR = path.join(__dirname, '../../goal_recap');

async function syncWeeklyPlanToCalendar(weekDate = new Date()) {
  const { weekStart, weekEnd } = getWeekBoundaries(weekDate);
  const fmt = d => formatLocalDate(d, '');
  const fileName = `${fmt(weekStart)}_${fmt(weekEnd).slice(4)}_plan.md`;
  const filePath = path.join(RECAP_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 週規劃文件不存在: ${filePath}`);
    return { synced: 0, skipped: 0 };
  }

  const planContent = fs.readFileSync(filePath, 'utf-8');

  const dayMap = new Map();
  const dayPattern = /###\s+.+?(\d{4}-\d{2}-\d{2})/g;
  let dayMatch;

  while ((dayMatch = dayPattern.exec(planContent)) !== null) {
    const dateStr = dayMatch[1];
    const dayNameMatch = dayMatch[0].match(/(星期[一二三四五六日])/);
    const dayName = dayNameMatch ? dayNameMatch[1] : dateStr;
    const nextIdx = planContent.indexOf('###', dayMatch.index + 1);
    const daySection = planContent.substring(dayMatch.index, nextIdx === -1 ? undefined : nextIdx);

    const tasks = [];
    const taskPattern = /\|\s*[^|]+\|\s*\S+\s+\*\*(.+?)\*\*/gm;
    let tm;
    while ((tm = taskPattern.exec(daySection)) !== null) {
      const t = tm[1].trim();
      if (t) tasks.push(t);
    }

    dayMap.set(dateStr, { dayName, tasks });
  }

  // 每天建一個摘要事件（08:00 台灣時間 = UTC 00:00）
  const events = [];
  for (const [dateStr, { dayName, tasks }] of dayMap) {
    if (tasks.length === 0) continue;

    const d = new Date(dateStr);
    if (d < weekStart || d > weekEnd) continue;

    const startDate = new Date(`${dateStr}T00:00:00Z`);
    const endDate = new Date(`${dateStr}T00:30:00Z`);

    events.push({
      id: `weekly-day-${dateStr}`,
      title: `📋 ${dayName} 規劃`,
      description: tasks.map(t => `• ${t}`).join('\n'),
      startDate,
      endDate,
    });
  }

  if (events.length === 0) {
    return { synced: 0, skipped: 0 };
  }

  const result = await putEvents(events);
  console.log(`✅ 週規劃同步: ${result.successful} 個事件`);
  return { synced: result.successful, skipped: result.failed };
}

module.exports = { syncWeeklyPlanToCalendar };
