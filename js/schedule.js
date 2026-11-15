/* ==========================================================================
   EduSphere — js/schedule.js (schedule.html)
   Author: Azamat Mustafin

   1. Today      -> today's column of the timetable is highlighted
   2. Filter     -> one course is highlighted, the others fade;
                    the choice is saved in localStorage
   3. Next class -> the next live class of the chosen course
   ========================================================================== */

const SCHEDULE_KEY = 'edusphere-schedule-filter';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const table = document.getElementById('timetable');
const courseFilter = document.getElementById('course-filter');


/* ---------- 1. TODAY ---------- */
// getDay(): 0 = Sunday, 1 = Monday ... 6 = Saturday. Column 0 is the time.
function highlightToday() {
  const today = new Date().getDay();
  if (today === 0) {
    return;   // Sunday: no classes, nothing to highlight
  }
  table.querySelectorAll('tr').forEach((row) => {
    const cell = row.children[today];
    if (cell) {
      cell.classList.add('is-today');
    }
  });
  const header = table.querySelector(`th[data-day="${today}"]`);
  header.innerHTML += ' <span class="badge text-bg-warning">Today</span>';
}


/* ---------- 2. COURSE FILTER ---------- */
function applyFilter(course) {
  table.querySelectorAll('tbody td').forEach((cell) => {
    const matches = course === 'all' || cell.dataset.course === course;
    cell.classList.toggle('dimmed', !matches);
    cell.classList.toggle('match', course !== 'all' && matches);
  });
  writeJSON(SCHEDULE_KEY, course);
  showNextClass(course);
}

courseFilter.addEventListener('change', () => applyFilter(courseFilter.value));


/* ---------- 3. NEXT CLASS ----------
   Every row has data-start="18:00"; every column is a day. We look at the
   rest of today and then the next seven days (the same weekday next week
   too) and stop at the first class. */
function showNextClass(course) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const rows = Array.from(table.querySelectorAll('tbody tr'));

  for (let offset = 0; offset <= 7; offset++) {
    const day = (now.getDay() + offset) % 7;
    if (day === 0) {
      continue;   // no classes on Sunday
    }
    for (const row of rows) {
      const [hours, minutes] = row.dataset.start.split(':').map(Number);
      const start = hours * 60 + minutes;
      const cell = row.children[day];
      const isClass = cell.dataset.course && (course === 'all' || cell.dataset.course === course);
      if (isClass && (offset > 0 || start > nowMinutes)) {
        let when = DAY_NAMES[day];
        if (offset === 0) when = 'Today';
        if (offset === 1) when = 'Tomorrow';
        if (offset === 7) when = 'Next ' + DAY_NAMES[day];
        const title = cell.childNodes[0].textContent.trim();
        document.getElementById('next-class').textContent = `${title} — ${when} at ${row.dataset.start}`;
        return;
      }
    }
  }
  document.getElementById('next-class').textContent = 'No classes this week';
}


/* ---------- START ---------- */
highlightToday();
const savedCourse = readJSON(SCHEDULE_KEY, 'all');
courseFilter.value = courseFilter.querySelector(`option[value="${savedCourse}"]`) ? savedCourse : 'all';
applyFilter(courseFilter.value);
