# 📅 Daily Assistant - 日常管理系統

一個為前端工程師設計的 **完整日常規劃系統**，集成 Telegram、iCloud Calendar、番茄鐘規劃和職涯指導。

## 👤 用戶資料

詳見 **[config/user-profile.md](config/user-profile.md)**

快速摘要：
- 🎯 **身份**: 前端工程師 (6 個月經驗)
- 💰 **目標年薪**: 120 萬
- ✈️ **當前項目**: 宿霧語言留學準備 (5/3-6/3)
- ⏰ **重要截止**: 4/27 面試、5/3 出發

---

## 🤖 核心功能

### 1️⃣ 自動化規劃系統

| 時間 | 觸發器 | 功能 |
|------|--------|------|
| **每天 08:00** | Daily Telegram Briefing | 當日規劃 (番茄鐘方式) |
| **周日 12:00** | Sunday Noon Reminder | 行事曆更新提醒 |
| **周日 22:00** | Sunday 10PM Weekly Plan | 下週規劃 + Telegram 討論 |
| **周一 08:00** | Weekly iCloud Sync | 同步至 iCloud「AI Assistant」日歷 |

### 2️⃣ AI Agents

**秘書角色** - 時間管理、PM、費用規劃
- 根據優先級安排任務
- Token 有限意識強
- 考慮用戶身心狀態

**職涯導師角色** - 人生規劃建議
- 中立的職涯決策分析
- 目標年薪 120 萬的路線規劃
- 技能發展建議

### 3️⃣ 規劃特色

✅ **番茄鐘方式**
- 25 分鐘工作 + 5 分鐘短休息
- 4 個番茄鐘後 15-20 分鐘長休息
- 保留彈性和準備時間

✅ **日程保護**
- 避開已有計劃 (wehelp、說明會、面試等)
- 可讀取其他日歷但只編輯「AI Assistant」日歷
- 智慧地安排新事項

✅ **互動討論**
- 每日早上可微調當天規劃
- 周日晚上可討論和調整下週計劃
- 用戶反饋自動記錄到記憶系統

---

## 📁 項目結構

```
daily-assistant/
├── README.md                 # 項目總覽
├── USER_PROFILE.md          # 用戶資料、目標、時間線
├── .gitignore               # 敏感文件排除
├── .env                      # 環境變數 (敏感，已 gitignore)
├── package.json             # Node.js 依賴
├── src/
│   ├── daily-planner.js     # 規劃引擎 (當日/週規劃)
│   ├── telegram-bot.js      # Telegram 整合
│   └── caldav-sync.js       # iCloud CalDAV 同步
├── calendar/
│   ├── 工作.ics            # 工作行事曆
│   ├── 行事曆.ics          # 個人行事曆
│   └── 宿霧留學計劃.md     # 宿霧詳細計劃
├── .claude/
│   ├── agents/              # AI 子代理定義
│   │   ├── secretary.md     # 秘書 Agent
│   │   └── career-coach.md  # 職涯導師 Agent
│   ├── commands/            # 自訂命令
│   │   └── daily-briefing.md
│   ├── hooks/               # 自動化觸發器
│   ├── rules/               # 行為規範
│   └── skills/              # 進階工作腳本
└── memory/                   # 記憶系統 (持久化)
    ├── MEMORY.md            # 記憶索引
    ├── user_role.md         # 用戶身份
    ├── career_goals.md      # 職涯目標
    ├── project_cebu_study.md # 宿霧項目
    └── planning_system.md   # 規劃系統偏好
```

---

## 🚀 使用方式

### 啟動系統

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **設置環境變數** (.env)
   ```
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_chat_id
   CLAUDE_API_KEY=your_api_key
   ICAL_PASSWORD=your_icloud_password
   ```

3. **查看今日規劃**
   ```bash
   node src/daily-planner.js
   ```

4. **查看本週規劃**
   ```bash
   node src/daily-planner.js --weekly
   ```

### Telegram 互動

- **每天早上 08:00** - 接收當日規劃
  - 在 Telegram 回覆調整需求
  - 例：「今天想多花時間在 XXX」

- **周日中午 12:00** - 收到行事曆更新提醒
  - 告訴系統下週有什麼新計劃

- **周日晚上 22:00** - 收到下週規劃
  - 討論和確認下週安排
  - 提出優先級調整

---

## 📊 優先級順序

```
⭐⭐⭐ 完成代碼 Repo (Token 優先)
⭐⭐⭐ 面試準備 (4/27 截止)
⭐⭐ 雅思練習 (持續進行)
⭐⭐ PADI & 行李準備 (5/2 前)
⭐ 回家探親 (4/28-4/30)
```

---

## 🎯 短期目標 (4/18 - 5/3)

### 關鍵日期
- **4/19**: Do wehelp
- **4/21**: 宿霧課程說明會
- **4/27**: ⚡ **面試日期**
- **4/28-4/30**: 回家探親 2.5 天
- **5/3**: ✈️ 出發宿霧

### 必須完成
1. ✅ 完成代碼 Repo
2. ✅ 面試準備 & 通過
3. ✅ 雅思開始練習
4. ✅ PADI eLearning
5. ✅ 行李準備

---

## 📱 遠程代理 (Triggers)

所有代理已配置在 Claude Code 中，自動執行：

| Trigger ID | 名稱 | 狀態 |
|-----------|------|------|
| `trig_01UcnHDuph6sKU93texLBkLf` | Daily Telegram Briefing | ✅ 啟用 |
| `trig_01AZdGbdfmSdXBEQpbUDGC5M` | Sunday Noon Reminder | ✅ 啟用 |
| `trig_01SudHgHJcwsBBk2NWx8WZdp` | Sunday 10PM Weekly Plan | ✅ 啟用 |
| `trig_01CBA9RTEagoy94ZL6yfLwbt` | Weekly iCloud Sync | ✅ 啟用 |

管理地址: https://claude.ai/code/scheduled

---

## 💾 記憶系統

所有用戶反饋和目標自動記錄到 `memory/` 目錄，用於：
- 長期目標追踪
- 優先級調整
- 職涯決策參考

詳見 `memory/MEMORY.md`

---

## 🔐 安全性

- ✅ `.gitignore` 排除敏感文件 (.env、node_modules 等)
- ✅ iCloud Calendar 只編輯「AI Assistant」日歷
- ✅ Telegram token 和 iCloud 密碼存放在 .env (不版控)
- ✅ Claude API key 安全存放

---

## 📈 效果預期

### 日常層面
- 每天清晨知道優先任務
- 隨時可微調日程
- 自動避開已有計劃

### 周層面
- 每周日獲得完整規劃
- 與秘書討論和優化
- 自動同步到 iCloud

### 月層面
- 追踪進度和完成度
- 調整優先級
- 職涯決策支持

---

## 🛠️ 技術棧

- **Node.js** - 後端運行時
- **Telegram API** - 消息推送
- **CalDAV** - iCloud 日歷同步
- **Claude API** - AI 規劃和決策
- **Git** - 版本控制

---

## 📞 聯絡方式

- 💬 **Telegram** - 日常簽到和討論
- 📅 **iCloud Calendar** - 日程同步
- 🧠 **Memory System** - 目標記錄
- 📊 **USER_PROFILE.md** - 用戶資訊

---

## 📝 更新日誌

- **2026-04-18** - 系統初始化完成
  - ✅ Telegram 自動化
  - ✅ iCloud CalDAV 同步
  - ✅ 番茄鐘規劃
  - ✅ AI Agents (秘書 & 職涯導師)
  - ✅ 記憶系統
  - ✅ 用戶資訊整理

---

**準備好開始了嗎？** 🚀

明天早上 8:00 接收第一條 Telegram 簽到！
