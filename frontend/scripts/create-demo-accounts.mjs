#!/usr/bin/env node
/**
 * Creates BookBase's demo accounts in your Supabase project, through Supabase Auth's normal
 * sign-up, so each one gets its library account from the database's sign-up trigger.
 *
 * Run it from the frontend folder, after the three SQL files and the settings:
 *   BOOKBASE_ADMIN_PASSWORD=choose-one BOOKBASE_STAFF_SIGNUP_CODE=your-code node scripts/create-demo-accounts.mjs
 *
 * It reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from frontend/.env. The staff code must
 * match the one saved in private.settings. Accounts that already exist are left alone.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const STUDENT_PASSWORD = 'member123';
const STUDENTS = [
  ['Tejas', 'CSBS2022001', 'tejas@bookbase.in'],
  ['Akash', 'CSBS2022002', 'akash@bookbase.in'],
  ['Sai Kartikeya', 'CSBS2022003', 'saikartikeya@bookbase.in'],
  ['Biba', 'CSBS2022004', 'biba@bookbase.in'],
  ['Jaidanya', 'CSBS2022005', 'jaidanya@bookbase.in'],
  ['Shashini', 'CSBS2022006', 'shashini@bookbase.in'],
];

function readDotEnv() {
  const path = new URL('../.env', import.meta.url);
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

const env = { ...readDotEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const adminPassword = env.BOOKBASE_ADMIN_PASSWORD || '';
const staffCode = env.BOOKBASE_STAFF_SIGNUP_CODE || '';

if (!url || !anonKey) fail('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env first.');
if (adminPassword.length < 8) fail('Set BOOKBASE_ADMIN_PASSWORD to the librarian password you want, at least 8 characters.');
if (!staffCode) fail('Set BOOKBASE_STAFF_SIGNUP_CODE to the staff code you saved in private.settings.');

const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const accounts = [
  { full_name: 'Admin', enrollment_no: 'ADMIN001', email: 'admin@bookbase.in', password: adminPassword, staff_code: staffCode },
  ...STUDENTS.map(([full_name, enrollment_no, email]) => ({ full_name, enrollment_no, email, password: STUDENT_PASSWORD })),
];

for (const { password, staff_code, ...details } of accounts) {
  const { data: problem, error: checkError } = await supabase.rpc('registration_problem', {
    p_full_name: details.full_name,
    p_enrollment_no: details.enrollment_no,
    p_email: details.email,
    p_staff_code: staff_code,
  });
  if (checkError) fail(`Couldn't reach the database: ${checkError.message}. Did all three SQL files run?`);
  if (problem?.includes('already registered')) {
    console.log(`  ${details.email}: already exists, left alone`);
    continue;
  }
  if (problem) fail(`${details.email}: ${problem}`);

  const { data, error } = await supabase.auth.signUp({
    email: details.email,
    password,
    options: { data: { full_name: details.full_name, enrollment_no: details.enrollment_no, ...(staff_code && { staff_code }) } },
  });
  if (error) fail(`${details.email}: ${error.message}`);
  if (!data.session) {
    fail(
      'Supabase is asking new accounts to confirm their email, which these demo addresses can\'t do.\n' +
      'Turn off Authentication → Sign In / Providers → Email → "Confirm email", then run this again.',
    );
  }
  await supabase.auth.signOut({ scope: 'local' });
  console.log(`  ${details.email}: created`);
}

console.log('\nDone. Now fill the library: in the Supabase SQL Editor, run');
console.log('    SELECT private.seed_library();');
