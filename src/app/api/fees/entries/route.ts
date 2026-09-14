import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/fees/supabase-admin';
import { verifyTeamPin } from '@/lib/fees/verify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id');
  const sessionId = searchParams.get('session_id');

  if (!teamId) {
    return NextResponse.json({ error: 'Missing team_id parameter' }, { status: 400 });
  }

  try {
    if (sessionId) {
      // Find all match nights for this session
      const { data: matchNights, error: mnError } = await supabaseAdmin
        .from('fee_match_nights')
        .select('id')
        .eq('session_id', sessionId);

      if (mnError) throw new Error(mnError.message);
      
      const matchNightIds = matchNights.map(mn => mn.id);

      if (matchNightIds.length === 0) {
        return NextResponse.json([]);
      }

      const { data, error } = await supabaseAdmin
        .from('fee_entries')
        .select('*')
        .eq('team_id', teamId)
        .in('match_night_id', matchNightIds)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabaseAdmin
        .from('fee_entries')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);
      return NextResponse.json(data);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { match_night_id, team_id, player_name, round_number, amount, player_sl, result, opponent_name, opponent_sl, pin } = await request.json();

    if (!match_night_id || !team_id || !player_name || amount === undefined || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('fee_entries')
      .insert({
        match_night_id,
        team_id,
        player_name,
        round_number,
        amount,
        player_sl,
        result,
        opponent_name,
        opponent_sl
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

export async function PUT(request: Request) {
  try {
    const { id, is_paid, is_voided, void_reason, result, opponent_name, opponent_sl, pin, team_id } = await request.json();

    if (!id || !pin || !team_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const updates: any = {};
    if (is_paid !== undefined) {
      updates.is_paid = is_paid;
      updates.paid_at = is_paid ? new Date().toISOString() : null;
    }
    if (is_voided !== undefined) updates.is_voided = is_voided;
    if (void_reason !== undefined) updates.void_reason = void_reason;
    if (result !== undefined) updates.result = result;
    if (opponent_name !== undefined) updates.opponent_name = opponent_name;
    if (opponent_sl !== undefined) updates.opponent_sl = opponent_sl;

    const { data, error } = await supabaseAdmin
      .from('fee_entries')
      .update(updates)
      .eq('id', id)
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
