/* ==========================================================================
   EduSphere — js/auth.js (signup.html and login.html)
   Author: Ramil Zhunussov

   Sign up and log in are SIMULATED: there is no server, so the accounts are
   kept in localStorage through the functions of storage.js.

   1. Show / hide password buttons
   2. Sign up  -> validate, hash the password, save the user, open the profile
   3. Password strength meter (sign-up page)
   4. Log in   -> validate, compare the hashes, open the profile
   ========================================================================== */


/* ---------- 1. SHOW / HIDE PASSWORD ---------- */
document.querySelectorAll('[data-toggle-password]').forEach((button) => {
  button.addEventListener('click', () => {
    const field = document.getElementById(button.dataset.togglePassword);
    const show = field.type === 'password';
    field.type = show ? 'text' : 'password';
    button.querySelector('.bi').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(show));
  });
});

// where to go after logging in: login.html?next=courses.html sends the user back.
// Only our own page names are accepted, so the link cannot lead to another site.
function getNextPage() {
  const next = getUrlParam('next');
  return next && /^[a-z-]+\.html(#[a-z-]+)?$/.test(next) ? next : 'profile.html';
}

// somebody who is already logged in does not need these pages
if (getCurrentUser()) {
  flash('You are already logged in.', 'info');
  window.location.replace('profile.html');
}


/* ---------- 2. SIGN UP ---------- */
const signupForm = document.getElementById('signup-form');

if (signupForm) {
  setUpValidation(signupForm, {
    'signup-name': [
      rules.required('Enter your full name.'),
      rules.name(),
      rules.maxLength(60, 'The name is too long: 60 characters at most.')
    ],
    'signup-email': [
      rules.required('Enter your email address.'),
      rules.email(),
      // our own rule: one account per email
      (value) => (findUser(value) ? 'An account with this email already exists. Log in instead.' : '')
    ],
    'signup-phone': [
      rules.required('Enter your phone number.'),
      rules.phone()
    ],
    'signup-password': [
      rules.required('Create a password.'),
      rules.password()
    ],
    'signup-confirm': [
      rules.required('Repeat the password.'),
      rules.sameAs('signup-password', 'The passwords do not match.')
    ],
    'signup-terms': [
      rules.checked('Please tick the box to create an account.')
    ]
  }, () => {
    submitWithSpinner(signupForm, async () => {
      const email = normaliseEmail(document.getElementById('signup-email').value);
      const name = document.getElementById('signup-name').value.trim().replace(/\s+/g, ' ');
      const newUser = {
        name,
        email,
        phone: document.getElementById('signup-phone').value.trim(),
        passwordHash: await hashPassword(document.getElementById('signup-password').value),
        colour: pickAvatarColour(email),
        joined: new Date().toISOString(),
        savedCourses: [],
        enrolments: [],
        readingList: []
      };

      if (!addUser(newUser)) {
        showToast('Could not create the account: this browser blocks localStorage.', 'error');
        return;
      }
      startSession(email);   // signing up also logs the user in
      flash(`Welcome to EduSphere, ${getFirstName(name)}! Your account is ready.`, 'success');
      window.location.href = getNextPage();
    });
  });

  // when the password changes, the confirmation is checked again
  document.getElementById('signup-password').addEventListener('input', () => {
    updatePasswordMeter();
    const confirm = document.getElementById('signup-confirm');
    if (confirm.value !== '') {
      confirm.dispatchEvent(new Event('input'));
    }
  });
}


/* ---------- 3. PASSWORD STRENGTH METER ---------- */
const strengthLevels = [
  { max: 2, label: 'Too weak', colour: '#c8333d', width: 20 },
  { max: 4, label: 'Fair', colour: '#d4831a', width: 55 },
  { max: 5, label: 'Good', colour: '#16a394', width: 80 },
  { max: 6, label: 'Strong', colour: '#1f9d61', width: 100 }
];

function updatePasswordMeter() {
  const password = document.getElementById('signup-password').value;
  const checks = getPasswordChecks(password);   // from validation.js

  // tick every rule that is already met
  document.querySelectorAll('#password-rules li').forEach((item) => {
    item.classList.toggle('ok', password !== '' && checks[item.dataset.rule]);
  });

  const score = password === '' ? 0 : Object.values(checks).filter(Boolean).length;
  const level = strengthLevels.find((step) => score <= step.max);
  const bar = document.getElementById('password-meter-bar');
  bar.style.width = (password === '' ? 0 : level.width) + '%';
  bar.style.backgroundColor = level.colour;
  document.getElementById('password-strength').textContent = password === '' ? 'Too weak' : level.label;
}


/* ---------- 4. LOG IN ---------- */
const loginForm = document.getElementById('login-form');

if (loginForm) {
  const errorBox = document.getElementById('login-error');

  function showLoginError(message) {
    document.getElementById('login-error-text').textContent = message;
    errorBox.hidden = false;
    replayAnimation(errorBox, 'shake');
  }

  setUpValidation(loginForm, {
    'login-email': [rules.required('Enter the email you signed up with.'), rules.email()],
    'login-password': [rules.required('Enter your password.')]
  }, () => {
    errorBox.hidden = true;
    submitWithSpinner(loginForm, async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const account = findUser(email);

      if (!account) {
        showLoginError('There is no account with this email. Check the spelling or sign up first.');
        return;
      }
      if (await hashPassword(password) !== account.passwordHash) {
        showLoginError('The password is not correct. Try again — the letter case matters.');
        document.getElementById('login-password').select();
        return;
      }

      startSession(account.email);
      flash(`Welcome back, ${getFirstName(account.name)}!`, 'success');
      window.location.href = getNextPage();
    });
  });

  // typing again hides the old error
  loginForm.addEventListener('input', () => {
    errorBox.hidden = true;
  });
}
