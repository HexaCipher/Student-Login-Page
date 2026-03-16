/* ============================================================
   dashboard.js — Session Guard + User Info Display
   Handles: session check, populating profile data,
            avatar/initial fallback, sign-out.

   Depends on: supabase.js (must be loaded first)
   Used by:    dashboard.html
   ============================================================ */

(function initDashboard() {
  /* ── Elements ── */
  const avatarImg       = document.getElementById('profile-avatar-img');
  const avatarInitial   = document.getElementById('profile-avatar-initial');
  const profileName     = document.getElementById('profile-name');
  const profileEmail    = document.getElementById('profile-email');
  const signOutBtn      = document.getElementById('btn-signout');

  /* ─────────────────────────────────────────────────────────
     SESSION GUARD
     If no active session exists, immediately redirect to the
     login page. This prevents unauthenticated access.
  ───────────────────────────────────────────────────────── */
  supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
    if (error || !session) {
      // No session — bounce to login
      window.location.href = 'index.html';
      return;
    }

    // Session exists — populate the UI
    populateProfile(session.user);
  });

  /* ─────────────────────────────────────────────────────────
     POPULATE PROFILE
     Fills name, email, and avatar from the session's user object.
     Falls back gracefully when Google metadata is absent (e.g.
     email/password accounts without a profile photo).
  ───────────────────────────────────────────────────────── */
  function populateProfile(user) {
    const meta      = user.user_metadata || {};
    const fullName  = meta.full_name || meta.name || 'Student';
    const email     = user.email || '';
    const avatarUrl = meta.avatar_url || meta.picture || null;

    // Set name and email text
    if (profileName)  profileName.textContent  = fullName;
    if (profileEmail) profileEmail.textContent = email;

    // Handle avatar: photo if available, else initial placeholder
    if (avatarUrl && avatarImg) {
      avatarImg.src = avatarUrl;
      avatarImg.alt = fullName;

      // Show the <img>, hide the initial placeholder
      avatarImg.classList.remove('hidden');
      if (avatarInitial) avatarInitial.classList.add('hidden');

      // If the image fails to load (broken URL), fall back to initial
      avatarImg.addEventListener('error', () => {
        avatarImg.classList.add('hidden');
        showInitial(avatarInitial, fullName);
      });
    } else {
      // No photo URL — show the initial placeholder
      if (avatarImg) avatarImg.classList.add('hidden');
      showInitial(avatarInitial, fullName);
    }
  }

  /**
   * Display the first letter of the user's name inside the
   * avatar placeholder circle.
   * @param {HTMLElement} el       - the .avatar-initial element
   * @param {string}      fullName - user's display name
   */
  function showInitial(el, fullName) {
    if (!el) return;
    const initial = (fullName || 'S').charAt(0).toUpperCase();
    el.textContent = initial;
    el.classList.remove('hidden');
  }

  /* ─────────────────────────────────────────────────────────
     SIGN OUT
  ───────────────────────────────────────────────────────── */
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      signOutBtn.disabled = true;
      signOutBtn.textContent = 'Signing out...';

      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        // Even if sign-out fails server-side, the local session is
        // cleared by Supabase, so redirect anyway.
        console.error('[dashboard.js] Sign-out error:', error.message);
      }

      window.location.href = 'index.html';
    });
  }
})();
