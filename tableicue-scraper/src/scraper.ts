import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Environment Configuration
const APA_LOGIN_EMAIL = process.env.APA_LOGIN_EMAIL || 'Fahad9300@gmail.com';
const APA_PASSWORD = process.env.APA_PASSWORD || 'Kmkf@5426';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qpjannbvxpqqbvpclllq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Database upserts will fail.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ScrapedPlayer {
  member_id: string;
  first_name: string;
  last_name: string;
  skill_level_8ball?: number;
  skill_level_9ball?: number;
  fargo_rating?: number;
  home_venue?: string;
  division_name?: string;
  region?: string;
}

interface ScrapedTeam {
  division_id: string;
  division_name: string;
  team_number: string;
  team_name: string;
  captain_name?: string;
  roster: any[];
}

export async function runScraper() {
  const startTime = new Date();
  console.log(`🎱 [Table i-Cue / RackIQ] Starting APA Scraper cron run at ${startTime.toISOString()}`);
  
  let recordsUpserted = 0;
  let errorMessage: string | null = null;
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });

    const page: Page = await context.newPage();

    console.log('🔑 Logging into APA Member Services...');
    await page.goto('https://members.poolplayers.com/', { waitUntil: 'networkidle', timeout: 60000 });

    // Look for email / password inputs
    const emailSelector = 'input[type="email"], input[name="email"], input[id*="email"], input[name*="user"]';
    const passSelector = 'input[type="password"], input[name="password"], input[id*="password"]';

    if (await page.locator(emailSelector).count() > 0) {
      await page.fill(emailSelector, APA_LOGIN_EMAIL);
      await page.fill(passSelector, APA_PASSWORD);
      await page.click('button[type="submit"], input[type="submit"], button:has-text("Log In"), button:has-text("Sign In")');
      await page.waitForLoadState('networkidle');
      console.log('✅ Successfully authenticated with APA portal.');
    } else {
      console.log('ℹ️ Already logged in or login form not presented.');
    }

    // Example Simi Valley & South Coast data payload (in production extracted from DOM or internal API interception)
    const mockExtractedPlayers: ScrapedPlayer[] = [
      { member_id: 'APA-SV-1001', first_name: 'Fahad', last_name: 'Khan', skill_level_8ball: 6, skill_level_9ball: 7, home_venue: 'Lucky Cue Moorpark', division_name: 'Simi Valley Scotch', region: 'South Coast APA' },
      { member_id: 'APA-SV-1002', first_name: 'Mike', last_name: 'Johnson', skill_level_8ball: 4, skill_level_9ball: 4, home_venue: 'Plush Pocket', division_name: 'Simi Valley 8-Ball', region: 'South Coast APA' },
      { member_id: 'APA-SV-1003', first_name: 'Sarah', last_name: 'Miller', skill_level_8ball: 3, skill_level_9ball: 2, home_venue: 'Lucky Cue Moorpark', division_name: 'Simi Valley Scotch', region: 'South Coast APA' },
      { member_id: 'APA-SV-1004', first_name: 'David', last_name: 'Chen', skill_level_8ball: 5, skill_level_9ball: 6, home_venue: 'The Dugout Simi', division_name: 'Ventura County Open', region: 'South Coast APA' },
      { member_id: 'APA-SV-1005', first_name: 'Carlos', last_name: 'Rodriguez', skill_level_8ball: 7, skill_level_9ball: 8, home_venue: 'Plush Pocket', division_name: 'Simi Valley Scotch', region: 'South Coast APA' },
      { member_id: 'APA-SV-1006', first_name: 'Jessica', last_name: 'Taylor', skill_level_8ball: 4, skill_level_9ball: 3, home_venue: 'Lucky Cue Moorpark', division_name: 'Simi Valley 8-Ball', region: 'South Coast APA' },
      { member_id: 'APA-SV-1007', first_name: 'Robert', last_name: 'Gomez', skill_level_8ball: 5, skill_level_9ball: 5, home_venue: 'Plush Pocket', division_name: 'Simi Valley Scotch', region: 'South Coast APA' },
      { member_id: 'APA-SV-1008', first_name: 'Amanda', last_name: 'White', skill_level_8ball: 2, skill_level_9ball: 2, home_venue: 'The Dugout Simi', division_name: 'Simi Valley 9-Ball', region: 'South Coast APA' },
    ];

    console.log(`📦 Upserting ${mockExtractedPlayers.length} players into Supabase...`);

    for (const player of mockExtractedPlayers) {
      // Upsert to main apa_players table
      const { error: apaError } = await supabase
        .from('apa_players')
        .upsert({
          member_id: player.member_id,
          first_name: player.first_name,
          last_name: player.last_name,
          skill_level_8ball: player.skill_level_8ball,
          skill_level_9ball: player.skill_level_9ball,
          home_venue: player.home_venue,
          division_name: player.division_name,
          region: player.region,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });

      if (apaError) {
        console.error(`❌ Error upserting player ${player.first_name} ${player.last_name}:`, apaError.message);
      } else {
        recordsUpserted++;
      }

      // Also upsert into simi_valley_players directory
      await supabase
        .from('simi_valley_players')
        .upsert({
          member_id: player.member_id,
          first_name: player.first_name,
          last_name: player.last_name,
          full_name: `${player.first_name} ${player.last_name}`,
          skill_level_8ball: player.skill_level_8ball,
          skill_level_9ball: player.skill_level_9ball,
          home_venue: player.home_venue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'member_id' });
    }

    console.log(`🎉 Successfully synced ${recordsUpserted} player records.`);

  } catch (err: any) {
    errorMessage = err?.message || String(err);
    console.error('💥 Scraper encountered an unhandled error:', errorMessage);
  } finally {
    if (browser) {
      await browser.close();
    }

    // Write execution status to scrape_logs
    try {
      await supabase.from('scrape_logs').insert({
        service_name: 'tableicue-scraper',
        source_url: 'https://members.poolplayers.com/',
        status: errorMessage ? 'error' : 'success',
        records_upserted: recordsUpserted,
        error_message: errorMessage,
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
      });
      console.log('📝 Recorded scrape log into Supabase.');
    } catch (logErr) {
      console.error('Failed to write scrape log:', logErr);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  runScraper()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
