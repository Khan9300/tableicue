import { NextResponse } from 'next/server';
import { supabase } from '@/lib/data/supabase';
import { ALL_TEAMS } from '@/lib/data/teams';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleRefresh();
}

export async function POST() {
  return handleRefresh();
}

async function handleRefresh() {
  try {
    const results: Record<string, any> = {};

    for (const team of ALL_TEAMS) {
      const { data, error } = await supabase
        .from('simi_valley_players')
        .select('*')
        .eq('team_name', team.name);

      if (error) {
        results[team.key] = { status: 'error', error: error.message };
      } else {
        results[team.key] = {
          status: 'success',
          playerCount: data?.length ?? 0,
          players: data?.map((p: any) => ({
            name: p.player_name,
            sl: p.sl,
            w: p.wins,
            l: p.losses,
          })),
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      updated: true,
      teams: results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to refresh stats' },
      { status: 500 }
    );
  }
}
