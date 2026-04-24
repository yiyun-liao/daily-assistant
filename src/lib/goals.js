const fs = require('fs');
const path = require('path');

const GOALS_DIR = path.join(__dirname, '../../short-term-goal');

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function loadActiveGoal(date = new Date()) {
  const today = formatLocalDate(date);
  try {
    const files = fs.readdirSync(GOALS_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return null;

    const parsed = files.map(f => {
      try {
        return { file: f, data: JSON.parse(fs.readFileSync(path.join(GOALS_DIR, f), 'utf-8')) };
      } catch { return null; }
    }).filter(Boolean);

    const active = parsed.filter(({ data }) =>
      data.start_date && data.end_date &&
      data.start_date <= today && today <= data.end_date
    );

    if (active.length > 0) {
      active.sort((a, b) => b.data.start_date.localeCompare(a.data.start_date));
      return active[0].data;
    }

    parsed.sort((a, b) => b.file.localeCompare(a.file));
    return parsed[0].data;
  } catch (error) {
    console.warn('⚠️ 無法讀取短期目標:', error.message);
    return null;
  }
}

function listGoalFiles() {
  try {
    return fs.readdirSync(GOALS_DIR).filter(f => f.endsWith('.json')).sort();
  } catch { return []; }
}

function loadGoalFile(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(GOALS_DIR, filename), 'utf-8'));
  } catch { return null; }
}

function loadLatestGoal() {
  const files = listGoalFiles();
  if (files.length === 0) return null;
  const latestFile = files[files.length - 1];
  return { file: latestFile, data: loadGoalFile(latestFile) };
}

function saveGoalFile(filename, data) {
  fs.writeFileSync(path.join(GOALS_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

function getWeekBoundaries(date = new Date()) {
  const weekStart = new Date(date);
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

function getNextWeekBoundaries(date = new Date()) {
  const { weekStart } = getWeekBoundaries(date);
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  nextSunday.setHours(23, 59, 59, 999);
  return { weekStart: nextMonday, weekEnd: nextSunday };
}

// 用本地時間格式化日期為 YYYY-MM-DD 或 YYYYMMDD
function formatLocalDate(date, separator = '-') {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return separator ? `${y}${separator}${m}${separator}${d}` : `${y}${m}${d}`;
}

module.exports = {
  getISOWeek,
  loadActiveGoal,
  listGoalFiles,
  loadGoalFile,
  loadLatestGoal,
  saveGoalFile,
  getWeekBoundaries,
  getNextWeekBoundaries,
  formatLocalDate,
  GOALS_DIR,
};
