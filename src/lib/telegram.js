const https = require('https');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendMessage(message, parseMode = 'HTML', chatId = TELEGRAM_CHAT_ID) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`Telegram API returned ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getUpdates(offset = 0, timeout = 30) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=${timeout}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.ok) {
            resolve(response.result || []);
          } else {
            reject(new Error(`Telegram API error: ${response.description}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

module.exports = { sendMessage, getUpdates, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID };
