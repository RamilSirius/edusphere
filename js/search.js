/* ==========================================================================
   EduSphere — js/search.js (written with jQuery)
   Author: Azamat Mustafin

   1. Highlighting       -> every match is wrapped in <mark> (courses + FAQ)
   2. Suggestions        -> dropdown under the course search box
   3. Recent searches    -> the last searches are saved in localStorage
   4. FAQ search         -> contact.html

   The filtering of the course cards itself is done by courses.js:
   this file calls setCourseSearch(text) whenever the search text changes.
   ========================================================================== */


/* ---------- 1. HIGHLIGHTING ---------- */
const MIN_HIGHLIGHT_LENGTH = 2;   // one letter would light up half of the page

// characters like . ? ( have a special meaning in a regex, so we escape them
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wraps every match of the query in <mark>; returns how many were found.
// The original text is kept with .data(), so a new search starts from clean text.
function highlightMatches($elements, query) {
  const useQuery = query.length >= MIN_HIGHLIGHT_LENGTH;
  const regex = new RegExp('(' + escapeRegExp(query) + ')', 'gi');
  let total = 0;

  $elements.each(function () {
    const $element = $(this);
    if ($element.data('originalText') === undefined) {
      $element.data('originalText', $element.text());
    }
    const original = $element.data('originalText');

    if (!useQuery) {
      $element.text(original);
      return;
    }

    // split() with a (group) keeps the matches: odd indexes are the matches
    const parts = original.split(regex);
    total += (parts.length - 1) / 2;
    $element.html(parts.map((part, index) => (
      index % 2 === 1 ? '<mark class="search-hit">' + escapeHtml(part) + '</mark>' : escapeHtml(part)
    )).join(''));
  });

  return total;
}


/* ---------- 2. AUTOCOMPLETE SUGGESTIONS ----------
   Course titles and the topics of every syllabus (from js/data.js). */
const MAX_SUGGESTIONS = 6;
let activeSuggestion = -1;   // index of the item chosen with the arrow keys
let searchValidator = null;  // set in setUpCourseSearch()

function buildSuggestionList() {
  const list = [];
  $.each(courses, function (index, course) {
    list.push({ label: course.title, type: 'Course · ' + course.weeks + ' weeks' });
    $.each(course.topics, function (topicIndex, topic) {
      list.push({ label: topic, type: 'Topic in ' + course.title });
    });
  });
  return list;
}

function findSuggestions(list, query) {
  const lower = query.toLowerCase();
  return list
    .filter((item) => item.label.toLowerCase().includes(lower))
    // labels that START with the query go first
    .sort((a, b) => b.label.toLowerCase().startsWith(lower) - a.label.toLowerCase().startsWith(lower))
    .slice(0, MAX_SUGGESTIONS);
}

function boldMatch(label, query) {
  const start = label.toLowerCase().indexOf(query.toLowerCase());
  return escapeHtml(label.slice(0, start)) +
    '<strong>' + escapeHtml(label.slice(start, start + query.length)) + '</strong>' +
    escapeHtml(label.slice(start + query.length));
}

function closeSuggestions() {
  $('#search-suggestions').empty().prop('hidden', true);
  $('#course-search').attr('aria-expanded', 'false').removeAttr('aria-activedescendant');
  activeSuggestion = -1;
}

function showSuggestions(items, query) {
  const $box = $('#search-suggestions').empty();
  if (query === '' || items.length === 0) {
    closeSuggestions();
    return;
  }
  $.each(items, function (index, item) {
    $('<li class="list-group-item list-group-item-action" role="option"></li>')
      .attr('id', 'suggestion-' + index)
      .data('label', item.label)
      .html(boldMatch(item.label, query) + '<span class="suggestion-type"></span>')
      .find('.suggestion-type').text(item.type).end()
      .appendTo($box);
  });
  $box.prop('hidden', false);
  $('#course-search').attr('aria-expanded', 'true');
  activeSuggestion = -1;
}

function markActiveSuggestion() {
  const $items = $('#search-suggestions li');
  $items.removeClass('active').attr('aria-selected', 'false');
  const $active = $items.eq(activeSuggestion).addClass('active').attr('aria-selected', 'true');
  $('#course-search').attr('aria-activedescendant', $active.attr('id'));
}

function chooseSuggestion(label) {
  $('#course-search').val(label);
  searchValidator.refresh();   // an old "type a word" error disappears
  closeSuggestions();
  setCourseSearch(label);      // courses.js filters the cards
  saveRecentSearch(label);

  // a topic is inside the syllabus: open the syllabus of the matching cards
  $('#course-list .card').each(function () {
    const $card = $(this);
    if ($card.find('.syllabus mark').length > 0 && !$card.find('.syllabus').hasClass('open')) {
      $card.find('.read-more').trigger('click');
    }
  });
}


/* ---------- 3. RECENT SEARCHES ---------- */
const RECENT_KEY = 'edusphere-recent-searches';
const MAX_RECENT = 6;

function saveRecentSearch(query) {
  const text = query.trim();
  if (text.length < MIN_HIGHLIGHT_LENGTH) {
    return;
  }
  // newest first, no duplicates (any letter case)
  const recent = readJSON(RECENT_KEY, []).filter((item) => item.toLowerCase() !== text.toLowerCase());
  recent.unshift(text);
  writeJSON(RECENT_KEY, recent.slice(0, MAX_RECENT));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = readJSON(RECENT_KEY, []);
  const $box = $('#recent-searches').empty();
  $('#recent-searches-box').prop('hidden', recent.length === 0);

  $.each(recent, function (index, text) {
    $('<button class="chip" type="button"></button>')
      .append('<i class="bi bi-clock-history" aria-hidden="true"></i>')
      .append($('<span></span>').text(text))
      .on('click', function () {
        $('#course-search').val(text);
        searchValidator.refresh();
        setCourseSearch(text);
      })
      .appendTo($box);
  });
}

function setUpCourseSearch() {
  const $input = $('#course-search');
  const suggestionList = buildSuggestionList();

  // "input" fires on typing, deleting, pasting and the clear (×) button
  $input.on('input', function () {
    const query = $input.val().trim();
    setCourseSearch(query);
    showSuggestions(findSuggestions(suggestionList, query), query);
  });

  // arrow keys move through the suggestions, Enter picks one, Escape closes
  $input.on('keydown', function (event) {
    const count = $('#search-suggestions li').length;
    if (count === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        activeSuggestion = (activeSuggestion + 1) % count;
        markActiveSuggestion();
        break;
      case 'ArrowUp':
        activeSuggestion = (activeSuggestion - 1 + count) % count;
        markActiveSuggestion();
        break;
      case 'Enter':
        if (activeSuggestion < 0) {
          closeSuggestions();
          return;   // a normal Enter submits the search form
        }
        chooseSuggestion($('#search-suggestions li').eq(activeSuggestion).data('label'));
        break;
      case 'Escape':
        closeSuggestions();
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  // event delegation: the <li> items are created later
  $('#search-suggestions').on('mousedown', 'li', function (event) {
    event.preventDefault();   // keep the focus in the input
    chooseSuggestion($(this).data('label'));
  });

  $(document).on('mousedown', function (event) {
    if ($(event.target).closest('.search-box').length === 0) {
      closeSuggestions();
    }
  });

  // the search form is validated like every other form (validation.js)
  searchValidator = setUpValidation(document.getElementById('course-search-form'), {
    'course-search': [
      rules.required('Type a word to search, for example “python”.'),
      rules.minLength(MIN_HIGHLIGHT_LENGTH, 'Type at least 2 letters.')
    ]
  }, function () {
    closeSuggestions();
    saveRecentSearch($input.val());
    setCourseSearch($input.val().trim());
    document.getElementById('course-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#clear-searches').on('click', function () {
    writeJSON(RECENT_KEY, []);
    renderRecentSearches();
    showToast('Search history cleared.', 'info');
  });

  renderRecentSearches();
}


/* ---------- 4. FAQ SEARCH WITH HIGHLIGHTING (contact.html) ---------- */
function applyFaqSearch() {
  const query = $('#faq-search').val().trim();
  const active = query.length >= MIN_HIGHLIGHT_LENGTH;
  let matches = 0;
  let questions = 0;

  $('.faq-item').each(function () {
    const $item = $(this);
    const found = highlightMatches($item.find('.faq-question, .faq-answer'), query);
    matches += found;
    if (found > 0) {
      questions++;
    }
    // answers with a match open, the others close (Bootstrap classes)
    const open = active && found > 0;
    $item.find('.accordion-collapse').toggleClass('show', open);
    $item.find('.accordion-button').toggleClass('collapsed', !open).attr('aria-expanded', open);
    $item.toggleClass('faq-dim', active && found === 0);
  });

  const $result = $('#faq-result');
  if (!active) {
    $result.text(query === '' ? '' : 'Type at least ' + MIN_HIGHLIGHT_LENGTH + ' letters.');
  } else if (matches === 0) {
    $result.text('Nothing found for “' + query + '”. Try “payment” or “certificate”, or ask us with the form.');
  } else {
    $result.text(matches + (matches === 1 ? ' match' : ' matches') + ' in ' +
      questions + (questions === 1 ? ' question' : ' questions'));
  }
}


/* ---------- START ---------- */
$(function () {
  if ($('#course-search').length > 0) {
    setUpCourseSearch();
  }
  if ($('#faq-search').length > 0) {
    $('#faq-search').on('input', applyFaqSearch);
  }
});
