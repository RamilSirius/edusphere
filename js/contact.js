/* ==========================================================================
   EduSphere — js/contact.js (contact.html)
   Author: Azamat Mustafin

   1. Registration form -> validation.js checks it, then it is "sent"
   2. Helpers           -> message counter, details of a logged-in user,
                           "Ask Marat" links from the Instructors page
   3. Open / closed     -> badge next to the contact details
   The FAQ search lives in search.js.
   ========================================================================== */

const contactForm = document.getElementById('contact-form');
const messageField = document.getElementById('message');
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 1000;
const MENTOR_PREFIX = /^Question for [^:]+:\s*/;   // added by "Ask Marat" links

// the text the visitor wrote, without the "Question for …:" start we filled in
function ownText(value) {
  return value.replace(MENTOR_PREFIX, '').trim();
}


/* ---------- 1. REGISTRATION FORM ---------- */
setUpValidation(contactForm, {
  'full-name': [rules.required('Enter your full name.'), rules.name()],
  'email': [rules.required('Enter your email so we can answer you.'), rules.email()],
  'phone': [rules.required('Enter your phone number.'), rules.phone()],
  'course': [rules.required('Choose a course, or “Just a question”.')],
  'contact-format': [rules.oneChecked('Choose a study format, or “Not sure yet”.')],
  'message': [
    (value) => (ownText(value) === '' ? 'Write a short message for the mentor.' : ''),
    (value) => (ownText(value).length < MESSAGE_MIN ? `Please write at least ${MESSAGE_MIN} characters.` : ''),
    rules.maxLength(MESSAGE_MAX, `Please keep the message under ${MESSAGE_MAX} characters.`)
  ],
  'agree': [rules.checked('Please confirm that a mentor may contact you.')]
}, () => {
  submitWithSpinner(contactForm, () => {
    const name = getFirstName(document.getElementById('full-name').value);
    const email = normaliseEmail(document.getElementById('email').value);

    // the newsletter switch adds the email to the same list as the footer form
    if (document.getElementById('newsletter').checked) {
      const list = readJSON('edusphere-newsletter', []);
      if (!list.includes(email)) {
        list.push(email);
        writeJSON('edusphere-newsletter', list);
      }
    }

    contactForm.reset();   // clears the form first (the reset handler below hides old messages)
    const success = document.getElementById('form-success');
    success.textContent = `Thank you, ${name}! Your request was sent. A mentor will reply to ${email} within one working day.`;
    success.hidden = false;
    replayAnimation(success, 'pop');
    showToast('Request sent successfully!', 'success');
  });
});

// "Clear the form" and the reset after sending: hide the old success message,
// then (after the browser has emptied the fields) fill in the known details again
contactForm.addEventListener('reset', () => {
  document.getElementById('form-success').hidden = true;
  setTimeout(() => {
    fillKnownDetails();
    updateCounter();
  }, 0);
});


/* ---------- 2. HELPERS ---------- */
function updateCounter() {
  const length = ownText(messageField.value).length;
  document.getElementById('message-counter').textContent =
    `${length} / ${MESSAGE_MAX} characters (at least ${MESSAGE_MIN})`;
}

messageField.addEventListener('input', updateCounter);

function fillKnownDetails() {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('full-name').value = user.name;
    document.getElementById('email').value = user.email;
    document.getElementById('phone').value = user.phone;
  }
}

// contact.html?mentor=Marat%20Zhaksybek starts the message for that mentor
const mentorName = getUrlParam('mentor');
if (mentorName && /^[\p{L} '-]{2,60}$/u.test(mentorName)) {
  document.getElementById('course').value = 'question';
  messageField.value = `Question for ${mentorName}: `;
  updateCounter();
}

fillKnownDetails();


/* ---------- 3. OPEN / CLOSED BADGE ----------
   The office works Monday–Friday, 09:00–18:00 Astana time (UTC+5). */
function updateOpenStatus() {
  const now = new Date();
  // convert the visitor's time to Astana time
  const astana = new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);
  const day = astana.getDay();
  const hour = astana.getHours();
  const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 18;

  const badge = document.getElementById('open-status');
  badge.textContent = isOpen ? 'Open now' : 'Closed now';
  badge.className = 'badge rounded-pill ' + (isOpen ? 'text-bg-success' : 'text-bg-secondary');
  badge.title = isOpen ? 'Mentors answer within an hour' : 'We answer the next working morning';
}

updateOpenStatus();
