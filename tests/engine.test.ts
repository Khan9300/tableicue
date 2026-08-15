import { TableICueEngine, TournamentState } from '../src/lib/tournament/engine';
import { validateSkillCap, calculateStartingChips } from '../src/lib/tournament/handicap';

function runTests() {
  console.log('🧪 Starting Table i-Cue Engine Verification Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
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
  const mockState: TournamentState = {
    tournament: {
      id: 'tourney-test',
      name: 'Test Tournament',
      format: 'scotch_doubles_chip',
      game_type: '8_ball',
      max_skill_cap: 10,
      starting_chips_policy: 'handicap_matrix',
      venue_name: 'Lucky Cue Moorpark',
      status: 'in_progress',
      auto_pilot: true,
      created_at: new Date().toISOString(),
    },
    tables: [
      { id: 'tbl-1', tournament_id: 'tourney-test', table_number: 1, status: 'in_use', active_match_id: 'm-1' },
    ],
    teams: [
      {
        id: 't-1',
        tournament_id: 'tourney-test',
        team_name: 'Team Alpha',
        player_1_name: 'Player A1',
        player_2_name: 'Player A2',
        player_1_sl: 4,
        player_2_sl: 4,
        combined_sl: 8,
        starting_chips: 6,
        chips_remaining: 1, // 1 chip left (next loss eliminates)
        status: 'active',
      },
      {
        id: 't-2',
        tournament_id: 'tourney-test',
        team_name: 'Team Bravo',
        player_1_name: 'Player B1',
        player_2_name: 'Player B2',
        player_1_sl: 5,
        player_2_sl: 4,
        combined_sl: 9,
        starting_chips: 6,
        chips_remaining: 6,
        status: 'active',
      },
      {
        id: 't-3',
        tournament_id: 'tourney-test',
        team_name: 'Team Charlie',
        player_1_name: 'Player C1',
        player_2_name: 'Player C2',
        player_1_sl: 3,
        player_2_sl: 3,
        combined_sl: 6,
        starting_chips: 7,
        chips_remaining: 7,
        status: 'active',
      },
    ],
    matches: [
      {
        id: 'm-1',
        tournament_id: 'tourney-test',
        table_id: 'tbl-1',
        team_a_id: 't-1',
        team_b_id: 't-2',
        team_a_score: 0,
        team_b_score: 0,
        race_to: 1,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      },
    ],
    queue: [
      {
        id: 'q-1',
        tournament_id: 'tourney-test',
        team_id: 't-3',
        status: 'waiting',
        entered_queue_at: new Date().toISOString(),
      },
    ],
  };

  const engine = new TableICueEngine(mockState);

  // Complete match: Team Bravo (t-2) wins, Team Alpha (t-1) loses and reaches 0 chips -> eliminated
  const matchResult = engine.completeMatch('m-1', 't-2');
  const updatedState = engine.getState();

  const teamAlpha = updatedState.teams.find((t) => t.id === 't-1');
  const teamBravo = updatedState.teams.find((t) => t.id === 't-2');
  const table1 = updatedState.tables.find((tbl) => tbl.id === 'tbl-1');

  assert(matchResult.success, 'Match completion returns success');
  assert(teamAlpha?.status === 'eliminated' && teamAlpha?.chips_remaining === 0, 'Loser at 0 chips is marked eliminated');
  assert(teamBravo?.chips_remaining === 6, 'Winner retains full chip count');
  assert(table1?.status === 'in_use', 'Table remains in use with auto-pilot next challenger assignment');

  const newMatch = updatedState.matches.find((m) => m.id === table1?.active_match_id);
  assert(
    newMatch?.team_a_id === 't-2' && newMatch?.team_b_id === 't-3',
    'Auto-pilot queued Team Charlie (t-3) against reigning champion Team Bravo (t-2)'
  );

  console.log(`\n📊 Summary: ${passed}/${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All Table i-Cue engine tests verified successfully!');
  }
}

runTests();
