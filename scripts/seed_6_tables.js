const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qpjannbvxpqqbvpclllq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwamFubmJ2eHBxcWJ2cGNsbGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTAwODMsImV4cCI6MjEwMjEyNjA4M30.F0U4NmYvgoeSM3JvaSi_Ca-5V4KFB84MdugsDTYx5KU';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function seed6Tables() {
  console.log('Seeding 6 tables for Lucky Cue Moorpark CA into Supabase...');

  const tournamentId = 'a0000000-0000-0000-0000-000000000001';

  // Seed Tables 5 and 6
  const tablesToSeed = [
    { id: 'b0000000-0000-0000-0000-000000000005', tournament_id: tournamentId, table_number: 5, label: 'Diamond 9ft (Back 5)', status: 'open' },
    { id: 'b0000000-0000-0000-0000-000000000006', tournament_id: tournamentId, table_number: 6, label: 'Diamond 9ft (Back 6)', status: 'open' },
  ];

  for (const tbl of tablesToSeed) {
    const { error } = await supabase.from('tableicue_tables').upsert(tbl, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting Table ${tbl.table_number}:`, error);
    } else {
      console.log(`✅ Table ${tbl.table_number} (${tbl.label}) seeded.`);
    }
  }

  const { data: allTables } = await supabase.from('tableicue_tables').select('table_number, label, status');
  console.log('Active Venue Tables in Live Supabase:', allTables);
}

seed6Tables();
