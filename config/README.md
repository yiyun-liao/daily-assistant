# ⚙️ 配置系統

## 目錄結構

### 📁 `config/`
- **`user-profile.md`** - 用戶身份、職涯目標（靜態，偶爾改）
- **`README.md`** - 本說明文件

### 📁 `short-term-goal/`
存放**按時期**管理的短期目標，每個 JSON 檔案代表一個生命周期。

- **命名規則**: `YY-MM-brief-description.json`
- **系統行為**: 自動讀取字母順序**最新**的文件作為當前目標
- 範例:
  - `26-04-before-language-school.json` ← 當前激活
  - `26-05-language-school.json`
  - `26-06-after-language-school.json` ← 下一個（待建立）

### 📁 `goal_recap/`
系統自動輸出的規劃與回顧文件：
- `YYYY-W##-plan.md` - 每週規劃（週日 22:00 生成）
- `YYYY-MM-DD-daily-plan.md` - 每日細化計畫（每日 07:30 生成）
- `YYYY-W##-recap.md` - 週回顧模板（週日 21:50 生成）

---

## 📋 短期目標文件結構

```json
{
  "period": "2026-W16-W20 (4/18-5/16)",
  "description": "當前時期的描述",
  "start_date": "2026-04-18",
  "end_date": "2026-05-16",
  "priorities": [...],
  "fixed_events": [...],
  "notes": "說明"
}
```

### `priorities` 欄位

```json
{
  "rank": 1,
  "type": "daily|period|event|periodic",
  "name": "任務名稱",
  "duration": "每日 4 小時",
  "deadline": "2026-05-02",
  "reason": "為什麼這是優先級",
  "status": "進行中"
}
```

| type | 說明 | 額外欄位 |
|------|------|---------|
| `daily` | 需要每日進行 | — |
| `period` | 特定時期加強 | `period_start`, `period_end` |
| `periodic` | 定期但非每日 | `frequency` |
| `event` | 一次性事件 | `event_date` |

---

## 🔄 自動排程機制

| 時間 | 功能 | 輸入 | 輸出 |
|------|------|------|------|
| **每日 07:30** | 細化每日計畫 | 週規劃 + 行事曆 | `goal_recap/YYYY-MM-DD-daily-plan.md` + Telegram |
| **每日 08:00** | 每日簡報 | 短期目標 | Telegram 優先任務摘要 |
| **週日 21:50** | 週回顧模板 | 短期目標（動態） | `goal_recap/YYYY-W##-recap.md` |
| **週日 22:00** | 下週規劃 | 短期目標 + 行事曆 | `goal_recap/YYYY-W##-plan.md` + 日曆同步 |
| **週一 08:00** | iCloud 同步 | 固定事項 | iCloud「AI Assistant」日曆 |

---

## 📝 常用操作

### 更新任務狀態

直接編輯當前激活的目標文件：

```bash
nano short-term-goal/26-04-before-language-school.json
```

或通過 Telegram 使用 `/goal edit`。

### 建立新的短期目標

進入新時期時，透過 Telegram:
```
/goal new
```

或手動建立新 JSON 文件（系統會自動選擇最新的）。

### 標記任務完成

修改 `status` 欄位：

```json
{ "status": "已完成" }
```

---

## 🔗 讀取短期目標的模塊

| 模塊 | 功能 |
|------|------|
| `src/daily-planner.js` | 每日摘要（Telegram 08:00） |
| `src/daily-detailed-planner.js` | 每日細化計畫（07:30） |
| `src/weekly-planner.js` | 週規劃生成 |
| `src/weekly-recap.js` | 週回顧模板（動態讀取任務） |
| `src/goal-editor.js` | Telegram `/goal` 命令邏輯 |

---

## 🚨 故障排除

**JSON 格式驗證**:
```bash
jq . short-term-goal/26-04-before-language-school.json
```

**手動執行計畫**:
```bash
npm run daily-plan      # 生成今日細化計畫
npm run weekly-plan     # 生成下週規劃
npm run daily-priorities # 今日優先任務摘要
```
