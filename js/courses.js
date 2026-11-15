/* ==========================================================================
   EduSphere — js/courses.js (courses.html)
   Authors: Azamat Mustafin (search, filters, localStorage)
            Ramil Zhunussov (cards, rating, saved courses, enrolment)

   1. Filters       -> search text, level, duration, sort, "saved only";
                       all of them are saved in localStorage
   2. Catalogue     -> cards are built from js/data.js
   3. Rating        -> stars, saved in localStorage
   4. Saved courses -> heart button, stored in the user's profile
   5. Enrolment     -> four-step form checked by validation.js
   ========================================================================== */

const user = getCurrentUser();


/* ---------- 1. FILTERS ---------- */
const FILTERS_KEY = 'edusphere-course-filters';
const RATINGS_KEY = 'edusphere-ratings';
const MAX_STARS = 5;
const DEFAULT_FILTERS = { search: '', level: 'all', duration: 'any', sort: 'default', savedOnly: false };

// saved filters first; a link like courses.html?search=SQL starts from clean
// filters, so the course it points to is never hidden by an old filter
const filters = { ...DEFAULT_FILTERS, ...readJSON(FILTERS_KEY, {}) };
if (getUrlParam('search')) {
  Object.assign(filters, DEFAULT_FILTERS, { search: getUrlParam('search') });
}
if (!user) {
  filters.savedOnly = false;   // guests have no saved courses
}

// a logged-in student keeps the ratings in the profile; a guest in this browser
const ratings = user ? { ...(user.ratings || {}) } : readJSON(RATINGS_KEY, {});

function saveRatings() {
  if (user) {
    updateUser(user.email, { ratings });
  } else {
    writeJSON(RATINGS_KEY, ratings);
  }
}

const courseList = document.getElementById('course-list');
const durationSelect = document.getElementById('duration-filter');
const sortSelect = document.getElementById('sort-select');
const savedOnlySwitch = document.getElementById('saved-only');
const searchInput = document.getElementById('course-search');

function saveFilters() {
  writeJSON(FILTERS_KEY, filters);
}

// puts the saved values back into the controls on the page
function showFiltersInControls() {
  searchInput.value = filters.search;
  document.querySelector(`input[name="level"][value="${filters.level}"]`).checked = true;
  durationSelect.value = filters.duration;
  sortSelect.value = filters.sort;
  savedOnlySwitch.checked = filters.savedOnly;
}

function matchesSearch(course, query) {
  if (query === '') {
    return true;
  }
  const text = [course.title, course.description, course.direction, course.level, ...course.topics]
    .join(' ')
    .toLowerCase();
  return text.includes(query.toLowerCase());
}

function matchesDuration(course, range) {
  switch (range) {
    case 'short': return course.weeks <= 8;
    case 'medium': return course.weeks >= 9 && course.weeks <= 12;
    case 'long': return course.weeks >= 13;
    default: return true;   // "any"
  }
}

function sortCourses(list) {
  const sorted = [...list];   // copy: the original order stays in data.js
  switch (filters.sort) {
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'short':
      sorted.sort((a, b) => a.weeks - b.weeks);
      break;
    case 'rating':
      sorted.sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));
      break;
    default:
      break;
  }
  return sorted;
}

// called by search.js every time the search text changes
function setCourseSearch(text) {
  filters.search = text;
  renderCourses();
}

document.querySelectorAll('input[name="level"]').forEach((input) => {
  input.addEventListener('change', () => {
    filters.level = input.value;
    renderCourses();
  });
});

durationSelect.addEventListener('change', () => {
  filters.duration = durationSelect.value;
  renderCourses();
});

sortSelect.addEventListener('change', () => {
  filters.sort = sortSelect.value;
  renderCourses();
});

savedOnlySwitch.addEventListener('change', () => {
  if (!user) {
    savedOnlySwitch.checked = false;
    showToast('Log in to save courses — then you can show only your favourites.', 'info');
    return;
  }
  filters.savedOnly = savedOnlySwitch.checked;
  renderCourses();
});

function resetFilters() {
  Object.assign(filters, DEFAULT_FILTERS);
  showFiltersInControls();
  renderCourses();
  showToast('All filters were reset.', 'info');
}

document.getElementById('reset-filters').addEventListener('click', resetFilters);


/* ---------- 2. CATALOGUE ---------- */
function starButtons(course) {
  let html = '';
  for (let value = 1; value <= MAX_STARS; value++) {
    html += `<button class="star" type="button" data-value="${value}" aria-label="Rate ${course.title} ${value} of ${MAX_STARS}">★</button>`;
  }
  return html;
}

function createCourseCard(course, index) {
  const column = document.createElement('div');
  column.className = 'col fade-in';
  column.style.animationDelay = `${index * 70}ms`;   // cards appear one after another

  const topics = course.topics.map((topic) => `<li class="list-group-item px-0">${topic}</li>`).join('');

  // the course data is our own (not typed by a user), so a template is safe here
  column.innerHTML = `
    <article class="card card-hover h-100 position-relative">
      <button class="save-btn" type="button" aria-pressed="false" aria-label="Save ${course.title}">
        <i class="bi bi-heart" aria-hidden="true"></i>
      </button>
      <div class="img-zoom"><img class="card-img-top" src="${course.image}" alt="${course.alt}" width="400" height="240"></div>
      <div class="card-body d-flex flex-column">
        <div class="d-flex flex-wrap gap-2 mb-2">
          <span class="badge ${levelBadges[course.level]}">${capitalize(course.level)}</span>
          <span class="badge bg-body-tertiary text-body border">${course.weeks} weeks</span>
        </div>
        <h3 class="card-title h5">${course.title}</h3>
        <p class="card-text text-secondary small">${course.description}</p>
        <div class="rating d-flex align-items-center mb-2" role="group" aria-label="Rate ${course.title}">
          ${starButtons(course)}
          <span class="rating-text small text-secondary ms-2">Not rated</span>
        </div>
        <button class="btn btn-link btn-sm px-0 align-self-start read-more" type="button" aria-expanded="false">
          Show syllabus <i class="bi bi-chevron-down" aria-hidden="true"></i>
        </button>
        <ul class="list-group list-group-flush small syllabus mb-2">${topics}</ul>
        <div class="mt-auto pt-2 d-grid gap-1">
          <button class="btn btn-primary enrol-btn" type="button">Enrol now</button>
          <a class="btn btn-link btn-sm" href="library.html?topic=${encodeURIComponent(course.wikiTopic)}">
            <i class="bi bi-book me-1" aria-hidden="true"></i>Read about ${course.wikiTopic.replace(/ \(.*\)/, '')}
          </a>
        </div>
      </div>
    </article>`;

  setUpRating(column, course);
  setUpSaveButton(column, course);
  setUpReadMore(column);
  column.querySelector('.enrol-btn').addEventListener('click', () => startEnrolment(course.id));
  return column;
}

function renderCourses() {
  const saved = getUserList('savedCourses');
  const visible = sortCourses(courses.filter((course) =>
    (filters.level === 'all' || course.level === filters.level) &&
    matchesDuration(course, filters.duration) &&
    matchesSearch(course, filters.search) &&
    (!filters.savedOnly || saved.includes(course.id))
  ));

  courseList.innerHTML = '';
  visible.forEach((course, index) => courseList.appendChild(createCourseCard(course, index)));

  if (visible.length === 0) {
    courseList.innerHTML = `
      <div class="col-12">
        <div class="empty-state">
          <i class="bi bi-search display-6 d-block mb-2" aria-hidden="true"></i>
          <p class="mb-3">No course matches these filters.</p>
          <button class="btn btn-outline-primary btn-sm" type="button" id="empty-reset">Reset filters</button>
        </div>
      </div>`;
    document.getElementById('empty-reset').addEventListener('click', resetFilters);
  }

  // search.js wraps the matching words in <mark>
  const hits = highlightMatches($(courseList).find('.card-title, .card-text, .syllabus li'), filters.search);

  const count = visible.length;
  document.getElementById('filter-result').textContent =
    `Showing ${count} of ${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`;
  document.getElementById('search-result').textContent = filters.search.length >= 2 && count > 0
    ? `${hits} ${hits === 1 ? 'match' : 'matches'} for “${filters.search}”`
    : '';

  saveFilters();
}


/* ---------- READ MORE (syllabus) ---------- */
function setUpReadMore(card) {
  const button = card.querySelector('.read-more');
  const syllabus = card.querySelector('.syllabus');
  button.addEventListener('click', () => {
    const open = syllabus.classList.toggle('open');
    button.innerHTML = open
      ? 'Hide syllabus <i class="bi bi-chevron-up" aria-hidden="true"></i>'
      : 'Show syllabus <i class="bi bi-chevron-down" aria-hidden="true"></i>';
    button.setAttribute('aria-expanded', String(open));
  });
}


/* ---------- 3. RATING ---------- */
function setUpRating(card, course) {
  const stars = card.querySelectorAll('.star');
  const ratingText = card.querySelector('.rating-text');

  function paint() {
    const rating = ratings[course.id] || 0;
    stars.forEach((star, index) => star.classList.toggle('active', index < rating));
    ratingText.textContent = rating > 0 ? `Your rating: ${rating}/${MAX_STARS}` : 'Not rated';
  }

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      ratings[course.id] = Number(star.dataset.value);
      saveRatings();
      paint();
      replayAnimation(star, 'pop');
      showRatingSummary();
      showToast(`You rated “${course.title}” ${ratings[course.id]} of ${MAX_STARS}.`, 'info');
    });
  });
  paint();
}

function showRatingSummary() {
  const rated = courses.filter((course) => ratings[course.id] > 0);
  const summary = document.getElementById('rating-summary');
  if (rated.length === 0) {
    return;
  }
  const total = rated.reduce((sum, course) => sum + ratings[course.id], 0);
  const favourite = rated.reduce((best, course) => (ratings[course.id] > ratings[best.id] ? course : best));
  summary.innerHTML = `Rated <strong>${rated.length}</strong> of ${courses.length} courses, ` +
    `average <strong>${(total / rated.length).toFixed(1)} ★</strong>.<br>Favourite: <strong>${favourite.title}</strong>`;
}


/* ---------- 4. SAVED COURSES ---------- */
function setUpSaveButton(card, course) {
  const button = card.querySelector('.save-btn');

  function paint(isSaved) {
    button.classList.toggle('saved', isSaved);
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', (isSaved ? 'Remove from saved: ' : 'Save ') + course.title);
  }

  paint(getUserList('savedCourses').includes(course.id));

  button.addEventListener('click', () => {
    if (!user) {
      showToast('Log in to save courses — they will wait for you in your profile.', 'info');
      return;
    }
    const isSaved = toggleSavedCourse(course.id);
    paint(isSaved);
    replayAnimation(button, 'pop');
    showToast(isSaved ? `“${course.title}” saved to your profile.` : `“${course.title}” removed from saved.`,
      isSaved ? 'success' : 'info');
    if (filters.savedOnly && !isSaved) {
      renderCourses();   // the card must disappear from the "saved only" list
    }
  });
}


/* ---------- 5. MULTI-STEP ENROLMENT ---------- */
const enrolSection = document.getElementById('enrol');
const enrolForm = document.getElementById('enrol-form');
const steps = enrolForm.querySelectorAll('.wizard-step');
const courseSelect = document.getElementById('enrol-course');
const backButton = document.getElementById('back-btn');
const nextButton = document.getElementById('next-btn');
const confirmButton = document.getElementById('confirm-btn');
const enrolSuccess = document.getElementById('enrol-success');

// the fields of each step; step 4 only shows the summary
const stepFields = [['enrol-course'], ['enrol-format'], ['enrol-name', 'enrol-email', 'enrol-phone'], []];
let currentStep = 0;

courseSelect.innerHTML += courses.map((course) => `<option value="${course.id}">${course.title}</option>`).join('');

const enrolValidator = setUpValidation(enrolForm, {
  'enrol-course': [rules.required('Choose a course from the list.')],
  'enrol-format': [rules.oneChecked('Choose one of the three study formats.')],
  'enrol-name': [rules.required('Enter your full name.'), rules.name()],
  'enrol-email': [rules.required('Enter your email address.'), rules.email()],
  'enrol-phone': [rules.required('Enter your phone number so a mentor can call you.'), rules.phone()]
}, onEnrolSubmit, {
  activeFields: () => stepFields.slice(0, currentStep + 1).flat()
});

function selectedFormat() {
  const checked = enrolForm.querySelector('input[name="format"]:checked');
  return checked ? checked.value : '';
}

function fillSummary() {
  const rows = [
    ['Course', findCourse(courseSelect.value).title],
    ['Format', studyFormats[selectedFormat()]],
    ['Name', document.getElementById('enrol-name').value.trim()],
    ['Email', document.getElementById('enrol-email').value.trim()],
    ['Phone', document.getElementById('enrol-phone').value.trim()]
  ];
  const list = document.getElementById('enrol-summary');
  list.innerHTML = '';
  rows.forEach(([label, value]) => {
    const item = document.createElement('li');
    item.className = 'list-group-item';
    item.innerHTML = `<strong>${label}:</strong> `;
    item.append(value);   // typed by the user -> added as text, never as HTML
    list.appendChild(item);
  });
}

function showStep(index) {
  currentStep = index;
  steps.forEach((step, i) => {
    step.hidden = i !== index;
  });
  replayAnimation(steps[index], 'fade-in');

  const isLast = index === steps.length - 1;
  if (isLast) {
    fillSummary();
  }
  const percent = Math.round(((index + 1) / steps.length) * 100);
  const bar = document.getElementById('wizard-bar');
  document.getElementById('wizard-status').textContent = `Step ${index + 1} of ${steps.length}`;
  bar.style.width = `${percent}%`;
  bar.parentElement.setAttribute('aria-valuenow', percent);   // for screen readers
  backButton.disabled = index === 0;
  nextButton.style.display = isLast ? 'none' : '';
  confirmButton.style.display = isLast ? 'inline-block' : 'none';
}

function goToNextStep() {
  const result = enrolValidator.validate(stepFields[currentStep]);
  enrolValidator.showSummary(result.errors);
  if (result.errors > 0) {
    result.firstInvalid.focus();
    replayAnimation(enrolForm, 'shake');
    return;
  }
  showStep(currentStep + 1);
}

// Enter inside a field submits the form: before the last step it means "Next"
function onEnrolSubmit() {
  if (currentStep < steps.length - 1) {
    showStep(currentStep + 1);
    return;
  }
  submitWithSpinner(enrolForm, () => {
    const course = findCourse(courseSelect.value);
    const name = getFirstName(document.getElementById('enrol-name').value);
    let text = `Thank you, ${name}! You are enrolled in “${course.title}”. A mentor will contact you within 24 hours.`;
    if (user) {
      addEnrolment(course.id, selectedFormat());
      text += ' The enrolment is now in your profile.';
    } else {
      text += ' Create a free account to keep track of your enrolments.';
    }
    enrolSuccess.textContent = text;
    enrolSuccess.hidden = false;
    replayAnimation(enrolSuccess, 'pop');
    showToast(`Enrolment confirmed: ${course.title}`, 'success');
  });
}

nextButton.addEventListener('click', goToNextStep);
backButton.addEventListener('click', () => {
  enrolValidator.showSummary(0);
  showStep(Math.max(currentStep - 1, 0));
});

function fillUserDetails() {
  if (!user) {
    return;
  }
  document.getElementById('enrol-name').value = user.name;
  document.getElementById('enrol-email').value = user.email;
  document.getElementById('enrol-phone').value = user.phone;
  document.getElementById('enrol-login-hint').innerHTML =
    '<i class="bi bi-person-check me-1" aria-hidden="true"></i>You are logged in, so your contacts are already filled in.';
}

document.getElementById('clear-btn').addEventListener('click', () => {
  enrolForm.reset();   // validation.js clears the red / green marks
  enrolSuccess.hidden = true;
  setTimeout(fillUserDetails, 0);
  showStep(0);
});

// "Enrol now" on a card: choose that course and continue with step 2
function startEnrolment(courseId) {
  courseSelect.value = courseId;
  enrolValidator.showSummary(0);
  enrolSuccess.hidden = true;
  showStep(1);
  enrolSection.scrollIntoView({ behavior: 'smooth' });
  replayAnimation(enrolSection.querySelector('.surface'), 'highlight');
}


/* ---------- START ---------- */
showFiltersInControls();
renderCourses();
showRatingSummary();
fillUserDetails();
showStep(0);
