/* ==========================================================================
   EduSphere — js/library.js (library.html) — EXTERNAL API
   Author: Ramil Zhunussov

   Public API: Wikipedia (no key needed, allows requests from any site)
     search : https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=...
     summary: https://en.wikipedia.org/api/rest_v1/page/summary/<title>

   1. Fetch helper   -> fetch() + async/await, timeout, friendly errors
   2. Search         -> list of articles with highlighted snippets
   3. Summary        -> picture, short description and text of one article
   4. States         -> loading skeletons, error with Retry, nothing found
   5. History        -> the last searches are saved in localStorage
   6. Reading list   -> saved into the logged-in user's profile
   ========================================================================== */

const SEARCH_URL = 'https://en.wikipedia.org/w/api.php';
const SUMMARY_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const REQUEST_TIMEOUT = 10000;   // ms
const MAX_RESULTS = 6;
const HISTORY_KEY = 'edusphere-library-history';
const MAX_HISTORY = 8;
const EXTRA_TOPICS = ['Algorithm', 'HTTP', 'Git', 'Flexbox', 'Recursion (computer science)'];

const resultsBox = document.getElementById('library-results');
const statusLine = document.getElementById('library-status');
const queryInput = document.getElementById('library-query');

let currentController = null;   // lets us cancel the previous request
let lastAction = null;          // what the "Try again" button repeats


/* ---------- 1. FETCH HELPER ----------
   Cancels the request after REQUEST_TIMEOUT and turns every problem into
   a message a visitor can understand. */
async function fetchJSON(url) {
  if (currentController) {
    currentController.abort();   // a newer search replaces the older one
  }
  const controller = new AbortController();
  currentController = controller;
  const timer = setTimeout(() => controller.abort('timeout'), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) {
      throw new Error('This article does not exist on Wikipedia.');
    }
    if (!response.ok) {
      throw new Error(`Wikipedia answered with error ${response.status}. Please try again in a minute.`);
    }
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted && controller.signal.reason !== 'timeout') {
      throw new DOMException('Replaced by a newer request', 'AbortError');
    }
    if (controller.signal.reason === 'timeout') {
      throw new Error('Wikipedia is taking too long to answer. Check your connection and try again.');
    }
    if (error instanceof TypeError) {
      throw new Error('Could not reach Wikipedia. Check your internet connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}


/* ---------- 2. SEARCH ---------- */
async function searchWikipedia(query) {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: MAX_RESULTS,
    srprop: 'snippet',
    format: 'json',
    origin: '*'          // required by Wikipedia for requests from other sites
  });
  const data = await fetchJSON(`${SEARCH_URL}?${params}`);
  return data.query.search;   // [{ title, snippet, pageid }, ...]
}

// Wikipedia marks matches as <span class="searchmatch">. We rebuild the
// snippet ourselves: plain text is escaped and only the matches become <mark>,
// so no HTML from the outside ever reaches our page.
function snippetToHtml(snippet) {
  const doc = new DOMParser().parseFromString(snippet, 'text/html');
  let html = '';
  doc.body.childNodes.forEach((node) => {
    const text = escapeHtml(node.textContent);
    html += node.nodeType === Node.ELEMENT_NODE && node.classList.contains('searchmatch')
      ? `<mark>${text}</mark>`
      : text;
  });
  return html + '…';
}

async function runSearch(query, openFirst = true) {
  lastAction = () => runSearch(query, openFirst);
  saveToHistory(query);
  showLoading(`Searching Wikipedia for “${query}”…`);

  try {
    const results = await searchWikipedia(query);
    if (results.length === 0) {
      showNothingFound(query);
      return;
    }
    showResults(results, query);
    if (openFirst) {
      openArticle(results[0].title);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      showError(error.message);
    }
  }
}

function showResults(results, query) {
  setBusy(false);
  statusLine.textContent = `${results.length} ${results.length === 1 ? 'article' : 'articles'} found for “${query}”. Pick one to read the summary.`;

  resultsBox.innerHTML = `
    <div class="col-12 col-lg-5">
      <div id="result-list" class="d-grid gap-2" role="list"></div>
    </div>
    <div class="col-12 col-lg-7">
      <article id="article-panel" class="surface p-3 p-sm-4" aria-live="polite"></article>
    </div>`;

  const list = document.getElementById('result-list');
  results.forEach((result, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card card-hover result-card text-start p-3 fade-in';
    card.style.animationDelay = `${index * 50}ms`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `<strong class="d-block font-serif mb-1"></strong>
      <span class="small text-secondary result-snippet">${snippetToHtml(result.snippet)}</span>`;
    card.querySelector('strong').textContent = result.title;
    card.addEventListener('click', () => {
      openArticle(result.title);
      if (window.innerWidth < 992) {
        document.getElementById('article-panel').scrollIntoView({ behavior: 'smooth' });
      }
    });
    card.dataset.title = result.title;
    list.appendChild(card);
  });
}


/* ---------- 3. SUMMARY OF ONE ARTICLE ---------- */
async function openArticle(title) {
  const panel = document.getElementById('article-panel');
  document.querySelectorAll('.result-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.title === title);
  });
  panel.innerHTML = skeletonArticle();
  panel.setAttribute('aria-busy', 'true');

  try {
    const article = await fetchJSON(SUMMARY_URL + encodeURIComponent(title.replace(/ /g, '_')));
    showArticle(panel, article);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    panel.innerHTML = `<div class="alert alert-warning mb-0" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i><span></span>
      <button class="btn btn-sm btn-outline-primary ms-2" type="button">Try again</button></div>`;
    panel.querySelector('span').textContent = error.message;
    panel.querySelector('button').addEventListener('click', () => openArticle(title));
  } finally {
    panel.removeAttribute('aria-busy');
  }
}

function showArticle(panel, article) {
  const url = article.content_urls.desktop.page;
  panel.innerHTML = `
    <div class="fade-in">
      <div class="d-flex flex-column flex-sm-row gap-3 mb-3">
        <div class="article-image flex-shrink-0"></div>
        <div>
          <span class="eyebrow mb-1">Wikipedia summary</span>
          <h3 class="h4 fw-bold mb-1 article-title"></h3>
          <p class="text-secondary mb-0 article-description"></p>
        </div>
      </div>
      <p class="article-text"></p>
      <div class="d-flex flex-wrap gap-2">
        <a class="btn btn-primary btn-arrow article-link" target="_blank" rel="noopener">
          Read the full article <i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>
        </a>
        <button class="btn btn-outline-primary save-article btn-icon-spin" type="button"></button>
      </div>
    </div>`;

  // everything that comes from the API is added as text or as an attribute
  panel.querySelector('.article-title').textContent = article.title;
  panel.querySelector('.article-description').textContent = article.description || 'Encyclopedia article';
  panel.querySelector('.article-text').textContent = article.type === 'disambiguation'
    ? 'This word has several meanings on Wikipedia. Pick a more exact article from the list or search again with more words.'
    : article.extract;
  panel.querySelector('.article-link').href = url;

  if (article.thumbnail) {
    const image = document.createElement('img');
    image.className = 'article-thumb';
    image.src = article.thumbnail.source;
    image.alt = 'Illustration from the Wikipedia article “' + article.title + '”';
    image.width = 160;
    image.style.maxWidth = '160px';
    panel.querySelector('.article-image').appendChild(image);
  }

  const saveButton = panel.querySelector('.save-article');
  paintSaveButton(saveButton, url);
  saveButton.addEventListener('click', () => toggleReading(article.title, url, saveButton));

  statusLine.textContent = `Showing “${article.title}”.`;
}


/* ---------- 4. STATES: LOADING, ERROR, NOTHING FOUND ---------- */
function setBusy(isBusy) {
  resultsBox.setAttribute('aria-busy', String(isBusy));
  const button = document.getElementById('library-submit');
  button.disabled = isBusy;
  button.innerHTML = isBusy
    ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Searching…'
    : '<i class="bi bi-stars me-1" aria-hidden="true"></i>Search';
}

function skeletonCard() {
  return `<div class="card p-3"><span class="skeleton skeleton-title"></span>
    <span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line w-75"></span></div>`;
}

function skeletonArticle() {
  return `<span class="skeleton skeleton-title"></span>
    <span class="skeleton mb-3" style="height: 9rem"></span>
    <span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span>
    <span class="skeleton skeleton-line w-50"></span>`;
}

function showLoading(message) {
  setBusy(true);
  statusLine.innerHTML = '<span class="spinner-grow spinner-grow-sm text-warning me-2" aria-hidden="true"></span>';
  statusLine.append(message);
  resultsBox.innerHTML = `
    <div class="col-12 col-lg-5"><div class="d-grid gap-2">${skeletonCard().repeat(4)}</div></div>
    <div class="col-12 col-lg-7"><div class="surface p-4">${skeletonArticle()}</div></div>`;
}

function showError(message) {
  setBusy(false);
  statusLine.textContent = '';
  resultsBox.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-0" role="alert">
        <i class="bi bi-wifi-off fs-3" aria-hidden="true"></i>
        <div class="flex-grow-1"><strong class="d-block">The library could not load the articles</strong><span class="error-text"></span></div>
        <button id="retry-btn" class="btn btn-danger btn-icon-spin" type="button"><i class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>Try again</button>
      </div>
    </div>`;
  resultsBox.querySelector('.error-text').textContent = message;
  document.getElementById('retry-btn').addEventListener('click', () => lastAction && lastAction());
}

function showNothingFound(query) {
  setBusy(false);
  statusLine.textContent = '';
  resultsBox.innerHTML = `
    <div class="col-12">
      <div class="empty-state py-5">
        <i class="bi bi-emoji-neutral display-6 d-block mb-2" aria-hidden="true"></i>
        <p class="mb-1 fw-semibold">Nothing found for “<span class="query"></span>”.</p>
        <p class="small mb-0">Check the spelling or try a shorter, more general word.</p>
      </div>
    </div>`;
  resultsBox.querySelector('.query').textContent = query;
}


/* ---------- 5. HISTORY AND TOPIC CHIPS ---------- */
function saveToHistory(query) {
  const history = readJSON(HISTORY_KEY, []).filter((item) => item.toLowerCase() !== query.toLowerCase());
  history.unshift(query);
  writeJSON(HISTORY_KEY, history.slice(0, MAX_HISTORY));
  renderHistory();
}

function makeChip(text, icon, onClick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i><span></span>`;
  chip.querySelector('span').textContent = text;
  chip.addEventListener('click', onClick);
  return chip;
}

function searchFromChip(text) {
  queryInput.value = text;
  libraryValidator.refresh();   // an old "type a topic" error disappears
  runSearch(text);
}

function renderHistory() {
  const history = readJSON(HISTORY_KEY, []);
  const box = document.getElementById('history-chips');
  box.innerHTML = '';
  history.forEach((text) => box.appendChild(makeChip(text, 'bi-clock-history', () => searchFromChip(text))));
  document.getElementById('history-box').hidden = history.length === 0;
}

function renderTopicChips() {
  const box = document.getElementById('topic-chips');
  const topics = [...courses.map((course) => course.wikiTopic), ...EXTRA_TOPICS];
  topics.forEach((topic) => {
    const label = topic.replace(/ \(.*\)/, '');   // "Python (programming language)" -> "Python"
    box.appendChild(makeChip(label, 'bi-tag', () => searchFromChip(topic)));
  });
}

document.getElementById('clear-history').addEventListener('click', () => {
  writeJSON(HISTORY_KEY, []);
  renderHistory();
  showToast('Search history cleared.', 'info');
});


/* ---------- 6. READING LIST ---------- */
function isInReadingList(url) {
  return getUserList('readingList').some((item) => item.url === url);
}

function paintSaveButton(button, url) {
  const saved = isInReadingList(url);
  button.innerHTML = saved
    ? '<i class="bi bi-bookmark-check-fill me-1" aria-hidden="true"></i>Saved to reading list'
    : '<i class="bi bi-bookmark-plus me-1" aria-hidden="true"></i>Save to reading list';
  button.setAttribute('aria-pressed', String(saved));
}

function toggleReading(title, url, button) {
  if (!getCurrentUser()) {
    showToast('Log in to keep a reading list in your profile.', 'info');
    return;
  }
  const list = getUserList('readingList');
  const saved = isInReadingList(url);
  setUserList('readingList', saved ? list.filter((item) => item.url !== url) : [...list, { title, url }]);
  paintSaveButton(button, url);
  replayAnimation(button, 'pop');
  renderReadingList();
  showToast(saved ? `“${title}” removed from your reading list.` : `“${title}” added to your reading list.`, saved ? 'info' : 'success');
}

function renderReadingList() {
  const box = document.getElementById('reading-box');
  if (!getCurrentUser()) {
    box.innerHTML = `<div class="empty-state"><p class="mb-2">Log in to save articles and find them later in your profile.</p>
      <a class="btn btn-primary btn-sm" href="login.html?next=library.html">Log in</a>
      <a class="btn btn-outline-primary btn-sm" href="signup.html?next=library.html">Sign up</a></div>`;
    return;
  }
  const list = getUserList('readingList');
  if (list.length === 0) {
    box.innerHTML = '<div class="empty-state">Nothing saved yet. Open an article and press “Save to reading list”.</div>';
    return;
  }
  box.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'd-flex flex-wrap gap-2';
  list.forEach((item) => {
    const link = document.createElement('a');
    link.className = 'chip';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.innerHTML = '<i class="bi bi-file-earmark-text" aria-hidden="true"></i><span></span>';
    link.querySelector('span').textContent = item.title;
    row.appendChild(link);
  });
  box.appendChild(row);
}


/* ---------- FORM + START ---------- */
const libraryValidator = setUpValidation(document.getElementById('library-form'), {
  'library-query': [
    rules.required('Type a topic to look up, for example “flexbox”.'),
    rules.minLength(2, 'Type at least 2 letters.'),
    rules.maxLength(100, 'Please keep the search shorter than 100 characters.')
  ]
}, () => runSearch(queryInput.value.trim()));

renderTopicChips();
renderHistory();
renderReadingList();

// library.html?topic=CSS opens that topic straight away (links from course cards)
const startTopic = getUrlParam('topic');
if (startTopic) {
  queryInput.value = startTopic;
  runSearch(startTopic);
}
