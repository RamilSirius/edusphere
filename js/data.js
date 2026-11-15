/* ==========================================================================
   EduSphere — js/data.js
   Author: Ramil Zhunussov

   The course list is used by several pages (Home, Courses, Profile,
   Library), so it lives in one file. Every page that needs it loads this
   file before its own script.
   ========================================================================== */

const courses = [
  {
    id: 'html-css',
    title: 'HTML & CSS Foundations',
    direction: 'Web development',
    level: 'beginner',
    weeks: 8,
    image: 'images/course-web.svg',
    alt: 'Browser window representing the HTML and CSS foundations course',
    description: 'Semantic markup, the box model and responsive layouts — the course this website was built with.',
    topics: [
      'Semantic tags, tables, forms and accessibility basics',
      'External stylesheets and all four selector types',
      'The box model, flexbox and responsive layouts',
      'Publishing a site to GitHub Pages'
    ],
    wikiTopic: 'CSS'
  },
  {
    id: 'javascript',
    title: 'JavaScript in Practice',
    direction: 'Web development',
    level: 'intermediate',
    weeks: 10,
    image: 'images/course-js.svg',
    alt: 'Code editor showing a JavaScript function',
    description: 'From variables to a working single-page application, written without any framework.',
    topics: [
      'Types, functions, arrays and objects',
      'DOM manipulation and event handling',
      'Asynchronous code, fetch and REST APIs',
      'Debugging in Chrome DevTools'
    ],
    wikiTopic: 'JavaScript'
  },
  {
    id: 'python',
    title: 'Python for Everyone',
    direction: 'Programming',
    level: 'beginner',
    weeks: 9,
    image: 'images/course-python.svg',
    alt: 'Terminal window running a Python script',
    description: 'A first programming language whose syntax stays out of the way while you learn to think in algorithms.',
    topics: [
      'Control flow, collections and functions',
      'Files, modules and virtual environments',
      'Automating boring tasks with scripts',
      'An introduction to object-oriented design'
    ],
    wikiTopic: 'Python (programming language)'
  },
  {
    id: 'sql',
    title: 'Data Analytics with SQL',
    direction: 'Data analytics',
    level: 'intermediate',
    weeks: 12,
    image: 'images/course-data.svg',
    alt: 'Dashboard with bar and pie charts representing data analytics',
    description: 'Turn a raw database into a dashboard a manager can read in thirty seconds.',
    topics: [
      'SELECT, JOIN, GROUP BY and window functions',
      'Cleaning messy real-world datasets',
      'Charts that do not mislead the reader',
      'Presenting findings to a non-technical audience'
    ],
    wikiTopic: 'SQL'
  },
  {
    id: 'ux',
    title: 'UX & UI Design Basics',
    direction: 'UX / UI design',
    level: 'beginner',
    weeks: 7,
    image: 'images/course-ux.svg',
    alt: 'Wireframe screens and colour swatches representing UX design',
    description: 'Research, wireframes and design systems — the work that happens before anyone writes code.',
    topics: [
      'User interviews and simple usability tests',
      'Wireframing and prototyping in Figma',
      'Colour, type scales and spacing systems',
      'Handing a design over to developers'
    ],
    wikiTopic: 'User experience design'
  },
  {
    id: 'mobile',
    title: 'Mobile Development',
    direction: 'Programming',
    level: 'advanced',
    weeks: 14,
    image: 'images/course-mobile.svg',
    alt: 'Smartphone showing a mobile application interface',
    description: 'Build, test and publish a cross-platform application to a real app store before the course ends.',
    topics: [
      'Component-based mobile interfaces',
      'Navigation, local storage and device APIs',
      'Working with a remote backend',
      'Release builds and store requirements'
    ],
    wikiTopic: 'Mobile app development'
  }
];

// Bootstrap badge colour for each level
const levelBadges = {
  beginner: 'text-bg-primary',
  intermediate: 'text-bg-warning',
  advanced: 'text-bg-dark'
};

const studyFormats = {
  evening: 'Evening — Mon, Wed, Fri at 19:00',
  weekend: 'Weekend — Sat and Sun at 11:00',
  intensive: 'Intensive — every weekday at 10:00'
};

function findCourse(id) {
  return courses.find((course) => course.id === id) || null;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
