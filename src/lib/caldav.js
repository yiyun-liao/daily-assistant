const https = require('https');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const ICAL_USER = process.env.ICAL_USER;
const ICAL_PASSWORD = process.env.ICAL_PASSWORD;
const ICAL_USER_ID = process.env.ICAL_USER_ID;
const CALDAV_BASE = 'https://caldav.icloud.com';

const CALENDAR_ID_MAP = JSON.parse(process.env.ICAL_CALENDAR_IDS || '{}');

function getAuth() {
  return Buffer.from(`${ICAL_USER}:${ICAL_PASSWORD}`).toString('base64');
}

function formatDate(date) {
  if (typeof date === 'string') date = new Date(date);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function parseICalDate(dateStr) {
  if (dateStr.includes('T')) {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    const isUTC = dateStr.endsWith('Z');
    let date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${isUTC ? 'Z' : ''}`);
    if (isUTC) date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return date;
  }
  return new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`);
}

function parseICalEvent(icalData) {
  if (!icalData) return null;
  const event = {};
  const summaryMatch = icalData.match(/SUMMARY:([^\r\n]+)/);
  event.title = summaryMatch ? summaryMatch[1] : 'Untitled';
  const startMatch = icalData.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/);
  if (startMatch) event.start = parseICalDate(startMatch[1]);
  const endMatch = icalData.match(/DTEND(?:;[^:]*)?:([^\r\n]+)/);
  if (endMatch) event.end = parseICalDate(endMatch[1]);
  const descMatch = icalData.match(/DESCRIPTION:([^\r\n]+)/);
  event.description = descMatch ? descMatch[1] : '';
  const locMatch = icalData.match(/LOCATION:([^\r\n]+)/);
  event.location = locMatch ? locMatch[1] : '';
  return event.start && event.end ? event : null;
}

function generateICalEvent(event) {
  const uid = uuidv4();
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Assistant//Daily Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}@icloud.com
DTSTAMP:${now}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${escapeICalText(event.title)}
DESCRIPTION:${escapeICalText(event.description || '')}
${event.location ? `LOCATION:${escapeICalText(event.location)}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}

function extractEventUrls(xmlData) {
  const urls = [];
  const urlPattern = /<(?:D:)?href>([^<]+)<\/(?:D:)?href>/g;
  let match;
  while ((match = urlPattern.exec(xmlData)) !== null) {
    if (match[1].endsWith('.ics')) {
      urls.push(`${CALDAV_BASE}${match[1]}`);
    }
  }
  return urls;
}

function fetchEventDetails(eventUrl) {
  return new Promise((resolve, reject) => {
    const req = https.request(eventUrl, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${getAuth()}` },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(res.statusCode === 200 ? data : ''));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function readCalendarEvents(calendarName) {
  return new Promise((resolve, reject) => {
    const calendarId = CALENDAR_ID_MAP[calendarName] || calendarName;
    const calendarUrl = `${CALDAV_BASE}/${ICAL_USER_ID}/calendars/${calendarId}/`;

    const requestBody = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:CS="http://calendarserver.org/ns/">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <CS:getctag/>
  </D:prop>
</D:propfind>`;

    const req = https.request(calendarUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${getAuth()}`,
        'Depth': '1',
        'Content-Type': 'application/xml; charset="utf-8"',
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const eventUrls = extractEventUrls(data);
          if (eventUrls.length === 0) return resolve([]);
          Promise.all(eventUrls.map(fetchEventDetails))
            .then(events => {
              resolve(events.map(parseICalEvent).filter(Boolean));
            })
            .catch(reject);
        } else {
          resolve([]);
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('PROPFIND timeout')); });
    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

function putEvent(event, calendarName = 'AI Assistant') {
  return new Promise((resolve, reject) => {
    const calendarId = CALENDAR_ID_MAP[calendarName] || calendarName;
    const eventUrl = `${CALDAV_BASE}/${ICAL_USER_ID}/calendars/${calendarId}/${event.id || uuidv4()}.ics`;
    const icalData = generateICalEvent(event);

    const req = https.request(eventUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${getAuth()}`,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Length': Buffer.byteLength(icalData),
      },
      timeout: 15000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          reject(new Error(`CalDAV PUT failed: ${res.statusCode}`));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('PUT timeout')); });
    req.on('error', reject);
    req.write(icalData);
    req.end();
  });
}

async function putEvents(events, calendarName = 'AI Assistant') {
  const results = await Promise.allSettled(events.map(e => putEvent(e, calendarName)));
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return { successful, failed };
}

module.exports = {
  readCalendarEvents,
  putEvent,
  putEvents,
  parseICalDate,
  parseICalEvent,
  formatDate,
  CALENDAR_ID_MAP,
};
