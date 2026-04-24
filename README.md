# Daily Assistant

An AI-powered personal planning system that automates weekly/daily scheduling through Claude API, syncs with iCloud Calendar via CalDAV, and communicates through a Telegram bot.

## Problem

Manual time management doesn't scale when juggling multiple goals with different deadlines and priorities. Existing tools (Google Calendar, Notion) require constant manual input and don't adapt plans based on what's already on your calendar.

## Solution

A fully automated planning pipeline that:

1. **Reads** existing events from iCloud calendars (CalDAV protocol)
2. **Generates** conflict-free weekly/daily plans using Claude AI, respecting time slots and capacity limits
3. **Delivers** plans via Telegram and lets users confirm or adjust interactively
4. **Writes** confirmed plans back to a dedicated iCloud calendar

## How It Works

```
Sunday 12:00  ─→  Telegram reminder to update calendar
Sunday 21:55  ─→  AI weekly recap (reviews progress vs. plan)
Sunday 22:00  ─→  AI weekly plan → Telegram → user confirms → write to iCloud
Daily  08:00  ─→  AI pomodoro schedule for the day (based on weekly plan)
Anytime       ─→  Interactive Telegram bot for Q&A and goal editing
```

### Planning Rules

- Three time slots: morning (09:30-13:00), afternoon (14:00-17:00), evening (19:00-22:00)
- Never conflicts with existing calendar events
- Schedules 80% of available time, keeps 20% as buffer
- Higher priority tasks go to peak energy slots
- Daily plans use pomodoro technique (25min work + 5min rest)

## Architecture

```
src/
├── bot.js                          # Telegram polling bot (interactive)
├── lib/
│   ├── ai.js                       # Claude API wrapper + agent loader
│   ├── caldav.js                   # iCloud CalDAV read/write (raw HTTP)
│   ├── calendar.js                 # Calendar query layer
│   ├── goals.js                    # Goal/schedule utilities
│   └── telegram.js                 # Telegram API utilities
└── routines/
    ├── daily-planner.js            # Daily pomodoro generation
    ├── weekly-planner.js           # Weekly plan generation
    ├── weekly-planner-sync.js      # Sync confirmed plan → iCloud
    ├── weekly-recap.js             # Weekly progress recap
    └── sunday-noon-reminder.js     # Calendar update reminder

.claude/agents/                     # AI agent persona definitions (system prompts)
config/                             # User profile & goals (gitignored)
```

### AI Agents

Agent definitions live in `.claude/agents/` as Markdown files, loaded as system prompts at runtime. This separates prompt engineering from application logic.

- **Secretary** - Core agent. Weekly/daily planning, pomodoro scheduling, calendar-aware task allocation. All planning rules are defined here.
- **Career Coach** - Career advice and decision analysis.
- **Goal Editor** - Goal tracking via Telegram commands (`/goal review`, `/goal list`, mark tasks done).

### Key Design Decisions

- **CalDAV from scratch** - No SDK; raw HTTP requests to iCloud's CalDAV endpoint for full control over calendar read/write
- **Prompt centralization** - All AI behavior rules live in agent `.md` files, not scattered across JS. Routines only assemble data context.
- **Confirm-before-write** - Weekly plans are sent to Telegram for user review. Only written to calendar after explicit confirmation.
- **Graceful degradation** - If iCloud is unreachable (timeout after 15s), bot still responds without calendar data instead of hanging.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env`:
   ```
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_CHAT_ID=
   CLAUDE_API_KEY=
   ICAL_USER=
   ICAL_USER_ID=
   ICAL_PASSWORD=
   ICAL_CALENDAR_IDS={}
   ```

3. Create `config/user-profile.md` with your personal info and goals.

## Usage

```bash
npm run bot            # Start interactive Telegram bot
npm run daily-plan     # Generate today's pomodoro plan
npm run weekly-plan    # Generate next week's plan
npm run weekly-recap   # Generate this week's recap
npm run noon-reminder  # Send calendar update reminder
```

## Tech Stack

- **Node.js** - Runtime
- **Claude API** (Anthropic) - AI planning and responses
- **Telegram Bot API** - Messaging interface
- **CalDAV** (iCloud) - Calendar sync via raw HTTP
