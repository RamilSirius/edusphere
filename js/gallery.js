/* ==========================================================================
   EduSphere — js/gallery.js (gallery.html)
   Author: Maxim Batyushkin

   1. Category filter -> All / Classes / Events / Campus, saved in localStorage
   2. Lazy loading    -> a photo is downloaded only when it comes on screen
   3. Viewer          -> Bootstrap modal with Previous / Next and arrow keys
   ========================================================================== */

const GALLERY_KEY = 'edusphere-gallery-filter';
const photoColumns = Array.from(document.querySelectorAll('.gallery-col'));
const filterChips = document.querySelectorAll('[data-filter]');


/* ---------- 1. CATEGORY FILTER ---------- */
function showCategory(category) {
  photoColumns.forEach((column) => {
    column.hidden = category !== 'all' && column.dataset.category !== category;
  });
  filterChips.forEach((chip) => {
    const active = chip.dataset.filter === category;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
  writeJSON(GALLERY_KEY, category);
}

// the number of photos in each category, e.g. "Events 5"
function showCounts() {
  document.querySelectorAll('[data-count]').forEach((badge) => {
    const category = badge.dataset.count;
    badge.textContent = category === 'all'
      ? photoColumns.length
      : photoColumns.filter((column) => column.dataset.category === category).length;
  });
}

filterChips.forEach((chip) => {
  chip.addEventListener('click', () => showCategory(chip.dataset.filter));
});


/* ---------- 2. LAZY LOADING ----------
   The real address waits in data-src. IntersectionObserver tells us when an
   image is close to the screen; only then it is copied into src. */
const lazyImages = document.querySelectorAll('img.lazy');

function updateLazyStatus() {
  const loaded = document.querySelectorAll('img.lazy:not([data-src])').length;
  document.getElementById('lazy-status').textContent = `Loaded ${loaded} of ${lazyImages.length}`;
}

function loadImage(image) {
  image.addEventListener('load', () => image.closest('.lazy-frame').classList.add('is-loaded'), { once: true });
  image.src = image.dataset.src;
  image.removeAttribute('data-src');
  updateLazyStatus();
}

const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      loadImage(entry.target);
      lazyObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: '150px' });   // start a little before the photo is visible

lazyImages.forEach((image) => lazyObserver.observe(image));


/* ---------- 3. FULL-SIZE VIEWER ---------- */
const modalElement = document.getElementById('photo-modal');
const photoModal = new bootstrap.Modal(modalElement);
let openIndex = 0;

// Previous / Next move only through the photos the filter shows
function visibleItems() {
  return photoColumns.filter((column) => !column.hidden);
}

function showPhoto(position) {
  const items = visibleItems();
  openIndex = (position + items.length) % items.length;   // wrap around
  const column = items[openIndex];
  const image = column.querySelector('img');

  document.getElementById('photo-modal-image').src = image.dataset.src || image.src;
  document.getElementById('photo-modal-image').alt = image.alt;
  document.getElementById('photo-modal-title').textContent = column.querySelector('figcaption span').textContent;
  document.getElementById('photo-modal-caption').textContent = image.alt + '.';
  document.getElementById('photo-position').textContent = `${openIndex + 1} of ${items.length}`;
}

photoColumns.forEach((column) => {
  column.querySelector('.gallery-item').addEventListener('click', () => {
    showPhoto(visibleItems().indexOf(column));
    photoModal.show();
  });
});

document.getElementById('photo-prev').addEventListener('click', () => showPhoto(openIndex - 1));
document.getElementById('photo-next').addEventListener('click', () => showPhoto(openIndex + 1));

modalElement.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showPhoto(openIndex - 1);
  if (event.key === 'ArrowRight') showPhoto(openIndex + 1);
});


/* ---------- START ---------- */
showCounts();
const savedCategory = readJSON(GALLERY_KEY, 'all');
showCategory(['all', 'classes', 'events', 'campus'].includes(savedCategory) ? savedCategory : 'all');
updateLazyStatus();
