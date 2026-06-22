#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🚀 FoodShare Database Migration Runner\n');

// Read .env file manually
function readEnv() {
  const envPath = path.join(__dirname, 'frontend', '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

const env = readEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const projectId = env.VITE_SUPABASE_PROJECT_ID;

console.log(`📁 Project URL: ${supabaseUrl}`);
console.log(`📋 Project ID: ${projectId}\n`);

console.log('✅ QUICK SETUP - Run migrations in your Supabase dashboard:\n');
console.log('1. Open: https://supabase.com/dashboard/project/' + projectId + '/sql/new');
console.log('2. For EACH block below, copy it → paste → click "Run" → wait for success');
console.log('3. Then refresh http://localhost:8081/\n');

// Show migrations
const migrations = [
  {
    num: 1,
    name: 'Core Tables & Policies',
    file: 'backend/supabase/migrations/20260212102745_fb04059d-472e-43bd-b186-f26d820d401f.sql'
  },
  {
    num: 2,
    name: 'Volunteer & Request Fixes',
    file: 'backend/supabase/migrations/20260212120000_volunteer_requests_and_fixes.sql'
  },
  {
    num: 3,
    name: 'Roles & Profile Backfill',
    file: 'backend/supabase/migrations/20260213100000_roles_requests_profiles_fix.sql'
  },
  {
    num: 4,
    name: 'Ultra Pro Features (Images & Notifications)',
    file: 'backend/supabase/migrations/20260213160000_ultra_pro.sql'
  }
];

migrations.forEach(m => {
  const sqlPath = path.join(__dirname, m.file);
  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf-8').trim();
    console.log(`${'─'.repeat(70)}`);
    console.log(`📍 MIGRATION ${m.num}: ${m.name}`);
    console.log(`${'─'.repeat(70)}\n`);
    console.log(sql);
    console.log('\n');
  }
});

console.log('✅ After all migrations complete:');
console.log('   • Refresh http://localhost:8081/');
console.log('   • Sign up for a new account');
console.log('   • Add foods and start using the app!\n');
