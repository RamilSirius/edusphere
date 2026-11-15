/* ==========================================================================
   EduSphere — js/storage.js
   Author: Ramil Zhunussov

   Everything the site remembers lives in localStorage (there is no backend).
   This file is the only place that reads and writes it, so the other
   scripts never touch localStorage directly.

   1. Safe read / write        -> readJSON(), writeJSON()
   2. Users and the session    -> getUsers(), findUser(), getCurrentUser() ...
   3. Per-user lists           -> saved courses, enrolments, reading list
   4. Password hashing         -> hashPassword() with SHA-256

   KEYS IN localStorage
   edusphere-theme             "light" or "dark"                 (script.js)
   edusphere-users             array of user objects             (this file)
   edusphere-session           email of the logged-in user       (this file)
   edusphere-course-filters    search text + filters on Courses  (courses.js)
   edusphere-recent-searches   last searches on Courses          (search.js)
   edusphere-ratings           a guest's star ratings            (courses.js)
   edusphere-library-history   last topics on the Library page   (library.js)
   edusphere-schedule-filter   chosen course on Schedule         (schedule.js)
   edusphere-gallery-filter    chosen category in the Gallery    (gallery.js)
   edusphere-newsletter        emails from the footer form       (script.js)
   ========================================================================== */


/* ---------- 1. SAFE READ / WRITE ----------
   localStorage only stores strings, so objects are saved as JSON text.
   In a private window storage can be blocked: then reading gives the
   fallback value and writing is skipped, but the page keeps working. */
function readJSON(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text === null ? fallback : JSON.parse(text);
  } catch (error) {
    return fallback;   // blocked storage or broken JSON
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    // nothing to do
  }
}


/* ---------- 2. USERS AND THE SESSION ----------
   A user object looks like this:
   {
     name: 'Aisulu Amangeldy',
     email: 'aisulu@example.com',       <- unique, always lower case
     phone: '+7 701 234 56 78',
     passwordHash: '5e88489...',        <- never the password itself
     colour: '#16a394',                 <- colour of the avatar
     joined: '2026-11-15T10:20:00.000Z',
     savedCourses: ['javascript'],
     enrolments: [{ courseId, format, date }],
     readingList: [{ title, url }],
     ratings: { 'javascript': 5 },      <- star ratings of a logged-in user
     reservedCohort: true               <- place in the next cohort (home.js)
   } */
const USERS_KEY = 'edusphere-users';
const SESSION_KEY = 'edusphere-session';
const AVATAR_COLOURS = ['#16a394', '#5b54c9', '#e07a2f', '#c2416b', '#2f7fc1', '#7a52b3'];

function getUsers() {
  return readJSON(USERS_KEY, []);
}

function saveUsers(users) {
  return writeJSON(USERS_KEY, users);
}

function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

function findUser(email) {
  const wanted = normaliseEmail(email);
  return getUsers().find((user) => user.email === wanted) || null;
}

// adds a new user; returns false when the email is already registered
function addUser(user) {
  const users = getUsers();
  if (users.some((existing) => existing.email === user.email)) {
    return false;
  }
  users.push(user);
  return saveUsers(users);
}

// changes some fields of one user, e.g. updateUser(email, { name: 'New' })
function updateUser(email, changes) {
  const users = getUsers();
  const index = users.findIndex((user) => user.email === email);
  if (index === -1) {
    return null;
  }
  users[index] = { ...users[index], ...changes };
  saveUsers(users);
  return users[index];
}

function deleteUser(email) {
  saveUsers(getUsers().filter((user) => user.email !== email));
}

function startSession(email) {
  writeJSON(SESSION_KEY, email);
}

function endSession() {
  removeKey(SESSION_KEY);
}

// the logged-in user object, or null for a guest
function getCurrentUser() {
  const email = readJSON(SESSION_KEY, null);
  return email ? findUser(email) : null;
}

function pickAvatarColour(email) {
  // the same email always gets the same colour
  let sum = 0;
  for (const letter of email) {
    sum += letter.charCodeAt(0);
  }
  return AVATAR_COLOURS[sum % AVATAR_COLOURS.length];
}

// "Aisulu Amangeldy" -> "AA", "Timur" -> "T"
function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function getFirstName(name) {
  return name.trim().split(/\s+/)[0];
}


/* ---------- 3. PER-USER LISTS ----------
   Saved courses, enrolments and the reading list belong to the user who is
   logged in, so they are stored inside his or her user object. */
function getUserList(listName) {
  const user = getCurrentUser();
  return user && Array.isArray(user[listName]) ? user[listName] : [];
}

function setUserList(listName, items) {
  const user = getCurrentUser();
  if (!user) {
    return false;
  }
  updateUser(user.email, { [listName]: items });
  return true;
}

// adds the course id when it is missing and removes it when it is there;
// returns true when the course is saved after the click
function toggleSavedCourse(courseId) {
  const saved = getUserList('savedCourses');
  const isSaved = saved.includes(courseId);
  const updated = isSaved ? saved.filter((id) => id !== courseId) : [...saved, courseId];
  setUserList('savedCourses', updated);
  return !isSaved;
}

function addEnrolment(courseId, format) {
  const enrolments = getUserList('enrolments').filter((item) => item.courseId !== courseId);
  enrolments.push({ courseId, format, date: new Date().toISOString() });
  setUserList('enrolments', enrolments);
}


/* ---------- 4. PASSWORD HASHING ----------
   We never store the password itself. SHA-256 turns it into a 64-character
   fingerprint; at log in the typed password is hashed again and the two
   fingerprints are compared. crypto.subtle works on https:// pages,
   on localhost and on files opened from the disk. */
async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
