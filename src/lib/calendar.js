const { readCalendarEvents } = require('./caldav');

const CALENDAR_NAMES = [
  '🎬電影行事曆',
  '工作',
  '行事曆',
  'AI Assistant',
  '提醒事項 ⚠️',
];

// 這些行事曆的事件視為「佔用時間」，規劃時需避開
const BLOCK_CALENDARS = ['🎬電影行事曆', '工作', '行事曆', 'AI Assistant', '提醒事項 ⚠️'];

async function readAllCalendars() {
  const allEvents = [];
  for (const name of CALENDAR_NAMES) {
    try {
      const events = await readCalendarEvents(name);
      allEvents.push(...events.map(e => ({ ...e, calendar: name })));
    } catch (error) {
      console.warn(`  ⚠️ ${name} 讀取失敗:`, error.message);
    }
  }
  return allEvents;
}

async function getEventsForDate(date = new Date()) {
  const allEvents = await readAllCalendars();
  const dateStr = date.toISOString().split('T')[0];
  return allEvents
    .filter(e => e.start.toISOString().split('T')[0] === dateStr)
    .sort((a, b) => a.start - b.start);
}

async function getEventsForDateRange(startDate, endDate) {
  const allEvents = await readAllCalendars();
  return allEvents.filter(e => e.start >= startDate && e.start <= endDate);
}

async function findFreeSlots(date = new Date(), workStartHour = 8, workEndHour = 21) {
  const dayEvents = await getEventsForDate(date);
  const slots = [];
  let currentHour = workStartHour;
  const sortedEvents = dayEvents.sort((a, b) => a.start - b.start);

  for (const event of sortedEvents) {
    const eventHour = event.start.getHours();
    const eventEndHour = event.end.getHours();
    if (eventHour < workEndHour && eventEndHour > workStartHour) {
      if (eventHour > currentHour) {
        slots.push({
          start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), currentHour, 0),
          end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), eventHour, 0),
          duration: eventHour - currentHour,
        });
      }
      currentHour = Math.max(currentHour, eventEndHour);
    }
  }

  if (currentHour < workEndHour) {
    slots.push({
      start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), currentHour, 0),
      end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), workEndHour, 0),
      duration: workEndHour - currentHour,
    });
  }

  return slots;
}

module.exports = {
  readAllCalendars,
  getEventsForDate,
  getEventsForDateRange,
  findFreeSlots,
  BLOCK_CALENDARS,
};
