import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/fees/supabase-admin';
import { verifyTeamPin } from '@/lib/fees/verify';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team_id');

  if (!teamId) {
    return NextResponse.json({ error: 'Missing team_id parameter' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('fee_players')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('player_name', { ascending: true });

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
    const { team_id, player_name, apa_member_number, skill_level, pin } = await request.json();

    if (!team_id || !player_name || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('fee_players')
      .insert({
        team_id,
        player_name,
        apa_member_number,
        skill_level,
        is_active: true
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
    const { id, player_name, skill_level, is_active, pin, team_id, apa_member_number } = await request.json();

    if (!id || !pin || !team_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isValid = await verifyTeamPin(team_id, pin);
    if (!isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const updates: any = {};
    if (player_name !== undefined) updates.player_name = player_name;
    if (skill_level !== undefined) updates.skill_level = skill_level;
    if (is_active !== undefined) updates.is_active = is_active;
    if (apa_member_number !== undefined) updates.apa_member_number = apa_member_number;

    const { data, error } = await supabaseAdmin
      .from('fee_players')
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
