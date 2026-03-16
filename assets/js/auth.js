/* ============================================================
   auth.js — Authentication Logic
   Handles: email login, student ID login (via RPC),
            forgot-password flow, tab switching,
            password visibility toggle.

   Depends on: supabase.js (must be loaded first)
   Used by:    index.html, forgot-password.html, signup.html
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   UTILITY HELPERS
───────────────────────────────────────────────────────────── */

/**
 * Show an error message element.
 * @param {HTMLElement} el  - the .msg-error div
 * @param {string}      msg - human-friendly message
 */
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

/**
 * Hide an error message element.
 * @param {HTMLElement} el
 */
function hideError(el) {
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

/**
 * Map Supabase auth error messages to friendly strings.
 * Supabase error messages are not always consistent across versions,
 * so we check for substrings to be safe.
 * @param {string} message - raw Supabase error message
 * @returns {string}       - friendly message for the user
 */
function friendlyAuthError(message) {
  if (!message) return 'Something went wrong. Please try again.';

  const m = message.toLowerCase();

  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'Incorrect password. Try again.';
  }
  if (m.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (m.includes('user not found') || m.includes('no user found')) {
    return 'No account found with this email.';
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return 'Connection failed. Check your internet connection.';
  }

  // Fallback: return the raw message so nothing is silently swallowed
  return message;
}

/**
 * Set a button into a loading state (disabled + spinner + text).
 * @param {HTMLButtonElement} btn
 * @param {string}            loadingText
 */
function setLoading(btn, loadingText) {
  btn.disabled = true;
  btn.dataset.originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span>${loadingText}`;
}

/**
 * Restore a button from its loading state.
 * @param {HTMLButtonElement} btn
 */
function clearLoading(btn) {
  btn.disabled = false;
  if (btn.dataset.originalHtml) {
    btn.innerHTML = btn.dataset.originalHtml;
    delete btn.dataset.originalHtml;
  }
}

/* ─────────────────────────────────────────────────────────────
   LOGIN PAGE LOGIC  (runs only when #login-form is in the DOM)
───────────────────────────────────────────────────────────── */

(function initLoginPage() {
  // Guard: only run on the login page
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  /* ── Elements ── */
  const tabEmail     = document.getElementById('tab-email');
  const tabStudentId = document.getElementById('tab-studentid');
  const emailSection = document.getElementById('section-email');
  const sidSection   = document.getElementById('section-studentid');
  const emailInput   = document.getElementById('input-email');
  const sidInput     = document.getElementById('input-studentid');
  const passwordInput  = document.getElementById('input-password');
  const togglePwdBtn   = document.getElementById('toggle-password');
  const signInBtn      = document.getElementById('btn-signin');
  const errorMsg       = document.getElementById('login-error');

  // Track which tab is active
  let currentMode = 'email'; // 'email' | 'studentId'

  /* ── On page load: redirect if already logged in ── */
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      window.location.href = 'dashboard.html';
    }
  });

  /* ── Tab Switching ── */
  tabEmail.addEventListener('click', () => switchTab('email'));
  tabStudentId.addEventListener('click', () => switchTab('studentId'));

  function switchTab(mode) {
    currentMode = mode;

    if (mode === 'email') {
      tabEmail.classList.add('active');
      tabStudentId.classList.remove('active');
      emailSection.classList.remove('hidden');
      sidSection.classList.add('hidden');
    } else {
      tabStudentId.classList.add('active');
      tabEmail.classList.remove('active');
      sidSection.classList.remove('hidden');
      emailSection.classList.add('hidden');
    }

    // Clear any lingering error when switching tabs
    hideError(errorMsg);
  }

  /* ── Password Visibility Toggle ── */
  togglePwdBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    // Swap between eye-open and eye-closed icons
    togglePwdBtn.innerHTML = isPassword
      ? `<!-- Eye-off (password visible) -->
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                    a18.45 18.45 0 0 1 5.06-5.94"/>
           <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
                    a18.5 18.5 0 0 1-2.16 3.19"/>
           <line x1="1" y1="1" x2="23" y2="23"/>
         </svg>`
      : `<!-- Eye-open (password hidden) -->
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
           <circle cx="12" cy="12" r="3"/>
         </svg>`;

    togglePwdBtn.setAttribute('aria-label',
      isPassword ? 'Hide password' : 'Show password');
  });

  /* ── Sign In ── */
  signInBtn.addEventListener('click', handleSignIn);

  // Also allow Enter key to submit from any field
  loginForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSignIn();
  });

  async function handleSignIn() {
    hideError(errorMsg);

    const password = passwordInput.value.trim();

    // ── Validation ──
    if (currentMode === 'email') {
      const email = emailInput.value.trim();
      if (!email || !password) {
        showError(errorMsg, 'Please fill in all fields.');
        return;
      }
      await signInWithEmail(email, password);
    } else {
      const sid = sidInput.value.trim();
      if (!sid || !password) {
        showError(errorMsg, 'Please fill in all fields.');
        return;
      }
      await signInWithStudentId(sid, password);
    }
  }

  /* ── Email + Password sign-in ── */
  async function signInWithEmail(email, password) {
    setLoading(signInBtn, 'Signing in...');

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      clearLoading(signInBtn);
      showError(errorMsg, friendlyAuthError(error.message));
      return;
    }

    // Success — navigate to dashboard
    window.location.href = 'dashboard.html';
  }

  /* ── Student ID → look up email via RPC → sign in ── */
  async function signInWithStudentId(studentId, password) {
    setLoading(signInBtn, 'Signing in...');

    // Step 1: call the RPC to get the email associated with this student ID
    const { data: email, error: rpcError } = await supabaseClient
      .rpc('get_email_by_student_id', { p_student_id: studentId });

    if (rpcError) {
      clearLoading(signInBtn);
      showError(errorMsg, friendlyAuthError(rpcError.message));
      return;
    }

    if (!email) {
      clearLoading(signInBtn);
      showError(errorMsg, 'Student ID not registered.');
      return;
    }

    // Step 2: sign in with the resolved email + provided password
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      clearLoading(signInBtn);
      showError(errorMsg, friendlyAuthError(signInError.message));
      return;
    }

    // Success
    window.location.href = 'dashboard.html';
  }
})();

/* ─────────────────────────────────────────────────────────────
   FORGOT PASSWORD PAGE LOGIC  (runs only when #forgot-form is present)
───────────────────────────────────────────────────────────── */

(function initForgotPasswordPage() {
  // Guard: only run on the forgot-password page
  const forgotForm = document.getElementById('forgot-form');
  if (!forgotForm) return;

  const emailInput   = document.getElementById('forgot-email');
  const sendBtn      = document.getElementById('btn-send-reset');
  const errorMsg     = document.getElementById('forgot-error');
  const successState = document.getElementById('forgot-success');

  sendBtn.addEventListener('click', handleSendReset);

  forgotForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSendReset();
  });

  async function handleSendReset() {
    hideError(errorMsg);

    const email = emailInput.value.trim();

    if (!email) {
      showError(errorMsg, 'Please enter your email address.');
      return;
    }

    setLoading(sendBtn, 'Sending...');

    // Build redirect back to the login page on the same host
    const redirectTo = window.location.origin +
      window.location.pathname.replace('forgot-password.html', '') +
      'index.html';

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    clearLoading(sendBtn);

    if (error) {
      showError(errorMsg, friendlyAuthError(error.message));
      return;
    }

    // Hide the form, show success state
    forgotForm.classList.add('hidden');
    successState.classList.add('visible');
  }
})();

/* ─────────────────────────────────────────────────────────────
   SIGN UP PAGE LOGIC  (runs only when #signup-form is present)
───────────────────────────────────────────────────────────── */

(function initSignUpPage() {
  // Guard: only run on signup.html
  const signupForm = document.getElementById('signup-form');
  if (!signupForm) return;

  /* ── Elements ── */
  const fullNameInput     = document.getElementById('su-fullname');
  const emailInput        = document.getElementById('su-email');
  const studentIdInput    = document.getElementById('su-studentid');
  const passwordInput     = document.getElementById('su-password');
  const confirmInput      = document.getElementById('su-confirm-password');
  const togglePwdBtn      = document.getElementById('su-toggle-password');
  const toggleConfirmBtn  = document.getElementById('su-toggle-confirm');
  const pwHint            = document.getElementById('su-pw-hint');
  const signupBtn         = document.getElementById('btn-signup');
  const errorMsg          = document.getElementById('signup-error');
  const successState      = document.getElementById('signup-success');
  const confirmedEmailEl  = document.getElementById('su-confirmed-email');
  const footerLink        = document.getElementById('signup-footer-link');

  /* ── Redirect if already logged in ── */
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.href = 'dashboard.html';
  });

  /* ── Password visibility toggles ── */
  setupToggle(togglePwdBtn, passwordInput);
  setupToggle(toggleConfirmBtn, confirmInput);

  function setupToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show
        ? `<!-- Eye-off -->
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8
                      a18.45 18.45 0 0 1 5.06-5.94"/>
             <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8
                      a18.5 18.5 0 0 1-2.16 3.19"/>
             <line x1="1" y1="1" x2="23" y2="23"/>
           </svg>`
        : `<!-- Eye-open -->
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
             <circle cx="12" cy="12" r="3"/>
           </svg>`;
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /* ── Live password strength hint ── */
  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    if (!val) {
      pwHint.textContent = '';
      pwHint.className = 'field-hint';
      return;
    }
    const strength = getPasswordStrength(val);
    pwHint.textContent = strength.label;
    pwHint.className   = `field-hint ${strength.cls}`;
  });

  function getPasswordStrength(pw) {
    const hasUpper  = /[A-Z]/.test(pw);
    const hasLower  = /[a-z]/.test(pw);
    const hasDigit  = /\d/.test(pw);
    const hasSymbol = /[^A-Za-z0-9]/.test(pw);
    const score = [pw.length >= 8, hasUpper, hasLower, hasDigit, hasSymbol]
      .filter(Boolean).length;

    if (score <= 2) return { label: 'Weak password',   cls: 'hint-weak' };
    if (score <= 3) return { label: 'Fair password',   cls: 'hint-fair' };
    return             { label: 'Strong password', cls: 'hint-strong' };
  }

  /* ── Submit ── */
  signupBtn.addEventListener('click', handleSignUp);
  signupForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSignUp();
  });

  async function handleSignUp() {
    hideError(errorMsg);

    const fullName  = fullNameInput.value.trim();
    const email     = emailInput.value.trim();
    const studentId = studentIdInput.value.trim();
    const password  = passwordInput.value;
    const confirm   = confirmInput.value;

    /* ── Client-side validation ── */
    if (!fullName || !email || !password || !confirm) {
      showError(errorMsg, 'Please fill in all required fields.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(errorMsg, 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      showError(errorMsg, 'Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      showError(errorMsg, 'Passwords do not match.');
      return;
    }

    setLoading(signupBtn, 'Creating account...');

    /* ── 1. Create the auth user via Supabase ── */
    const { data, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        // Pass ALL user data in metadata so the trigger can read it
        data: {
          full_name: fullName,
          student_id: studentId || null,  // ← Include student_id here
        },
      },
    });

    if (signUpError) {
      clearLoading(signupBtn);
      showError(errorMsg, friendlySignUpError(signUpError.message));
      return;
    }

    /* ── 2. Show success state ──
       The database trigger automatically creates the profile row with
       full_name and student_id from the metadata we passed above. ── */
    clearLoading(signupBtn);
    if (confirmedEmailEl) confirmedEmailEl.textContent = email;

    signupForm.classList.add('hidden');
    if (footerLink) footerLink.classList.add('hidden');
    successState.classList.add('visible');
  }

  /**
   * Map Supabase sign-up errors to friendly messages.
   * @param {string} message
   * @returns {string}
   */
  function friendlySignUpError(message) {
    if (!message) return 'Something went wrong. Please try again.';
    const m = message.toLowerCase();

    if (m.includes('already registered') || m.includes('user already exists')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (m.includes('password') && m.includes('short')) {
      return 'Password must be at least 8 characters.';
    }
    if (m.includes('invalid email') || m.includes('unable to validate email')) {
      return 'Please enter a valid email address.';
    }
    if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
      return 'Connection failed. Check your internet connection.';
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }

    return message;
  }
})();
