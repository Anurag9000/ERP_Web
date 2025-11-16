#!/usr/bin/env ts-node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function exitWith(message: string, code = 1) {
  console.error(message);
  process.exit(code);
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  exitWith('Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
}

async function main() {
  const client = createClient(url, anonKey);

  console.log('Running Supabase health check...');

  const { data: version, error: versionError } = await client.from('system_settings').select('key').limit(1);
  if (versionError) {
    exitWith(`Database ping failed: ${versionError.message}`);
  }
  console.log('✓ Database reachable');

  const { data: term, error: termError } = await client.from('terms').select('id').limit(1);
  if (termError) {
    exitWith(`Config validation failed: ${termError.message}`);
  }
  console.log('✓ Config tables accessible');

  console.log('Supabase health check passed.');
}

main().catch((error) => exitWith(`Health check error: ${error instanceof Error ? error.message : String(error)}`));
