# Telegram Bot 設置指南

## 功能概覽

系統有兩個 Telegram 功能：

### 1. 自動推送（Daily Briefing）✅ 已設置
- **何時**: 每天 08:00、周日 12:00/22:00
- **功能**: 自動發送每日規劃和週回顧
- **狀態**: 已通過 5 個 remote triggers 運行

### 2. 交互式 Bot（Interactive Polling）🔧 需啟動
- **功能**: 回應 `/secretary` 和 `/career-coach` 命令
- **方式**: Polling（無需公網 URL）
- **反應時間**: ~1-2 秒

---

## 啟動交互式 Bot

### 本地運行（開發模式）

```bash
npm run bot
```

或

```bash
node src/telegram-polling.js
```

### 持續運行（推薦）

使用 npm package `pm2` 或 `forever` 來保持 bot 運行：

```bash
# 安裝 pm2
npm install -g pm2

# 啟動 bot（後台運行）
pm2 start src/telegram-polling.js --name telegram-bot

# 查看狀態
pm2 status

# 查看日誌
pm2 logs telegram-bot

# 停止 bot
pm2 stop telegram-bot
```

### 使用 Remote Trigger（自動化）

創建一個長期運行的 remote trigger：

```bash
# 此功能需要手動配置，或聯繫系統管理員
# trigger 需要支持 persist_session 和長時間運行
```

---

## 使用方式

### 在 Telegram 中

1. **秘書（時間管理）**
   ```
   /secretary 我今天該做什麼？
   /secretary 今天有什麼安排？
   或直接問: 我今天要做什麼？
   ```

2. **職涯教練（人生建議）**
   ```
   /career-coach 我應該去宿霧嗎？
   /career-coach 對於年薪目標的建議？
   或直接問: 我對職涯很迷茫...
   ```

3. **自然語言**
   系統會自動判斷使用哪個 agent：
   - 關鍵詞: "時間"、"今天"、"安排" → 秘書
   - 關鍵詞: "職涯"、"決定"、"人生" → 職涯教練

---

## 故障排除

### Bot 無反應

1. **檢查是否運行**
   ```bash
   npm run bot
   ```
   應該看到: `🚀 Telegram Polling Bot 已啟動`

2. **檢查環境變數**
   ```bash
   cat .env | grep TELEGRAM
   ```
   確認 `TELEGRAM_BOT_TOKEN` 和 `CLAUDE_API_KEY` 存在

3. **檢查 Telegram Bot Token 有效性**
   - 訪問 @BotFather 重新確認 token
   - 確認 bot 未被禁用

### 無法取得消息

1. **Polling 可能太慢**
   - Polling 模式有 1-2 秒延遲
   - 如果需要更快，使用 webhook（需要公網 URL）

2. **API 速率限制**
   - Telegram 有 API 限制
   - 不要過於頻繁的請求

---

## 配置文件

相關配置已存儲在：
- `.env` - Telegram token 和 API keys
- `config/user-profile.md` - 用戶信息（agents 會讀取）
- `config/current-goals.json` - 動態目標和優先級

更新 `config/current-goals.json` 後，bot 會自動使用新配置。

---

## 成本

- **Telegram API**: 免費
- **Claude API**: 按使用量計費（~$0.003 per message）
- 建議監控 API 使用量

---

## 下一步

1. 啟動 polling bot: `npm run bot`
2. 在 Telegram 中測試: `/secretary 我今天要做什麼？`
3. 設置持續運行（使用 pm2 或類似工具）
4. 監控日誌確保正常運作
