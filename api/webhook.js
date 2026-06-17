const { handleMessage, checkPendingCalendarSync, handleGoalCommand, generateResponse, determineAgentType } = require('../src/bot');
const { sendMessage } = require('../src/lib/telegram');

let lastProcessedUpdateId = 0;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const update = req.body;

  if (!update || !update.message) {
    return res.status(200).json({ ok: true });
  }

  if (update.update_id <= lastProcessedUpdateId) {
    return res.status(200).json({ ok: true, skipped: 'duplicate' });
  }
  lastProcessedUpdateId = update.update_id;

  const chatId = String(update.message.chat.id);
  if (process.env.TELEGRAM_CHAT_ID && chatId !== process.env.TELEGRAM_CHAT_ID) {
    return res.status(200).json({ ok: true, skipped: 'unauthorized' });
  }

  try {
    await handleMessage(update.message);
  } catch (error) {
    console.error('❌ Webhook handleMessage error:', error.message);
    try {
      await sendMessage('⚠️ 處理訊息時發生錯誤，請稍後再試。', 'HTML', chatId);
    } catch {}
  }

  return res.status(200).json({ ok: true });
};
