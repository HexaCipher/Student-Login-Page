# Architecture Documentation

This document explains the system design, data flow, and technical decisions behind the Student Login System.

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Breakdown](#component-breakdown)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Security Model](#security-model)
- [Authentication Flows](#authentication-flows)
- [Design Decisions](#design-decisions)
- [Configuration Management](#configuration-management)

---

## System Overview

The Student Login System is a **serverless authentication application** built with vanilla JavaScript and Supabase. It provides email-based and student ID-based authentication without requiring any backend server or build tools.

### Key Characteristics

- **Serverless**: No backend code — all logic runs in the browser
- **Zero-build**: Works by opening HTML files directly or via static hosting
- **Secure**: Row-Level Security (RLS) enforces data isolation
- **Scalable**: Supabase handles all backend operations
- **Mobile-first**: Responsive design from 375px upward

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ index.html   │  │ signup.html  │  │ dashboard.html│      │
│  │ (Login)      │  │ (Register)   │  │ (Protected)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │   auth.js       │                        │
│                   │ (Auth Logic)    │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  supabase.js    │                        │
│                   │ (Client Init)   │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │   config.js     │                        │
│                   │ (Environment)   │                        │
│                   └─────────────────┘                        │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                      SUPABASE BACKEND                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │   Auth Service       │      │   PostgreSQL DB      │     │
│  │                      │      │                      │     │
│  │  • signUp()          │      │  auth.users          │     │
│  │  • signInWithPassword│◄────►│  (managed by         │     │
│  │  • resetPassword()   │      │   Supabase)          │     │
│  │  • signOut()         │      │                      │     │
│  └──────────────────────┘      │  public.profiles     │     │
│                                 │  (our table)         │     │
│  ┌──────────────────────┐      │                      │     │
│  │   RPC Functions      │      │  • id (PK, FK)       │     │
│  │                      │      │  • student_id        │     │
│  │  • get_email_by_     │◄────►│  • full_name         │     │
│  │    student_id()      │      │  • email             │     │
│  └──────────────────────┘      │  • created_at        │     │
│                                 └──────────────────────┘     │
│  ┌──────────────────────┐                                    │
│  │   Database Triggers  │                                    │
│  │                      │                                    │
│  │  • handle_new_user() │                                    │
│  │    (on user signup)  │                                    │
│  └──────────────────────┘                                    │
│                                                               │
│  ┌──────────────────────┐                                    │
│  │   Row-Level Security │                                    │
│  │                      │                                    │
│  │  • SELECT (own data) │                                    │
│  │  • UPDATE (own data) │                                    │
│  │  • INSERT (new user) │                                    │
│  └──────────────────────┘                                    │
└───────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend Pages

| File | Purpose | Key Features |
|------|---------|--------------|
| `index.html` | Login page | Email/Student ID tabs, password visibility toggle |
| `signup.html` | Registration | Name, email, optional student ID, password confirmation |
| `forgot-password.html` | Password reset | Email input, success message |
| `dashboard.html` | User dashboard | Session guard, avatar initial, user info display |

### JavaScript Modules

| File | Responsibility | Dependencies |
|------|---------------|--------------|
| `config.js` | Environment configuration | None |
| `supabase.js` | Initialize Supabase client | `config.js`, Supabase CDN |
| `auth.js` | Authentication logic | `supabase.js` |
| `dashboard.js` | Dashboard functionality | `supabase.js` |

### Styling

| File | Purpose |
|------|---------|
| `style.css` | Complete design system with CSS custom properties |

### Configuration

| File | Purpose |
|------|---------|
| `.env.example` | Template for environment variables |
| `vercel.json` | Vercel deployment configuration |
| `build-config.js` | Build script to inject environment variables |
| `.gitignore` | Exclude sensitive files from version control |

### Database

| File | Purpose |
|------|---------|
| `SETUP_SUPABASE.sql` | Complete database setup script |

---

## Data Flow

### 1. Email Login Flow

```
User enters email + password
    ↓
auth.js → supabaseClient.auth.signInWithPassword()
    ↓
Supabase validates credentials
    ↓
Returns session object
    ↓
Store session (automatic via Supabase)
    ↓
Redirect to dashboard.html
    ↓
dashboard.js checks session
    ↓
Fetch user data from profiles table
    ↓
Display user info
```

### 2. Student ID Login Flow

```
User enters Student ID + password
    ↓
auth.js → supabaseClient.rpc('get_email_by_student_id', { p_student_id })
    ↓
RPC function queries profiles table
    ↓
Returns email (or null if not found)
    ↓
If email found → signInWithPassword(email, password)
    ↓
Supabase validates credentials
    ↓
Returns session object
    ↓
Redirect to dashboard.html
```

### 3. Sign Up Flow

```
User fills registration form
    ↓
auth.js → supabaseClient.auth.signUp({
  email,
  password,
  options: { data: { full_name, student_id } }
})
    ↓
Supabase creates user in auth.users
    ↓
Database trigger fires: handle_new_user()
    ↓
Trigger extracts full_name and student_id from raw_user_meta_data
    ↓
Trigger inserts row into public.profiles
    ↓
Email verification sent (if enabled)
    ↓
Redirect to index.html (to verify email)
```

### 4. Password Reset Flow

```
User enters email
    ↓
auth.js → supabaseClient.auth.resetPasswordForEmail(email)
    ↓
Supabase sends password reset email
    ↓
User clicks link in email
    ↓
Redirected to Supabase-hosted reset page
    ↓
User enters new password
    ↓
Password updated in auth.users
```

---

## Database Schema

### `auth.users` (Managed by Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | TEXT | User's email address |
| `encrypted_password` | TEXT | Hashed password (managed by Supabase) |
| `raw_user_meta_data` | JSONB | Custom data passed during signup |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `email_confirmed_at` | TIMESTAMPTZ | Email verification timestamp |

### `public.profiles` (Custom Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, FK → auth.users(id) | User ID (same as auth.users.id) |
| `student_id` | TEXT | UNIQUE | Optional student identifier |
| `full_name` | TEXT | | User's full name |
| `email` | TEXT | | User's email (denormalized for RPC) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Profile creation timestamp |

**Relationships:**
- `profiles.id` references `auth.users.id` (CASCADE on delete)
- One-to-one relationship: each auth user has exactly one profile

---

## Security Model

### Row-Level Security (RLS)

RLS ensures users can only access their own data. Three policies are defined on `public.profiles`:

#### 1. SELECT Policy
```sql
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
```
- Users can only read their own profile row
- `auth.uid()` returns the currently authenticated user's ID

#### 2. UPDATE Policy
```sql
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
```
- Users can only update their own profile row

#### 3. INSERT Policy
```sql
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```
- Required for the `handle_new_user()` trigger to work
- Ensures new profiles match the authenticated user

### RPC Function Security

```sql
CREATE OR REPLACE FUNCTION get_email_by_student_id(p_student_id TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles
  WHERE student_id = p_student_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
```

- `SECURITY DEFINER`: Runs with elevated privileges (bypasses RLS)
- Only returns email (doesn't expose other sensitive data)
- Used for Student ID login lookup

### Password Security

- Passwords **never stored** in the database
- Supabase handles all hashing (bcrypt)
- Password reset requires email verification
- No password recovery — only reset via email

---

## Authentication Flows

### Session Management

Supabase automatically manages sessions:

1. **Session Creation**
   - On successful login, Supabase returns a session object
   - Session stored in browser's local storage
   - Contains access token and refresh token

2. **Session Persistence**
   - Sessions persist across page reloads
   - `dashboard.js` checks for session on load:
     ```javascript
     const { data: { session } } = await supabaseClient.auth.getSession();
     ```

3. **Session Expiry**
   - Access tokens expire after 1 hour (default)
   - Supabase automatically refreshes using refresh token
   - If refresh fails, user is redirected to login

4. **Sign Out**
   - `supabaseClient.auth.signOut()` clears session
   - Redirects to login page

### Email Verification

Optional feature (enabled by default in Supabase):

1. On signup, Supabase sends confirmation email
2. User clicks link to verify email
3. `email_confirmed_at` timestamp set in `auth.users`
4. If disabled, users can log in immediately

---

## Design Decisions

### Why Vanilla JavaScript?

- **No build step**: Works immediately by opening HTML files
- **Simple deployment**: Upload to any static host
- **Easy to understand**: No framework abstraction
- **Lightweight**: No dependencies beyond Supabase client
- **Beginner-friendly**: Easy to learn and modify

### Why Student ID in Metadata?

**Problem:** Original implementation tried to upsert `student_id` after signup, but RLS blocked it.

**Solution:** Pass `student_id` in signup metadata:
```javascript
await supabaseClient.auth.signUp({
  email,
  password,
  options: { data: { full_name, student_id } }
});
```

**Advantage:**
- Database trigger extracts from `raw_user_meta_data`
- Trigger runs with elevated privileges (bypasses RLS)
- Student ID saved atomically with user creation

### Why RPC for Student ID Login?

**Alternative:** Client could query `profiles` table directly.

**Problem:** RLS would block query (user not authenticated yet).

**Solution:** RPC function with `SECURITY DEFINER` runs with elevated privileges.

**Security:** Function only returns email (not sensitive data like student_id).

### Why Separate `profiles` Table?

**Alternative:** Store everything in `auth.users.raw_user_meta_data`.

**Problems:**
- Can't query efficiently (JSONB field)
- Can't enforce unique constraints on student_id
- Harder to join with other tables

**Advantage of separate table:**
- Indexed queries
- Foreign key constraints
- Unique constraint on student_id
- Future extensibility (add columns easily)

### Why Email Denormalization?

The `profiles` table stores `email` even though it's in `auth.users`.

**Reason:** RPC function needs to look up email without joining to `auth` schema.

**Trade-off:** Slight data redundancy for simpler query.

---

## Configuration Management

### Development vs. Production

| Aspect | Development | Production (Vercel) |
|--------|-------------|---------------------|
| **Credentials** | Hardcoded in `config.js` | Environment variables |
| **Build step** | None | `build-config.js` injects env vars |
| **Git tracking** | `config.js` tracked with placeholders | `config.js` generated at build time |

### How Build Script Works

1. Vercel runs `build-config.js` (defined in `vercel.json`)
2. Script reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `process.env`
3. Script replaces placeholders in `config.js`:
   ```javascript
   configContent = configContent.replace(
     "'PASTE_YOUR_SUPABASE_URL_HERE'",
     `'${SUPABASE_URL}'`
   );
   ```
4. Updated `config.js` deployed to production

### Environment Variable Flow

```
Vercel Dashboard (set env vars)
    ↓
Build time: process.env.SUPABASE_URL
    ↓
build-config.js reads and injects
    ↓
config.js updated with real values
    ↓
Deployed to production
    ↓
Browser loads config.js
    ↓
window.ENV contains credentials
    ↓
supabase.js uses window.ENV
```

---

## Performance Considerations

### Optimizations

1. **CDN-hosted Supabase client**: Fast global delivery
2. **Minimal JavaScript**: ~500 lines total across all files
3. **CSS custom properties**: Efficient styling without preprocessors
4. **No bundling**: Browser can cache individual files
5. **RPC for lookups**: Single query instead of multiple calls

### Potential Bottlenecks

1. **Student ID lookup**: Requires RPC call before login
   - **Mitigation**: Indexed `student_id` column in database
   
2. **Session check on dashboard**: Async call on page load
   - **Mitigation**: Supabase client caches session locally

---

## Future Enhancements

Possible improvements without changing architecture:

1. **Profile editing**: Add page to update name/student ID
2. **Avatar upload**: Store in Supabase Storage
3. **Role-based access**: Add `role` column to profiles
4. **Audit logging**: Track login attempts
5. **Multi-factor auth**: Use Supabase's MFA feature
6. **Social login**: Add OAuth providers (Google, GitHub)
7. **Password strength meter**: Client-side validation
8. **Rate limiting**: Prevent brute-force attacks

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Email login with correct credentials
- [ ] Email login with incorrect password
- [ ] Student ID login with valid ID
- [ ] Student ID login with invalid ID
- [ ] Sign up with all fields
- [ ] Sign up without student ID
- [ ] Sign up with duplicate email
- [ ] Forgot password flow
- [ ] Dashboard access when logged in
- [ ] Dashboard redirect when logged out
- [ ] Sign out functionality
- [ ] Session persistence after page reload
- [ ] Mobile responsive design (375px)
- [ ] Browser console (no errors)

### Verification Queries

Run in Supabase SQL Editor to verify data:

```sql
-- Check if profiles are created
SELECT * FROM public.profiles ORDER BY created_at DESC;

-- Verify student_id is unique
SELECT student_id, COUNT(*) 
FROM public.profiles 
GROUP BY student_id 
HAVING COUNT(*) > 1;

-- Check trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';

-- Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'profiles';
```

---

## Conclusion

This architecture provides a **secure, scalable, and maintainable** authentication system without requiring backend infrastructure or complex build tools. The design prioritizes:

- **Simplicity**: Vanilla JavaScript, no frameworks
- **Security**: RLS, hashed passwords, session management
- **Flexibility**: Easy to extend with additional features
- **Developer experience**: Clear separation of concerns, comprehensive documentation

For setup instructions, see [README.md](README.md).