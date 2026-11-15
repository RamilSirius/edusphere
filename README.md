# EduSphere — Front-End final project

Team **The Ethernet**, group **SE-2510**, Astana IT University.

EduSphere is a multi-page, responsive website of an online school. The courses are project-based and come with live
classes and a personal mentor. The site is for students in Kazakhstan who want to learn web development, programming,
data analytics or design and finish with a portfolio. Visitors can:

- browse and filter the courses;
- create an account and save courses;
- enrol online;
- look up topics in a learning library powered by the Wikipedia API.

- **Live site:** _add the GitHub Pages link here after publishing_
- **Repository:** _add the GitHub repository link here_

## Team

| Member | Role | Main files |
|---|---|---|
| Ramil Zhunussov | Team lead. Account simulation (sign up, log in, profile), the Wikipedia library, home page, hosting | `js/storage.js`, `js/auth.js`, `js/profile.js`, `js/library.js`, `js/home.js`, `js/data.js` |
| Maxim Batyushkin | Design system, light / dark mode, responsive layout, animations, gallery, instructors and about pages | `css/style.css`, `js/script.js`, `js/gallery.js`, `js/instructors.js` |
| Azamat Mustafin | Validation of every form, course search and filters, schedule and contact pages | `js/validation.js`, `js/search.js`, `js/courses.js`, `js/schedule.js`, `js/contact.js` |

## Pages (11, all linked from the navbar and the footer)

| Page | What it does |
|---|---|
| `index.html` | Home: a personal greeting, animated counters, popular courses, a "Reserve a place" card for the next cohort |
| `courses.html` | Catalogue: live search with suggestions, filters, sorting, ratings, saved courses, a four-step enrolment form |
| `instructors.html` | Mentors with a direction filter, consultation hours, a "Become a mentor" form |
| `schedule.html` | Timetable: today's column is highlighted, a course filter, the next live class |
| `library.html` | Learning library built on the **Wikipedia API**: search, article summary, reading list |
| `gallery.html` | Carousel, a photo wall with a category filter, lazy loading and a full-size viewer |
| `about.html` | Mission, numbers, story and the team |
| `contact.html` | Registration form, contacts with copy buttons, an "open now" badge, FAQ with search |
| `signup.html` | Sign up |
| `login.html` | Log in |
| `profile.html` | Profile: the stored details, edit profile, change password, enrolments, saved courses, reading list, delete account |

## How each requirement is met

| Requirement | Where |
|---|---|
| **1. Responsiveness** | Bootstrap 5 grid with Flexbox utilities. Below 1200 px the navbar collapses into a menu button. Wide tables scroll sideways. The course filters fold behind a button on phones. Extra media queries are in `css/style.css`, section 16. Checked at 375, 768, 1024 and 1360 px with no horizontal scrolling |
| **2. Hosting** | GitHub Pages. All paths are relative, so the site works in a sub-folder. No broken links or images (checked with a script) |
| **3. Light / dark mode** | The switch in the navbar is on every page. The choice is saved in `localStorage` (`edusphere-theme`). A small script in each `<head>` applies it before the page is drawn, so the page never flashes. Dark colours are in `css/style.css`, section 02 |
| **5.1 Sign up / log in** | `js/auth.js` and `js/storage.js`. Sign up saves `{ name, email, phone, passwordHash, ... }` to `localStorage` (`edusphere-users`) and logs the user in. Log in compares the SHA-256 hash of the typed password with the stored one and then opens `profile.html`. The profile is protected: a guest is sent to the log-in page |
| **5.2 Form validation** | `js/validation.js` checks every form on the site: sign up, log in, edit profile, change password, enrolment, contact, become a mentor, newsletter and both search forms. It checks required fields, email format, password length and complexity, and the phone pattern (`+7 7XX XXX XX XX`). Each message appears under its field, and a summary appears at the top of the form. No `required`, `pattern`, `minlength`, `maxlength`, `min`, `max` or `type="email"`, and every `<form>` has `novalidate` |
| **5.3 Search / filtering** | Courses: live search, suggestions, highlighting, level / duration / sort / saved-only filters. Mentors: direction filter. Schedule: course filter. Gallery: category filter. FAQ: search with highlighting. Library: Wikipedia search. Search text, filters and recent searches are saved in `localStorage` |
| **6. Animations** | Buttons lift and get a shadow on hover. Icons spin, cards rise, images zoom and nav links get an underline. The theme switch knob slides and turns. Blocks appear on scroll and numbers count up. There are toasts, loading spinners and skeletons. All movement is switched off for visitors with `prefers-reduced-motion` |
| **7. External API** | `js/library.js` uses `fetch()` with `async/await` on two Wikipedia endpoints (search and page summary). Results load with skeleton placeholders and a spinner in the button. A request times out after 10 s. A failed request shows a friendly message with a **Try again** button |
| **10. Code quality** | One stylesheet with a table of contents, a shared `js/script.js`, and one script per page. Every file starts with a comment that names its author and lists its parts |

## Folder structure

```
/edusphere-final
├── index.html, courses.html, instructors.html, schedule.html, library.html,
│   gallery.html, about.html, contact.html, signup.html, login.html, profile.html
├── /css
│   └── style.css         all styles: tokens, dark mode, components, animations, media queries
├── /js
│   ├── storage.js        localStorage helpers, users, session, password hashing   (every page)
│   ├── validation.js     validation rules and error messages                     (every page)
│   ├── script.js         theme switch, account menu, toasts, counters, newsletter (every page)
│   ├── data.js           the course list shared by several pages
│   ├── home.js  courses.js  search.js  instructors.js  schedule.js
│   └── library.js  gallery.js  contact.js  auth.js  profile.js
└── /images               SVG illustrations, course pictures, portraits, gallery photos
```

## Data kept in localStorage

| Key | Content |
|---|---|
| `edusphere-theme` | `"light"` or `"dark"` |
| `edusphere-users` | Array of accounts. Each one holds the saved courses, enrolments, reading list and ratings. The password is stored only as a SHA-256 hash |
| `edusphere-session` | Email of the user who is logged in |
| `edusphere-course-filters` | Search text, level, duration, sort and the "saved only" switch |
| `edusphere-recent-searches`, `edusphere-library-history` | Recent searches |
| `edusphere-ratings` | Star ratings of a guest (a logged-in student keeps them in the account) |
| `edusphere-schedule-filter`, `edusphere-gallery-filter` | The chosen course or category |
| `edusphere-newsletter` | Emails from the newsletter forms |

> This is a student project without a server. Accounts live only in the browser, so please do not use a real password.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

The library needs an internet connection, because it calls the Wikipedia API.

## Credits

- [Bootstrap 5.3](https://getbootstrap.com/) and [Bootstrap Icons](https://icons.getbootstrap.com/), loaded from cdnjs.
- [jQuery 4](https://jquery.com/), used by the search suggestions, toasts and counters.
- Article texts and images in the library come from [Wikipedia](https://www.wikipedia.org/) under CC BY-SA.
- The illustrations in `/images` are original SVG drawings made for this project.
