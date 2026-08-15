---
name: apa-scraper-sync
description: >-
  Playwright scraping workflow, Railway cron deployment guidelines,
  and Supabase synchronization pipelines for APA League data, team standings,
  and Simi Valley / South Coast player rosters.
---

# APA Scraper & Supabase Sync Skill

This skill documents the automated data extraction and synchronization architecture for pulling live South Coast APA data into the centralized Supabase database layer.

---

## 1. Architecture Overview

- **Service**: `tableicue-scraper` / `rackiq-scraper`
- **Execution**: Headless Playwright (Chromium) containerized on Railway
- **Cron Schedule**: Daily @ 5:00 PM PST (`0 17 * * *`)
- **Central Storage**: Supabase Postgres (`apa_players`, `apa_teams`, `apa_standings`, `simi_valley_players`, `scrape_logs`)

```
[APA Member Portal] ──(Playwright)──> [Railway Scraper] ──(Supabase REST / Service Key)──> [Supabase DB]
                                                                                                  │
                                                                                [Table i-Cue Autocomplete & Cache]
```

---

## 2. Scraping Flow & Credentials

### Environment Variables
- `APA_LOGIN_EMAIL`: APA member login email (e.g. `Fahad9300@gmail.com`)
- `APA_PASSWORD`: APA member password
- `SUPABASE_URL`: `https://qpjannbvxpqqbvpclllq.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key with write permissions to public tables.

### Playwright Steps
1. **Authentication**:
   - Navigate to `https://members.poolplayers.com/login` (or league portal).
   - Fill credentials, click submit, and wait for navigation / auth token cookie.
2. **Data Extraction**:
   - South Coast APA Divisions (Simi Valley, Moorpark, Thousand Oaks, Ventura).
   - Roster lists: Player Name, Member ID, 8-Ball SL (2-7), 9-Ball SL (1-9), Home Venue.
   - Team Standings: Division ID, Team Name, Points, Matches Played, Roster list.
3. **Resilient Supabase Upserts**:
   - Perform batch upserts using `onConflict: 'member_id'` or `onConflict: 'id'`.
   - Log execution timestamps, items synced, and error statuses to `scrape_logs`.

---

## 3. Database Sync & Autocomplete Performance

To ensure sub-10ms autocomplete when tournament directors type player names:
- Keep `simi_valley_players` and `apa_players` indexed on `first_name`, `last_name`, `full_name`, and `member_id`.
- Table i-Cue clients query the local Supabase cache rather than hitting external APA APIs during live events.
