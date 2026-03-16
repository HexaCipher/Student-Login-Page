#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * 
 * This script injects environment variables into config.js at build time.
 * It reads SUPABASE_URL and SUPABASE_ANON_KEY from process.env and 
 * replaces the placeholder values in config.js.
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'public', 'config', 'config.js');

// Read environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

console.log('Building config.js...');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set in environment variables');
  console.warn('The app will use placeholder values and will not function correctly.');
} else {
  console.log('✓ Environment variables found');
}

// Read config.js
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholder values with actual environment variables
configContent = configContent.replace(
  "'PASTE_YOUR_SUPABASE_URL_HERE'",
  `'${SUPABASE_URL}'`
);

configContent = configContent.replace(
  "'PASTE_YOUR_SUPABASE_ANON_KEY_HERE'",
  `'${SUPABASE_ANON_KEY}'`
);

// Write updated config.js
fs.writeFileSync(configPath, configContent);

console.log('✓ config.js built successfully');
console.log('Environment variables have been injected into config.js');
