import { NextResponse } from 'next/server';
import { verifyTeamPinByCode } from '@/lib/fees/verify';

export async function POST(request: Request) {
  try {
    const { team_code, pin } = await request.json();

    if (!team_code || !pin) {
      return NextResponse.json({ error: 'Missing team_code or pin' }, { status: 400 });
    }

    const teamId = await verifyTeamPinByCode(team_code, pin);

    if (!teamId) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    return NextResponse.json({ valid: true, team_id: teamId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
