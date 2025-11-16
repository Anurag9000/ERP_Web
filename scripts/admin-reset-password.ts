#!/usr/bin/env ts-node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function exitWith(message: string, code = 1) {
  console.error(message);
  process.exit(code);
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  exitWith('Usage: npm run admin:reset-password -- user@example.com "NewPassword123!"');
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  exitWith('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

async function main() {
  const client = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error } = await client
    .from('user_profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (error) exitWith(`Failed to look up user profile: ${error.message}`);
  if (!profile) exitWith(`No user_profile found for ${email}`);

  await client.auth.admin.updateUserById(profile.id, { password: newPassword });
  const { error: updateError } = await client
    .from('user_profiles')
    .update({ must_change_password: true })
    .eq('id', profile.id);
  if (updateError) exitWith(`Password updated but failed to set must_change_password: ${updateError.message}`);

  console.log(`Password reset for ${email}. User will be prompted to change password on next login.`);
}

main().catch((err) => exitWith(`Reset failed: ${err instanceof Error ? err.message : String(err)}`));
