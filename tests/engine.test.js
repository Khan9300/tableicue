// Standalone JS verification of Table i-Cue Tournament Engine Logic

function validateSkillCap(player1SL, player2SL, maxCap = 10) {
  const combinedSL = player1SL + player2SL;
  if (combinedSL > maxCap) {
    return {
      valid: false,
      combinedSL,
      error: `Combined Skill Level of ${combinedSL} exceeds the tournament cap of Max ${maxCap}.`,
    };
  }
  return { valid: true, combinedSL };
}

function calculateStartingChips(combinedSL, policy = 'handicap_matrix', defaultChips = 6) {
  if (policy === 'equal') return defaultChips;
  if (combinedSL <= 5) return 8;
  if (combinedSL <= 7) return 7;
  if (combinedSL <= 9) return 6;
  if (combinedSL === 10) return 5;
  return 4;
}

class TableICueEngine {
  constructor(initialState) {
    this.state = JSON.parse(JSON.stringify(initialState));
  }
  getState() {
    return this.state;
  }
  completeMatch(matchId, winnerTeamId) {
    const match = this.state.matches.find((m) => m.id === matchId);
    if (!match) return { success: false, error: 'Match not found' };

    const loserTeamId = match.team_a_id === winnerTeamId ? match.team_b_id : match.team_a_id;
    const loserTeam = this.state.teams.find((t) => t.id === loserTeamId);
    const winnerTeam = this.state.teams.find((t) => t.id === winnerTeamId);

    match.status = 'completed';
    match.winner_team_id = winnerTeamId;
    match.loser_team_id = loserTeamId;

    loserTeam.chips_remaining = Math.max(0, loserTeam.chips_remaining - 1);
    if (loserTeam.chips_remaining === 0) {
      loserTeam.status = 'eliminated';
    } else {
      this.state.queue.push({
        id: `queue_${Date.now()}`,
        tournament_id: this.state.tournament.id,
        team_id: loserTeam.id,
        status: 'waiting',
      });
    }

    const table = this.state.tables.find((tbl) => tbl.id === match.table_id);
    let newMatch;

    if (table && this.state.tournament.auto_pilot) {
      const nextIdx = this.state.queue.findIndex((q) => q.status === 'waiting');
      if (nextIdx !== -1) {
        const nextTeam = this.state.queue.splice(nextIdx, 1)[0];
        newMatch = {
          id: `match_${Date.now()}`,
          tournament_id: this.state.tournament.id,
          table_id: table.id,
          team_a_id: winnerTeam.id,
          team_b_id: nextTeam.team_id,
          status: 'in_progress',
        };
        this.state.matches.push(newMatch);
        table.active_match_id = newMatch.id;
        table.status = 'in_use';
      }
    }

    return { success: true, newMatch };
  }
}

function runTests() {
  console.log('🧪 Starting Table i-Cue Engine Verification Tests (Node JS)...\n');
  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
    }
  }

  // 1. Handicap & Max Cap Tests
  const validCap = validateSkillCap(5, 4, 10);
  assert(validCap.valid && validCap.combinedSL === 9, 'Valid Scotch Doubles team under Max 10 cap');

  const invalidCap = validateSkillCap(6, 5, 10);
  assert(!invalidCap.valid && invalidCap.combinedSL === 11, 'Enforce Max 10 cap (reject combined SL 11)');

  // 2. Chip Allocation Matrix Tests
  assert(calculateStartingChips(5) === 8, 'Combined SL <= 5 receives 8 starting chips');
  assert(calculateStartingChips(7) === 7, 'Combined SL 6-7 receives 7 starting chips');
  assert(calculateStartingChips(9) === 6, 'Combined SL 8-9 receives 6 starting chips');
  assert(calculateStartingChips(10) === 5, 'Combined SL 10 receives 5 starting chips');

  // 3. State Machine & Match Resolution Tests
  const mockState = {
    tournament: {
      id: 'tourney-test',
      name: 'Test Tournament',
      max_skill_cap: 10,
      auto_pilot: true,
    },
    tables: [
      { id: 'tbl-1', table_number: 1, status: 'in_use', active_match_id: 'm-1' },
    ],
    teams: [
      { id: 't-1', team_name: 'Team Alpha', chips_remaining: 1, status: 'active' },
      { id: 't-2', team_name: 'Team Bravo', chips_remaining: 6, status: 'active' },
      { id: 't-3', team_name: 'Team Charlie', chips_remaining: 7, status: 'active' },
    ],
    matches: [
      { id: 'm-1', table_id: 'tbl-1', team_a_id: 't-1', team_b_id: 't-2', status: 'in_progress' },
    ],
    queue: [
      { id: 'q-1', team_id: 't-3', status: 'waiting' },
    ],
  };

  const engine = new TableICueEngine(mockState);
  const matchResult = engine.completeMatch('m-1', 't-2');
  const updatedState = engine.getState();

  const teamAlpha = updatedState.teams.find((t) => t.id === 't-1');
  const teamBravo = updatedState.teams.find((t) => t.id === 't-2');
  const table1 = updatedState.tables.find((tbl) => tbl.id === 'tbl-1');

  assert(matchResult.success, 'Match completion returns success');
  assert(teamAlpha.status === 'eliminated' && teamAlpha.chips_remaining === 0, 'Loser at 0 chips is marked eliminated');
  assert(teamBravo.chips_remaining === 6, 'Winner retains full chip count');
  assert(table1.status === 'in_use', 'Table remains in use with auto-pilot next challenger assignment');

  const newMatch = updatedState.matches.find((m) => m.id === table1.active_match_id);
  assert(
    newMatch.team_a_id === 't-2' && newMatch.team_b_id === 't-3',
    'Auto-pilot queued Team Charlie (t-3) against reigning champion Team Bravo (t-2)'
  );

  console.log(`\n📊 Summary: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All Table i-Cue engine tests verified successfully!');
  }
}

runTests();
