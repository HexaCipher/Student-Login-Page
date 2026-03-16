/*
 * ============================================================
 *  CONFIG.JS — Environment Configuration
 * ============================================================
 *
 *  This file contains your Supabase credentials.
 *  
 *  Local Development:
 *  - Replace the placeholder values below with your actual credentials
 *  - DO NOT commit this file with real credentials to version control
 *
 *  Production (Vercel):
 *  - Set environment variables in Vercel dashboard:
 *    SUPABASE_URL and SUPABASE_ANON_KEY
 *  - Vercel will inject them at build time via vercel.json
 *
 * ============================================================
 */

// Default configuration (replace with your credentials)
window.ENV = {
  SUPABASE_URL: 'PASTE_YOUR_SUPABASE_URL_HERE',
  SUPABASE_ANON_KEY: 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE'
};

// Validation and warning
if (
  window.ENV.SUPABASE_URL === 'PASTE_YOUR_SUPABASE_URL_HERE' ||
  window.ENV.SUPABASE_ANON_KEY === 'PASTE_YOUR_SUPABASE_ANON_KEY_HERE' ||
  !window.ENV.SUPABASE_URL ||
  !window.ENV.SUPABASE_ANON_KEY
) {
  console.error(
    '[config.js] ⚠️  Supabase credentials not configured!\n\n' +
    'Local Development:\n' +
    '  1. Open config.js\n' +
    '  2. Replace SUPABASE_URL with your project URL\n' +
    '  3. Replace SUPABASE_ANON_KEY with your anon key\n' +
    '  (Get these from supabase.com → Project Settings → API)\n\n' +
    'Production:\n' +
    '  Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment variables'
  );
}
