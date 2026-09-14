import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/fees/supabase-admin';
import { verifyTeamPin } from '@/lib/fees/verify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('fee_match_nights')
      .select('*')
      .eq('session_id', sessionId)
      .order('match_date', { ascending: true });

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
    const { session_id, team_id, match_date, week_number, opponent_name, opponent_number, notes, pin } = await request.json();

    if (!session_id || !team_id || !match_date || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('fee_match_nights')
      .insert({
        session_id,
        team_id,
        match_date,
        week_number,
        opponent_name,
        opponent_number,
        notes
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
