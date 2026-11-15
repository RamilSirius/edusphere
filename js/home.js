/* ==========================================================================
   EduSphere — js/home.js (index.html)
   Author: Ramil Zhunussov

   1. Greeting        -> time of day + the name of the logged-in student
   2. Popular courses -> three cards built from js/data.js
   3. Next cohort     -> an object counts the places; a student can reserve one
   ========================================================================== */

const currentUser = getCurrentUser();


/* ---------- 1. GREETING ---------- */
// 0–5 h -> 0, 6–11 h -> 1, 12–17 h -> 2, 18–23 h -> 3
function greetingForHour(hour) {
  switch (Math.floor(hour / 6)) {
    case 0: return 'Still studying at night';
    case 1: return 'Good morning';
    case 2: return 'Good afternoon';
    default: return 'Good evening';
  }
}

function showGreeting() {
  const greeting = document.getElementById('greeting');
  const hello = greetingForHour(new Date().getHours());

  if (!currentUser) {
    greeting.textContent = `${hello}! Welcome to EduSphere.`;
    return;
  }

  const saved = getUserList('savedCourses').length;
  greeting.textContent = `${hello}, ${getFirstName(currentUser.name)}! ` +
    (saved > 0 ? `You have ${saved} saved ${saved === 1 ? 'course' : 'courses'}.` : 'Ready for today’s lesson?');

  // a logged-in student does not need "Create a free account"
  document.getElementById('hero-actions').innerHTML = `
    <a class="btn btn-primary btn-lg btn-arrow" href="courses.html">Browse courses <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i></a>
    <a class="btn btn-outline-primary btn-lg" href="profile.html">Go to my profile</a>`;
}


/* ---------- 2. POPULAR COURSES ---------- */
const POPULAR_IDS = ['html-css', 'javascript', 'sql'];

function renderPopularCourses() {
  const list = document.getElementById('popular-courses');
  list.innerHTML = POPULAR_IDS.map((id) => {
    const course = findCourse(id);
    // the course data is our own, not typed by a user, so a template is safe here
    return `
      <div class="col reveal">
        <article class="card card-hover h-100">
          <div class="img-zoom"><img class="card-img-top" src="${course.image}" alt="${course.alt}" width="400" height="240"></div>
          <div class="card-body d-flex flex-column">
            <span class="badge ${levelBadges[course.level]} align-self-start mb-2">${capitalize(course.level)} · ${course.weeks} weeks</span>
            <h3 class="h5">${course.title}</h3>
            <p class="text-secondary">${course.description}</p>
            <a class="btn btn-outline-primary btn-sm btn-arrow mt-auto align-self-start" href="courses.html?search=${encodeURIComponent(course.title)}">
              Course details <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
            </a>
          </div>
        </article>
      </div>`;
  }).join('');

  // the new cards fade in like the rest of the page
  list.querySelectorAll('.reveal').forEach((card, index) => {
    setTimeout(() => card.classList.add('is-visible'), 150 * index);
  });
}


/* ---------- 3. NEXT COHORT ----------
   The object keeps the numbers; renderCohort() shows them on the page.
   A reservation is stored in the student's profile (storage.js). */
const cohort = {
  totalPlaces: 18,
  takenPlaces: 12,   // places taken by other students

  freePlaces() {
    return this.totalPlaces - this.takenPlaces;
  },
  percentTaken() {
    return Math.round((this.takenPlaces / this.totalPlaces) * 100);
  }
};

function hasReservation() {
  return Boolean(currentUser && getCurrentUser().reservedCohort);
}

function renderCohort() {
  const taken = cohort.takenPlaces + (hasReservation() ? 1 : 0);
  const free = cohort.totalPlaces - taken;
  const percent = Math.round((taken / cohort.totalPlaces) * 100);

  document.getElementById('places-text').innerHTML =
    `${cohort.totalPlaces} places in the evening group, <strong>${free}</strong> still free.`;
  document.getElementById('places-bar').style.width = percent + '%';
  document.getElementById('places-progress').setAttribute('aria-valuenow', percent);

  const button = document.getElementById('reserve-btn');
  const message = document.getElementById('reserve-message');
  if (!currentUser) {
    button.innerHTML = '<i class="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i> Log in to reserve a place';
    message.textContent = '';
  } else if (hasReservation()) {
    button.innerHTML = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i> Cancel my reservation';
    button.classList.replace('btn-primary', 'btn-outline-primary');
    message.textContent = `${getFirstName(currentUser.name)}, your place is reserved. It is shown in your profile.`;
  } else {
    button.innerHTML = '<i class="bi bi-bookmark-star me-1" aria-hidden="true"></i> Reserve a place';
    button.classList.replace('btn-outline-primary', 'btn-primary');
    message.textContent = '';
  }
}

document.getElementById('reserve-btn').addEventListener('click', () => {
  if (!currentUser) {
    flash('Log in first — then you can reserve a place in the next cohort.', 'info');
    window.location.href = 'login.html?next=index.html';
    return;
  }
  const reserve = !hasReservation();
  updateUser(currentUser.email, { reservedCohort: reserve });
  renderCohort();
  replayAnimation(document.getElementById('reserve-message'), 'pop');
  showToast(reserve ? 'Place reserved in the 1 December cohort.' : 'Your reservation was cancelled.', reserve ? 'success' : 'info');
});


/* ---------- START ---------- */
showGreeting();
renderPopularCourses();
renderCohort();
