/* ==========================================================================
   EduSphere — js/profile.js (profile.html)
   Author: Ramil Zhunussov

   1. Guard        -> guests are sent to the log-in page
   2. Details      -> the stored user data is shown on the page
   3. Lists        -> enrolments, saved courses, reading list (with Remove)
   4. Edit profile -> validated form, saved back to localStorage
   5. Password     -> current password is checked, new one is hashed
   6. Delete       -> Bootstrap modal, then the account is removed
   ========================================================================== */


/* ---------- 1. GUARD ---------- */
let profileUser = getCurrentUser();

if (!profileUser) {
  flash('Please log in to see your profile.', 'info');
  window.location.replace('login.html?next=profile.html');
} else {
  document.getElementById('profile-root').hidden = false;
  renderProfile();
  setUpProfileForm();
  setUpPasswordForm();
  setUpDelete();

  // links like profile.html#saved: the block was hidden while the page loaded,
  // so the browser could not scroll to it by itself
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      target.scrollIntoView();
    }
  }
}


/* ---------- 2. DETAILS ---------- */
function renderProfile() {
  profileUser = getCurrentUser();   // always the newest data from localStorage
  const user = profileUser;

  document.title = `${user.name} — My Profile — EduSphere`;
  const avatar = document.getElementById('profile-avatar');
  avatar.textContent = getInitials(user.name);
  avatar.style.setProperty('--avatar-colour', user.colour);
  document.getElementById('profile-cover').style.setProperty('--avatar-colour', user.colour);

  // textContent: the values were typed by the user, so they are never read as HTML
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email-line').textContent = user.email;
  document.getElementById('profile-joined').textContent = formatDate(user.joined);
  document.getElementById('detail-name').textContent = user.name;
  document.getElementById('detail-email').textContent = user.email;
  document.getElementById('detail-phone').textContent = user.phone;
  document.getElementById('detail-joined').textContent = formatDate(user.joined);

  document.getElementById('stat-saved').textContent = user.savedCourses.length;
  document.getElementById('stat-enrolments').textContent = user.enrolments.length;
  document.getElementById('stat-reading').textContent = user.readingList.length;
  document.getElementById('stat-cohort').textContent = user.reservedCohort ? '1 Dec' : '—';

  renderEnrolments();
  renderSavedCourses();
  renderReadingList();
}


/* ---------- 3. LISTS ---------- */
function emptyState(icon, text, linkHref, linkText) {
  return `<div class="empty-state"><i class="bi ${icon} fs-3 d-block mb-2" aria-hidden="true"></i>
    <p class="mb-2">${text}</p><a class="btn btn-outline-primary btn-sm" href="${linkHref}">${linkText}</a></div>`;
}

function removeButton(index, list, label) {
  return `<button class="btn btn-outline-danger btn-sm ms-auto flex-shrink-0" type="button"
    data-remove="${list}" data-index="${index}" aria-label="Remove ${label}"><i class="bi bi-trash" aria-hidden="true"></i></button>`;
}

function renderEnrolments() {
  const box = document.getElementById('enrolment-list');
  const items = profileUser.enrolments;
  if (items.length === 0) {
    box.innerHTML = emptyState('bi-calendar-plus', 'You are not enrolled in any course yet.', 'courses.html#enrol', 'Enrol now');
    return;
  }
  box.innerHTML = '<ul class="list-group profile-list">' + items.map((item, index) => {
    const course = findCourse(item.courseId);
    return `<li class="list-group-item">
      <img src="${course.image}" alt="" width="64" height="38" class="rounded">
      <div><strong class="d-block">${course.title}</strong>
        <span class="small text-secondary">${studyFormats[item.format]} · since ${formatDate(item.date)}</span></div>
      ${removeButton(index, 'enrolments', course.title)}
    </li>`;
  }).join('') + '</ul>';
}

function renderSavedCourses() {
  const box = document.getElementById('saved-list');
  const ids = profileUser.savedCourses;
  if (ids.length === 0) {
    box.innerHTML = emptyState('bi-heart', 'No saved courses yet. Press the heart on a course card.', 'courses.html', 'Find a course');
    return;
  }
  box.innerHTML = '<ul class="list-group profile-list">' + ids.map((id, index) => {
    const course = findCourse(id);
    return `<li class="list-group-item">
      <img src="${course.image}" alt="" width="64" height="38" class="rounded">
      <div><strong class="d-block">${course.title}</strong>
        <span class="small text-secondary">${capitalize(course.level)} · ${course.weeks} weeks</span></div>
      <a class="btn btn-primary btn-sm ms-auto flex-shrink-0" href="courses.html?search=${encodeURIComponent(course.title)}">Open</a>
      ${removeButton(index, 'savedCourses', course.title).replace('ms-auto ', '')}
    </li>`;
  }).join('') + '</ul>';
}

function renderReadingList() {
  const box = document.getElementById('reading-list');
  const items = profileUser.readingList;
  if (items.length === 0) {
    box.innerHTML = emptyState('bi-journal-plus', 'Your reading list is empty. Look up a topic in the library and press “Save”.', 'library.html', 'Open the library');
    return;
  }
  const list = document.createElement('ul');
  list.className = 'list-group profile-list';
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.innerHTML = `<i class="bi bi-file-earmark-text fs-4 text-accent" aria-hidden="true"></i>
      <div><a class="fw-semibold" target="_blank" rel="noopener"></a><span class="d-block small text-secondary">Wikipedia article</span></div>
      ${removeButton(index, 'readingList', 'article')}`;
    // the title comes from Wikipedia, so it is added as text
    const link = li.querySelector('a');
    link.textContent = item.title;
    link.href = item.url;
    list.appendChild(li);
  });
  box.innerHTML = '';
  box.appendChild(list);
}

// one click handler for every "Remove" button (event delegation)
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove]');
  if (!button) {
    return;
  }
  const listName = button.dataset.remove;
  const items = [...profileUser[listName]];
  items.splice(Number(button.dataset.index), 1);
  updateUser(profileUser.email, { [listName]: items });
  renderProfile();
  showToast('Removed from your profile.', 'info');
});


/* ---------- 4. EDIT PROFILE ---------- */
function setUpProfileForm() {
  const form = document.getElementById('profile-form');
  const nameField = document.getElementById('profile-name-input');
  const emailField = document.getElementById('profile-email-input');
  const phoneField = document.getElementById('profile-phone-input');

  function fillForm() {
    nameField.value = profileUser.name;
    emailField.value = profileUser.email;
    phoneField.value = profileUser.phone;
  }

  setUpValidation(form, {
    'profile-name-input': [rules.required('Enter your full name.'), rules.name(), rules.maxLength(60, 'The name is too long: 60 characters at most.')],
    'profile-email-input': [
      rules.required('Enter your email address.'),
      rules.email(),
      (value) => {
        const other = findUser(value);
        return other && other.email !== profileUser.email ? 'Another account already uses this email.' : '';
      }
    ],
    'profile-phone-input': [rules.required('Enter your phone number.'), rules.phone()]
  }, () => {
    const oldEmail = profileUser.email;
    const newEmail = normaliseEmail(emailField.value);
    updateUser(oldEmail, {
      name: nameField.value.trim().replace(/\s+/g, ' '),
      email: newEmail,
      phone: phoneField.value.trim()
    });
    if (newEmail !== oldEmail) {
      startSession(newEmail);   // the session remembers the user by email
    }
    renderProfile();
    renderAccountMenu();        // the navbar shows the new name (script.js)
    showToast('Your profile was updated.', 'success');
  });

  fillForm();
}


/* ---------- 5. CHANGE PASSWORD ---------- */
function setUpPasswordForm() {
  const form = document.getElementById('password-form');
  setUpValidation(form, {
    'current-password': [rules.required('Enter your current password.')],
    'new-password': [rules.required('Enter a new password.'), rules.password()],
    'confirm-password': [rules.required('Repeat the new password.'), rules.sameAs('new-password', 'The new passwords do not match.')]
  }, async () => {
    const current = document.getElementById('current-password');
    if (await hashPassword(current.value) !== profileUser.passwordHash) {
      showFieldError(current, 'This is not your current password.');   // validation.js
      current.focus();
      return;
    }
    updateUser(profileUser.email, { passwordHash: await hashPassword(document.getElementById('new-password').value) });
    profileUser = getCurrentUser();
    form.reset();
    showToast('Password changed. Use the new one next time you log in.', 'success');
  });
}


/* ---------- 6. DELETE ACCOUNT ---------- */
function setUpDelete() {
  document.getElementById('confirm-delete').addEventListener('click', () => {
    deleteUser(profileUser.email);
    endSession();
    flash('Your account was deleted.', 'info');
    window.location.href = 'index.html';
  });
}
