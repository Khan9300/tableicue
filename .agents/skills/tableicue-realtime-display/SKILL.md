---
name: tableicue-realtime-display
description: >-
  Visual design system, 3-column TV Broadcast environmental display guidelines,
  animated flip counter components, and Supabase Realtime subscription patterns
  for Table i-Cue.
---

# Table i-Cue Real-Time Display & TV Broadcast Skill

This skill provides the visual hierarchy, broadcast layouts, and real-time state synchronization standards for **Table i-Cue**.

---

## 1. High-Contrast Dark Mode Color Tokens

Engineered specifically for low-light pool hall environments:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Surface Base** | `#121212` | Main background for mobile, desktop, and TV interfaces |
| **Surface Elevated** | `#1A1A1A` | Cards, table containers, and modal surfaces |
| **Surface Pure Dark** | `#000000` | Backdrop overlays and deep structural separators |
| **Primary Highlight** | `#12B5CB` | Active matches, table numbers, primary CTAs |
| **Secondary Highlight** | `#F538A0` | Virtual chips, win counters, leaderboard rank badges |
| **Alert / Danger** | `#D93025` | Disciplinary flags, elimination states, table maintenance |
| **Text Primary** | `#FFFFFF` | Player names, match scores, queue headers |
| **Text Muted** | `#A0A0A0` | Timestamps, subtitles, handicap labels |

---

## 2. 3-Column TV Broadcast Layout

Optimized for 1080p and 4K displays mounted in pool halls:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     ACTIVE MATCHES      │      UP NEXT QUEUE      │    CHIP LEADERBOARD     │
│   (Table Assignments)   │    (Waiting Lineup)     │  (Surviving Teams/Rank) │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ Table 1: Team A vs B    │ #1. Team Alpha (6 Chips)│ 1. Team Strike (8 Chips)│
│ Table 2: Team C vs D    │ #2. Team Beta  (4 Chips)│ 2. Team Apex   (7 Chips)│
│ Table 3: Team E vs F    │ #3. Team Nova  (5 Chips)│ 3. Team Echo   (6 Chips)│
│ ...                     │ ...                     │ ...                     │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Realtime Subscription Pattern
Subscribe to table and match changes using Supabase Realtime:
```typescript
const channel = supabase
  .channel(`tournament:${tournamentId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, handleMatchUpdate)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_state' }, handleQueueUpdate)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, handleTeamUpdate)
  .subscribe();
```

---

## 3. Mobile Scoreboard & Animated Flip Counter
- Big tap targets for mobile scoring in dimly lit venues.
- Mechanical flip digit animations with haptic feedback when points/racks are registered.
- Interactive virtual chip display with shatter/fade animations upon match loss.
