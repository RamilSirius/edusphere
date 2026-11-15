/* ==========================================================================
   EduSphere — js/instructors.js (instructors.html)
   Author: Maxim Batyushkin

   1. Direction filter -> shows only the mentors of one direction
   2. Mentor form      -> validation.js checks it, then it is "sent"
   ========================================================================== */


/* ---------- 1. DIRECTION FILTER ---------- */
const filterButtons = document.querySelectorAll('[data-direction]:not(.mentor-card)');
const mentorCards = document.querySelectorAll('.mentor-card');

function showDirection(direction) {
  let shown = 0;
  mentorCards.forEach((card) => {
    const visible = direction === 'all' || card.dataset.direction === direction;
    card.hidden = !visible;
    if (visible) {
      shown++;
      replayAnimation(card, 'fade-in');
    }
  });

  filterButtons.forEach((button) => {
    const active = button.dataset.direction === direction;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  document.getElementById('mentor-count').textContent =
    direction === 'all' ? `Showing all ${shown} mentors` : `Showing ${shown} of ${mentorCards.length} mentors`;
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => showDirection(button.dataset.direction));
});


/* ---------- 2. BECOME-A-MENTOR FORM ---------- */
const mentorForm = document.getElementById('mentor-form');
const bio = document.getElementById('mentor-bio');
const BIO_MIN = 30;
const BIO_MAX = 500;

// live character counter under the text area
bio.addEventListener('input', () => {
  const length = bio.value.trim().length;
  document.getElementById('bio-counter').textContent = `${length} / ${BIO_MAX} characters (at least ${BIO_MIN})`;
});

setUpValidation(mentorForm, {
  'mentor-name': [rules.required('Enter your full name.'), rules.name()],
  'mentor-email': [rules.required('Enter your email address.'), rules.email()],
  'mentor-phone': [rules.required('Enter your phone number.'), rules.phone()],
  'mentor-direction': [rules.required('Choose the direction you want to teach.')],
  'mentor-years': [
    rules.required('Enter your years of experience.'),
    rules.numberBetween(1, 40, 'Enter a whole number of years from 1 to 40.')
  ],
  'mentor-portfolio': [rules.url('The link must start with http:// or https://')],
  'mentor-bio': [
    rules.required('Tell us a few words about yourself.'),
    rules.minLength(BIO_MIN, `Write at least ${BIO_MIN} characters so we know you better.`),
    rules.maxLength(BIO_MAX, `Please keep it under ${BIO_MAX} characters.`)
  ]
}, () => {
  submitWithSpinner(mentorForm, () => {
    const name = getFirstName(document.getElementById('mentor-name').value);
    const success = document.getElementById('mentor-success');
    success.textContent = `Thank you, ${name}! We will look at your application and write back within a week.`;
    success.hidden = false;
    replayAnimation(success, 'pop');
    showToast('Your mentor application has been sent.', 'success');
    mentorForm.reset();
    bio.dispatchEvent(new Event('input'));   // counter back to 0
  });
});

// a logged-in user gets the contact fields filled in (also after the form is reset)
function fillMentorDetails() {
  const mentorUser = getCurrentUser();
  if (mentorUser) {
    document.getElementById('mentor-name').value = mentorUser.name;
    document.getElementById('mentor-email').value = mentorUser.email;
    document.getElementById('mentor-phone').value = mentorUser.phone;
  }
}

mentorForm.addEventListener('reset', () => setTimeout(fillMentorDetails, 0));
fillMentorDetails();
