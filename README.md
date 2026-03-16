# Student Login System

A complete, production-ready authentication system built with vanilla HTML, CSS, and JavaScript using Supabase backend. Features email and student ID login, password reset, and a protected dashboard.

## Features

- **Email + Password Authentication** — Standard email/password login
- **Student ID Login** — Students can log in using Student ID + Password
- **User Registration** — Sign up with name, email, optional student ID
- **Password Reset** — Forgot password flow with email verification
- **Protected Dashboard** — Displays user info after authentication
- **Session Management** — Persistent sessions with auto-login
- **Email Verification** — Optional email confirmation on signup
- **Mobile Responsive** — Optimized for all screen sizes (375px+)
- **Clean Design** — Minimal, professional UI with CSS custom properties
- **No Build Tools** — Pure vanilla JavaScript, works immediately

---

## Quick Start

### Prerequisites

- A [Supabase](https://supabase.com) account (free tier works)
- A hosting platform (Vercel, Netlify, GitHub Pages, etc.)

### 1. Clone or Download

```bash
git clone <your-repo-url>
cd login_page_v2
```

### 2. Configure Supabase Credentials

**Option A: Local Development**

1. Open `config/config.js`
2. Replace the placeholder values:

```javascript
window.ENV = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key-here'
};
```

Get these values from **Supabase Dashboard → Project Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **anon/public key** → `SUPABASE_ANON_KEY`

**Option B: Production (Vercel)**

Set environment variables in Vercel dashboard:
- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon key

The build script (`scripts/build-config.js`) will inject these automatically.

### 3. Set Up Supabase Database

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New Query**
3. Open `docs/SETUP_SUPABASE.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run**

This creates:
- `profiles` table (stores user data including student ID)
- Row-Level Security (RLS) policies
- `get_email_by_student_id()` RPC function for Student ID login
- `handle_new_user()` trigger to auto-create profiles on signup

### 4. Enable Email Authentication

1. Go to **Supabase Dashboard → Authentication → Providers**
2. Ensure **Email** provider is enabled (it's on by default)
3. (Optional) Configure email confirmation settings

### 5. Deploy

**For Vercel:**

```bash
vercel
```

Set environment variables in Vercel dashboard (Settings → Environment Variables):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

**For other platforms:**

Simply upload all files. Make sure `config/config.js` has your credentials filled in.

### 6. Test

Open `public/index.html` in your browser or visit your deployed URL.

---

## Project Structure

```
login_page_v2/
├── public/                     # HTML pages
│   ├── index.html              # Login page (Email/Student ID tabs)
│   ├── signup.html             # User registration form
│   ├── forgot-password.html    # Password reset flow
│   └── dashboard.html          # Protected user dashboard
├── assets/                     # Static assets
│   ├── css/
│   │   └── style.css           # Complete design system
│   └── js/
│       ├── supabase.js         # Supabase client initialization
│       ├── auth.js             # Authentication logic
│       └── dashboard.js        # Dashboard functionality
├── config/
│   └── config.js               # Environment configuration
├── docs/                       # Documentation
│   ├── SETUP_SUPABASE.sql      # Database setup script
│   └── ARCHITECTURE.md         # Technical documentation
├── scripts/
│   └── build-config.js         # Build script for Vercel
├── vercel.json                 # Vercel configuration
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
└── README.md                   # This file
```

---

## How It Works

### Authentication Flow

1. **Email Login**
   - User enters email + password
   - Supabase validates credentials
   - On success, redirect to dashboard

2. **Student ID Login**
   - User enters Student ID + password
   - System calls `get_email_by_student_id()` RPC function
   - Function looks up email in `profiles` table
   - If found, authenticate with email + password
   - On success, redirect to dashboard

3. **Sign Up**
   - User provides name, email, password, optional student ID
   - Supabase creates auth user
   - Database trigger (`handle_new_user()`) automatically creates profile
   - Student ID and name are extracted from signup metadata
   - Email verification sent (if enabled)

4. **Password Reset**
   - User enters email
   - Supabase sends password reset link
   - User clicks link and sets new password

### Session Management

- Sessions are automatically persisted by Supabase
- `assets/js/dashboard.js` checks for active session on page load
- If no session exists, redirects to login
- Sign out clears session and redirects to login

### Security

- **Row-Level Security (RLS)** enabled on all tables
- Users can only access their own profile data
- Passwords never stored in database (handled by Supabase Auth)
- `get_email_by_student_id()` uses `SECURITY DEFINER` to safely look up emails
- Environment variables keep credentials secure

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

**Local Development:**
Edit `config.js` directly with your credentials.

**Production (Vercel):**
Set in Vercel dashboard → Settings → Environment Variables.

---

## Troubleshooting

### "Student ID not stored in database"

**Cause:** The database trigger isn't extracting student_id from metadata.

**Fix:** Re-run `docs/SETUP_SUPABASE.sql`. Ensure the `handle_new_user()` trigger extracts both `full_name` and `student_id` from `raw_user_meta_data`.

### "Profile upsert failed" during signup

**Cause:** Missing INSERT RLS policy on `profiles` table.

**Fix:** Re-run `docs/SETUP_SUPABASE.sql` to create all required policies.

### "Invalid login credentials"

**Cause:** Email not confirmed (if email verification is enabled).

**Fix:** 
- Check spam folder for confirmation email
- Or disable email confirmation: **Supabase → Authentication → Email Auth → Confirm email** (OFF)

### Dashboard shows "S" instead of name

**Cause:** `full_name` not saved during signup.

**Fix:** The trigger should handle this now. For existing users, manually update `profiles` table or create a new account.

### Console error: "config.js not loaded"

**Cause:** Script loading order is incorrect in HTML.

**Fix:** Ensure scripts are loaded in this order:
```html
<script src="../config/config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../assets/js/supabase.js"></script>
```

---

## Development

### Local Testing

1. Fill in `config/config.js` with your credentials
2. Open `public/index.html` in a browser
3. Or use a local server:
   ```bash
   python -m http.server 8000
   # Visit http://localhost:8000
   ```

### Making Changes

- **Styles:** Edit `assets/css/style.css` (uses CSS custom properties)
- **Auth logic:** Edit `assets/js/auth.js`
- **Dashboard logic:** Edit `assets/js/dashboard.js`
- **Database schema:** Modify `docs/SETUP_SUPABASE.sql` and re-run in SQL Editor

---

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Hosting:** Vercel, Netlify, or any static host
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL with Row-Level Security

---

## Browser Support

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## License

MIT License - feel free to use for personal or commercial projects.

---

## Support

Having issues? Check:

1. **Browser Console** (F12 → Console) for JavaScript errors
2. **Supabase Logs** (Dashboard → Logs) for backend errors
3. **Database** (`SELECT * FROM profiles;` in SQL Editor) to verify data

For architecture details, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
