const SUPABASE_URL = 'https://qpjannbvxpqqbvpclllq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwamFubmJ2eHBxcWJ2cGNsbGxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTAwODMsImV4cCI6MjEwMjEyNjA4M30.F0U4NmYvgoeSM3JvaSi_Ca-5V4KFB84MdugsDTYx5KU';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

async function testConnection() {
  console.log('🔌 Testing live Supabase connection (native fetch) to qpjannbvxpqqbvpclllq...\n');

  try {
    // 1. Query Simi Valley Players
    const playerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/simi_valley_players?name=ilike.*mendoza*&select=name,skill_level,team_name&limit=5`,
      { headers }
    );
    const players = await playerRes.json();
    console.log(`✅ [1/3] simi_valley_players response (${playerRes.status}): Found ${players.length} matching players:`);
    players.forEach(p => console.log(`   - ${p.name} (SL ${p.skill_level}) • ${p.team_name}`));

    // 2. Query Table i-Cue Tournaments
    const tourneyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tableicue_tournaments?select=id,name,venue_name,status&limit=1`,
      { headers }
    );
    const tourneys = await tourneyRes.json();
    console.log(`\n✅ [2/3] tableicue_tournaments response (${tourneyRes.status}):`, tourneys[0]?.name);

    // 3. Query Table i-Cue Tables
    const tablesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/tableicue_tables?select=table_number,label,status`,
      { headers }
    );
    const tables = await tablesRes.json();
    console.log(`\n✅ [3/3] tableicue_tables response (${tablesRes.status}): Found ${tables.length} active venue tables:`);
    tables.forEach(t => console.log(`   - Table ${t.table_number}: ${t.label} (${t.status})`));

    console.log('\n🎉 Live Supabase database connection verified successfully!');
  } catch (err) {
    console.error('💥 Connection test failed:', err);
  }
}

testConnection();
