/* ==========================================================================
   EduSphere — js/script.js (shared by every page)
   Author: Maxim Batyushkin (UI) · Ramil Zhunussov (navbar account menu)

   Loaded after jQuery, Bootstrap, storage.js and validation.js.

   1. Light / dark mode switch      -> saved in localStorage
   2. Account area in the navbar    -> "Log in / Sign up" or the user's menu
   3. Messages for the next page    -> flash() + showToast()
   4. Loading button                -> submitWithSpinner()
   5. Scroll progress + back to top
   6. Reveal on scroll + number counters
   7. Copy to clipboard buttons
   8. Footer newsletter form
   9. Small helpers                 -> escapeHtml(), replayAnimation(), formatDate()
   ========================================================================== */


/* ---------- 1. LIGHT / DARK MODE ----------
   The small script in the <head> of every page already applied the saved
   theme before the page was drawn. Here we only handle the switch. */
const THEME_KEY = 'edusphere-theme';

function getTheme() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme);
  document.querySelectorAll('.theme-switch').forEach((button) => {
    const isDark = theme === 'dark';
    button.setAttribute('aria-checked', String(isDark));
    button.setAttribute('title', isDark ? 'Dark mode is on' : 'Light mode is on');
  });
}

function setUpThemeSwitch() {
  applyTheme(getTheme());   // sync the switch with the theme from the <head>

  document.querySelectorAll('.theme-switch').forEach((button) => {
    button.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.add('theme-animated');   // smooth colour change
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);   // every other page reads it
      } catch (error) {
        // storage blocked: the theme still changes on this page
      }
    });
  });
}


/* ---------- 2. ACCOUNT AREA IN THE NAVBAR ----------
   Guests see "Log in" and "Sign up" (that HTML is already in the page).
   A logged-in user sees an avatar with a dropdown menu instead. */
function renderAccountMenu() {
  const area = document.getElementById('nav-auth');
  const user = getCurrentUser();
  if (!area || !user) {
    return;
  }

  area.innerHTML = `
    <div class="dropdown user-menu">
      <a class="dropdown-toggle py-1" href="profile.html" role="button" data-bs-toggle="dropdown" aria-expanded="false">
        <span class="avatar" aria-hidden="true"></span>
        <span class="user-first-name fw-semibold"></span>
      </a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><span class="dropdown-item-text small text-secondary user-email"></span></li>
        <li><hr class="dropdown-divider"></li>
        <li><a class="dropdown-item" href="profile.html"><i class="bi bi-person-circle me-2" aria-hidden="true"></i>My profile</a></li>
        <li><a class="dropdown-item" href="profile.html#saved"><i class="bi bi-heart me-2" aria-hidden="true"></i>Saved courses</a></li>
        <li><a class="dropdown-item" href="library.html"><i class="bi bi-journal-bookmark me-2" aria-hidden="true"></i>Reading list</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item text-danger" type="button" data-action="logout"><i class="bi bi-box-arrow-right me-2" aria-hidden="true"></i>Log out</button></li>
      </ul>
    </div>`;

  // user data is added with textContent, never as HTML
  const avatar = area.querySelector('.avatar');
  avatar.textContent = getInitials(user.name);
  avatar.style.setProperty('--avatar-colour', user.colour);
  area.querySelector('.user-first-name').textContent = getFirstName(user.name);
  area.querySelector('.user-email').textContent = user.email;
}

function logOut() {
  endSession();
  flash('You have logged out. See you soon!', 'info');
  window.location.href = 'index.html';
}

// any element with data-action="logout" logs out (navbar menu, profile page)
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-action="logout"]')) {
    logOut();
  }
});


/* ---------- 3. MESSAGES ----------
   flash() keeps a message for the NEXT page (e.g. "Welcome!" after the
   sign-up page sends the user to the profile). sessionStorage is used
   because the message is needed only once, in this tab. */
const FLASH_KEY = 'edusphere-flash';

function flash(message, type) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
  } catch (error) {
    // the message is simply not shown
  }
}

function showFlash() {
  try {
    const saved = sessionStorage.getItem(FLASH_KEY);
    if (saved) {
      sessionStorage.removeItem(FLASH_KEY);
      const { message, type } = JSON.parse(saved);
      showToast(message, type);
    }
  } catch (error) {
    // nothing to show
  }
}

// Toast notifications built with jQuery: fade in, wait, fade out, remove.
const TOAST_TIME = 3800;
const MAX_TOASTS = 3;
const toastIcons = {
  success: 'bi-check-circle-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  error: 'bi-x-octagon-fill'
};

function closeToast($toast) {
  $toast.stop(true).fadeOut(250, function () {
    $(this).remove();
  });
}

function showToast(message, type = 'success') {
  let $stack = $('#toast-stack');
  if ($stack.length === 0) {
    $stack = $('<div id="toast-stack" class="toast-stack" aria-live="polite"></div>').appendTo('body');
  }

  const $toast = $('<div class="edu-toast" role="status"></div>')
    .addClass('edu-toast-' + type)
    .append($('<i class="bi" aria-hidden="true"></i>').addClass(toastIcons[type] || toastIcons.info))
    .append($('<span></span>').text(message))   // .text(): never read as HTML
    .append('<button class="edu-toast-close" type="button" aria-label="Close notification">&times;</button>')
    .append('<span class="edu-toast-timer"></span>');

  $toast.hide().appendTo($stack).fadeIn(200).delay(TOAST_TIME).fadeOut(350, function () {
    $(this).remove();
  });
  $toast.find('.edu-toast-timer').animate({ width: 0 }, TOAST_TIME + 200, 'linear');
  $toast.find('.edu-toast-close').on('click', () => closeToast($toast));

  // only the newest MAX_TOASTS stay on screen
  $stack.children().slice(0, -MAX_TOASTS).each(function () {
    closeToast($(this));
  });
}


/* ---------- 4. LOADING BUTTON ----------
   While the "server" answers, the submit button shows a spinner and is
   disabled, so the form cannot be sent twice. */
const FAKE_SERVER_DELAY = 1200;

function submitWithSpinner(form, onDone) {
  const $button = $(form).find('[type="submit"]').last();
  if ($button.prop('disabled')) {
    return;
  }
  $button
    .data('originalHtml', $button.html())
    .prop('disabled', true)
    .attr('aria-busy', 'true')
    .html('<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Please wait…');

  setTimeout(() => {
    $button.html($button.data('originalHtml')).prop('disabled', false).removeAttr('aria-busy');
    onDone();
  }, FAKE_SERVER_DELAY);
}


/* ---------- 5. SCROLL PROGRESS + BACK TO TOP ---------- */
function setUpScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.innerHTML = '<div class="scroll-progress-bar"></div>';
  document.body.prepend(bar);

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.setAttribute('aria-label', 'Back to top');
  topButton.innerHTML = '<i class="bi bi-arrow-up" aria-hidden="true"></i>';
  document.body.appendChild(topButton);

  function update() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    bar.firstElementChild.style.width = percent + '%';
    topButton.classList.toggle('visible', window.scrollY > 400);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  update();
}


/* ---------- 6. REVEAL ON SCROLL + NUMBER COUNTERS ----------
   IntersectionObserver tells us when an element enters the screen.
   .reveal blocks slide in once; .counter numbers count up once. */
const COUNTER_TIME = 1800;

function runCounter($counter) {
  const target = Number($counter.data('count'));
  const decimals = Number($counter.data('decimals') || 0);
  const suffix = $counter.data('suffix') || '';
  const format = (value) => value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + suffix;

  // jQuery can animate a number in a plain object, not only CSS
  $({ value: 0 }).animate({ value: target }, {
    duration: COUNTER_TIME,
    easing: 'swing',
    step: (now) => $counter.text(format(now)),
    complete: () => $counter.text(format(target))
  });
}

function setUpRevealAndCounters() {
  const items = document.querySelectorAll('.reveal, .counter');
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }
      const element = entry.target;
      if (element.classList.contains('counter')) {
        runCounter($(element));
      } else {
        element.classList.add('is-visible');
      }
      observer.unobserve(element);   // each element animates only once
    });
  }, { threshold: 0.15 });

  items.forEach((item) => observer.observe(item));
}


/* ---------- 7. COPY TO CLIPBOARD ----------
   <button class="copy-btn" data-copy="#element-id"> copies that element's text */
function setUpCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const source = document.querySelector(button.dataset.copy);
      const text = source ? source.textContent.trim() : '';
      if (!navigator.clipboard) {
        showToast('Copying is blocked here. Select the text and press Ctrl+C.', 'warning');
        return;
      }
      navigator.clipboard.writeText(text)
        .then(() => {
          const icon = button.querySelector('.bi');
          const label = button.querySelector('.copy-label');
          button.classList.add('copied');
          icon.classList.replace('bi-clipboard', 'bi-check2');
          if (label) label.textContent = 'Copied';
          setTimeout(() => {
            button.classList.remove('copied');
            icon.classList.replace('bi-check2', 'bi-clipboard');
            if (label) label.textContent = 'Copy';
          }, 1800);
          showToast('Copied to clipboard: ' + text, 'info');
        })
        .catch(() => showToast('Copying is blocked by the browser. Select the text and press Ctrl+C.', 'warning'));
    });
  });
}


/* ---------- 8. FOOTER NEWSLETTER ----------
   The footer form exists on every page, so it is validated here. */
const NEWSLETTER_KEY = 'edusphere-newsletter';

function setUpNewsletter() {
  const form = document.getElementById('newsletter-form');
  if (!form) {
    return;
  }
  setUpValidation(form, {
    'newsletter-email': [rules.required('Enter your email to subscribe.'), rules.email()]
  }, () => {
    const field = document.getElementById('newsletter-email');
    const email = normaliseEmail(field.value);
    const list = readJSON(NEWSLETTER_KEY, []);
    if (list.includes(email)) {
      showToast('This email is already subscribed to the open lectures.', 'info');
    } else {
      list.push(email);
      writeJSON(NEWSLETTER_KEY, list);
      showToast('Subscribed! The next open lecture invitation goes to ' + email + '.', 'success');
    }
    form.reset();
  });

  // logged-in users get their email filled in
  const user = getCurrentUser();
  if (user) {
    document.getElementById('newsletter-email').value = user.email;
  }
}


/* ---------- 9. SMALL HELPERS (used by the page scripts) ---------- */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// a CSS animation runs again only if its class is removed and added back
function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;   // makes the browser notice the removal
  element.classList.add(className);
}

function formatDate(isoText) {
  return new Date(isoText).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// reads ?name=value from the address bar, e.g. getUrlParam('topic')
function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}


/* ---------- START ---------- */
setUpThemeSwitch();
renderAccountMenu();
setUpScrollProgress();
setUpRevealAndCounters();
setUpCopyButtons();
setUpNewsletter();
$(showFlash);   // after the page is ready, so the toast appears on top
