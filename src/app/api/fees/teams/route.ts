import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/fees/supabase-admin';
import { generateTeamCode } from '@/lib/fees/utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('fee_teams')
      .select('id, team_code, team_name, team_number, format, night, captain_name, current_session, created_at')
      .eq('team_code', code)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { team_name, team_number, format, night, captain_name, pin, current_session } = await request.json();

    if (!team_name || !format || !pin || !current_session) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const team_code = generateTeamCode(team_name, current_session);
    const pin_hash = await bcrypt.hash(pin, 10);

    const { data: teamData, error: teamError } = await supabaseAdmin
      .from('fee_teams')
      .insert({
        team_code,
        team_name,
        team_number,
        format,
        night,
        captain_name,
        pin_hash,
        current_session
      })
      .select('id')
      .single();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 500 });
    }

    const teamId = teamData.id;

    const { error: sessionError } = await supabaseAdmin
      .from('fee_sessions')
      .insert({
        team_id: teamId,
        session_name: current_session,
        is_active: true
      });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    return NextResponse.json({ team_code, team_id: teamId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
