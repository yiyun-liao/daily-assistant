#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const isDelete = process.argv.includes('--delete');

function telegramAPI(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(params);
    const url = `https://api.telegram.org/bot${TOKEN}/${method}`;

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.ok) resolve(result.result);
        else reject(new Error(result.description));
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  if (isDelete) {
    await telegramAPI('deleteWebhook');
    console.log('✅ Webhook 已移除，可改回 polling 模式');
    return;
  }

  const url = process.argv[2];
  if (!url) {
    console.error('用法: node scripts/setup-webhook.js <VERCEL_URL>');
    console.error('例如: node scripts/setup-webhook.js https://daily-assistant.vercel.app/api/webhook');
    console.error('移除: node scripts/setup-webhook.js --delete');
    process.exit(1);
  }

  const secret = process.env.WEBHOOK_SECRET || '';

  await telegramAPI('deleteWebhook');

  const params = {
    url,
    allowed_updates: ['message'],
  };
  if (secret) params.secret_token = secret;

  const result = await telegramAPI('setWebhook', params);
  console.log('✅ Webhook 已設定:', url);
  if (secret) console.log('🔑 Secret token 已啟用');

  const info = await telegramAPI('getWebhookInfo');
  console.log('📋 Webhook 狀態:', JSON.stringify(info, null, 2));
}

main().catch(err => {
  console.error('❌ 設定失敗:', err.message);
  process.exit(1);
});
