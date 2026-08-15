---
name: tableicue-tournament-engine
description: >-
  Rules, mathematical models, and queue management algorithms for Table i-Cue
  billiards tournaments, including Scotch Doubles chip formats, APA Equalizer
  handicap caps, starting chip distributions, and SKIP LOCKED auto-pilot matchmaking.
---

# Table i-Cue Tournament Engine Skill

This skill provides the domain logic, handicapping rules, and state machine transitions for managing real-time pool tournaments in **Table i-Cue**.

---

## 1. Scotch Doubles Chip Tournament Rules

In a Scotch Doubles Chip Tournament (also known as a Survivor Tournament):
- **Format**: Teams of 2 alternate shots continuously within each game.
- **Starting Chips**: Teams receive virtual chips based on their combined APA Skill Level (SL).
- **Match Gameplay**: Single rack or short race.
- **Match Outcome**:
  - **Winner**: Retains their current chip count, remains on the physical table, and immediately plays the top team from the "Up Next" queue.
  - **Loser**: Deducts **1 chip** from their remaining balance and moves to the bottom of the "Up Next" queue.
- **Elimination**: When a team's chip count reaches `0`, they are marked as `eliminated`.
- **Tournament Winner**: The last surviving team with remaining chips.

---

## 2. APA Equalizer Handicap Rules & Caps

### Skill Level Caps
- **Max 10 Rule**: `SL(Player 1) + SL(Player 2) <= 10`
- **Max 12 Rule**: `SL(Player 1) + SL(Player 2) <= 12`
- **Validation**: Any team registration exceeding the tournament's configured `max_skill_cap` must be rejected immediately.

### Starting Chip Allocation Matrix
Default chip allocations based on combined handicap (e.g. 8-Ball / 9-Ball APA estimates):

| Combined Team SL | FargoRate Equiv | Starting Virtual Chips | Rationale |
| :--- | :--- | :--- | :--- |
| **Combined SL 4 - 5** | < 700 | **8 Chips** | Beginner buffer to survive variance |
| **Combined SL 6 - 7** | 701 - 900 | **7 Chips** | Novice/intermediate handicap buffer |
| **Combined SL 8 - 9** | 901 - 1000 | **6 Chips** | Median competitive tier |
| **Combined SL 10** | 1001 - 1200 | **5 Chips** | Advanced max-cap pairing |
| **Combined SL 11 - 12** | 1201+ | **4 Chips** | Elite tier handicap penalty |

---

## 3. Auto-Pilot State Machine & Queue Transition

### Concurrency-Safe Matchmaking
When a table opens or a match finishes:
1. The winning team stays locked to the table.
2. The next opponent is dequeued from `queue_state` atomically using PostgreSQL row locking:
   ```sql
   SELECT * FROM queue_state
   WHERE tournament_id = $1 AND status = 'waiting'
   ORDER BY entered_queue_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;
   ```
3. If no opponent is waiting, the table status switches to `idle_waiting_opponent`.
4. The losing team's chips are decremented (`chips_remaining = chips_remaining - 1`):
   - If `chips_remaining > 0`: Team is re-inserted at the end of `queue_state` (`status = 'waiting'`, `entered_queue_at = NOW()`).
   - If `chips_remaining == 0`: Team status is set to `'eliminated'`.

---

## 4. Director Manual Overrides
Tournament directors can perform out-of-band actions:
- Drag-and-drop match migration across physical tables.
- Manual chip adjustments (+/- chips) for disciplinary actions, slow-play penalties, or dispute resolutions.
- Pause/resume tournament or individual tables.
- Toggle between **Auto-Pilot Mode** (system auto-assigns next match) and **Manual Mode** (director assigns tables).
