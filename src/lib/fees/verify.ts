import bcrypt from 'bcryptjs';
import { supabaseAdmin } from './supabase-admin';

/** Verify a PIN against a team's stored hash. Returns the team_id if valid, null otherwise. */
export async function verifyTeamPin(teamId: string, pin: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('fee_teams').select('pin_hash').eq('id', teamId).single();
  if (!data) return false;
  return bcrypt.compare(pin, data.pin_hash);
}

/** Look up a team by code and verify PIN. Returns team_id if valid. */
export async function verifyTeamPinByCode(teamCode: string, pin: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('fee_teams').select('id, pin_hash').eq('team_code', teamCode).single();
  if (!data) return null;
  const valid = await bcrypt.compare(pin, data.pin_hash);
  return valid ? data.id : null;
}
