# 🎱 Table i-Cue (`tableicue`)

**Table i-Cue** is a real-time, dark-mode billiards tournament management platform and environmental display designed specifically for Friday night Scotch Doubles chip survivor tournaments, APA Equalizer handicap validation, and live Simi Valley / South Coast APA league integration.

---

## 🌟 Key Features

- **🏆 Scotch Doubles Chip Tournament Engine**:
  - APA Equalizer handicap calculation and Max 10/12 team cap enforcement.
  - Automatic virtual chip starting allocations based on combined skill levels.
  - Auto-pilot matchmaking state machine with `FOR UPDATE SKIP LOCKED` PostgreSQL concurrency to automatically feed open tables from the waiting queue.
- **📺 3-Column TV Broadcast Mode**:
  - High-contrast 4K/1080p environmental display designed for low-light pool halls.
  - Left: Active tables & live matches.
  - Center: "Up Next" queue lineup.
  - Right: Surviving team chip leaderboard & elimination tracking.
- **📱 Live Mobile Scoreboard & Animated Flip Counter**:
  - Big tap-target mechanical flip counter digits with haptic feedback.
  - Interactive virtual chip representations with loss/shatter animations.
  - Zero-dependency Web Audio synthesized sound effects (flip clicks, cue ball strikes, chip lost tones, victory chimes).
- **📋 Simi Valley APA League Directory**:
  - Searchable directory of all 399 live Simi Valley APA players with real-time win rates, skill levels, and team affiliations.
  - Sub-10ms typeahead autocomplete during tournament registration.
- **🔄 Centralized APA Scraper (Railway Cron)**:
  - Containerized Playwright headless browser scheduled daily at 5:00 PM PST (`0 17 * * *`) on Railway to sync rosters and standings into Supabase.
- **⚡ Offline-First Resilience ("The Pool Hall Protocol")**:
  - Queues all state mutations locally in offline storage during cell/WiFi drops in thick brick pool halls and flushes upon reconnection.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, Web Audio API
- **Backend / Database**: Supabase PostgreSQL + Realtime WebSockets
- **Scraper / ETL**: Node.js, TypeScript, Playwright (Headless Chromium), Docker, Railway Cron
- **Autonomous Agent Customizations**: Google Antigravity Skills (`.agents/skills/`)

---

## 🚀 Quick Start

### 1. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```

Ensure your Supabase project keys are set:
```env
NEXT_PUBLIC_SUPABASE_URL=https://qpjannbvxpqqbvpclllq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Table i-Cue portal.

### 3. Run Test Suite
```bash
node tests/engine.test.js
```

---

## 📦 Scraper Deployment (Railway)
The scraper is located in `tableicue-scraper/` and includes a `Dockerfile` and `railway.json`.
Deploy to Railway as a daily cron job (`0 17 * * *`).

---

## 📜 License
MIT © Table i-Cue
