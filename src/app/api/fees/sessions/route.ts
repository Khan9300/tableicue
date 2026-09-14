import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/fees/supabase-admin';
import { verifyTeamPin } from '@/lib/fees/verify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id');
  const activeOnly = searchParams.get('active_only') === 'true';

  if (!teamId) {
    return NextResponse.json({ error: 'Missing team_id parameter' }, { status: 400 });
  }

  try {
    let query = supabaseAdmin.from('fee_sessions').select('*').eq('team_id', teamId);
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { team_id, session_name, pin } = await request.json();

    if (!team_id || !session_name || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deactivate old active sessions
    await supabaseAdmin
      .from('fee_sessions')
      .update({ is_active: false })
      .eq('team_id', team_id)
      .eq('is_active', true);

    const { data, error } = await supabaseAdmin
      .from('fee_sessions')
      .insert({
        team_id,
        session_name,
        is_active: true
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Update team's current_session
    await supabaseAdmin
      .from('fee_teams')
      .update({ current_session: session_name })
      .eq('id', team_id);

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
