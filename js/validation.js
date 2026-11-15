/* ==========================================================================
   EduSphere — js/validation.js
   Author: Azamat Mustafin

   One validation system for EVERY form on the site. We do not use the
   browser's built-in validation (no required, pattern, minlength, maxlength,
   min, max or type="email" in the HTML, and every <form> has novalidate).
   JavaScript checks the values and writes friendly messages under the fields.

   1. Patterns and messages
   2. Rules        -> small functions that return "" (ok) or an error message
   3. Showing errors under a field
   4. setUpValidation(form, schema, onValid) -> used by every page script

   HOW A PAGE USES IT
     setUpValidation(form, {
       'signup-email': [rules.required('Enter your email.'), rules.email()],
       'signup-phone': [rules.required('Enter your phone.'), rules.phone()]
     }, function () { ...the form is valid, do the work... });
   ========================================================================== */


/* ---------- 1. PATTERNS ---------- */
// something@something.domain — no spaces, exactly one @, a dot in the domain
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

// Kazakhstan numbers: +7 or 8, then 10 digits starting with 7
// (checked after spaces, brackets and dashes are removed)
const PHONE_PATTERN = /^(\+7|8)7\d{9}$/;

// letters of any alphabet (Latin, Cyrillic, Kazakh), spaces, hyphens, apostrophes
const NAME_PATTERN = /^[\p{L}' -]+$/u;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

// each password requirement is checked separately, so the sign-up page can
// tick them one by one while the user types (see auth.js)
function getPasswordChecks(password) {
  return {
    length: password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9\s]/.test(password),
    noSpaces: !/\s/.test(password)
  };
}

function cleanPhone(value) {
  return value.replace(/[\s()-]/g, '');
}


/* ---------- 2. RULES ----------
   Every rule is a function that receives the field and returns a function
   (value, field) => message. An empty message means "valid". */
const rules = {
  required(message) {
    return (value) => (value.trim() === '' ? message : '');
  },

  minLength(min, message) {
    return (value) => (value.trim() !== '' && value.trim().length < min ? message : '');
  },

  maxLength(max, message) {
    return (value) => (value.trim().length > max ? message : '');
  },

  name() {
    return (value) => {
      const text = value.trim();
      if (text === '') return '';
      if (text.length < 2) return 'The name is too short: use at least 2 letters.';
      if (!NAME_PATTERN.test(text)) return 'Use only letters, spaces, hyphens and apostrophes.';
      return '';
    };
  },

  email() {
    return (value) => {
      const text = value.trim();
      if (text === '') return '';
      if (!text.includes('@')) return 'An email address needs an “@”, for example name@example.com.';
      if (!EMAIL_PATTERN.test(text)) return 'This email looks incomplete. Use the format name@example.com.';
      return '';
    };
  },

  phone() {
    return (value) => {
      if (value.trim() === '') return '';
      if (/[^\d\s()+-]/.test(value)) return 'A phone number may contain only digits, spaces, brackets, “+” and “-”.';
      if (!PHONE_PATTERN.test(cleanPhone(value))) {
        return 'Enter a Kazakhstan number: +7 7XX XXX XX XX (11 digits).';
      }
      return '';
    };
  },

  password() {
    return (value) => {
      if (value === '') return '';
      const checks = getPasswordChecks(value);
      if (!checks.length) return `The password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters long.`;
      if (!checks.noSpaces) return 'The password cannot contain spaces.';
      if (!checks.lower) return 'Add at least one small letter (a–z).';
      if (!checks.upper) return 'Add at least one capital letter (A–Z).';
      if (!checks.digit) return 'Add at least one digit (0–9).';
      if (!checks.symbol) return 'Add at least one symbol, for example ! ? # or %.';
      return '';
    };
  },

  // the value must repeat another field (password confirmation)
  sameAs(otherId, message) {
    return (value) => {
      const other = document.getElementById(otherId);
      return value !== '' && other && value !== other.value ? message : '';
    };
  },

  // optional link: empty is fine, otherwise it must start with http(s)://
  url(message) {
    return (value) => {
      const text = value.trim();
      if (text === '') return '';
      try {
        const link = new URL(text);
        return link.protocol === 'http:' || link.protocol === 'https:' ? '' : message;
      } catch (error) {
        return message;
      }
    };
  },

  // whole number between min and max (we check it ourselves, no min/max attributes)
  numberBetween(min, max, message) {
    return (value) => {
      const text = value.trim();
      if (text === '') return '';
      const number = Number(text);
      return Number.isInteger(number) && number >= min && number <= max ? '' : message;
    };
  },

  // checkbox that must be ticked
  checked(message) {
    return (value, field) => (field.checked ? '' : message);
  },

  // a group of radio buttons: the schema key is the id of their <fieldset>
  oneChecked(message) {
    return (value, field) => (field.querySelector('input[type="radio"]:checked') ? '' : message);
  }
};


/* ---------- 3. SHOWING ERRORS ----------
   The message goes into an .invalid-feedback element with the id
   "<field id>-error". It is created the first time it is needed:
   after the input, after its .input-group, or at the end of a fieldset. */
function getFeedbackElement(field) {
  const id = field.id + '-error';
  let feedback = document.getElementById(id);
  if (feedback) {
    return feedback;
  }
  feedback = document.createElement('div');
  feedback.className = 'invalid-feedback';
  feedback.id = id;

  if (field.tagName === 'FIELDSET') {
    field.appendChild(feedback);
  } else if (field.type === 'checkbox') {
    field.closest('.form-check').appendChild(feedback);
  } else if (field.parentElement.classList.contains('input-group')) {
    field.parentElement.after(feedback);
  } else {
    field.after(feedback);
  }

  // screen readers read the message together with the field
  const describedBy = field.getAttribute('aria-describedby');
  field.setAttribute('aria-describedby', describedBy ? describedBy + ' ' + id : id);
  return feedback;
}

function showFieldError(field, message) {
  const feedback = getFeedbackElement(field);
  feedback.textContent = message;
  feedback.classList.add('d-block');
  field.classList.add('is-invalid');
  field.classList.remove('is-valid');
  field.setAttribute('aria-invalid', 'true');
}

function showFieldValid(field) {
  const feedback = document.getElementById(field.id + '-error');
  if (feedback) {
    feedback.textContent = '';
    feedback.classList.remove('d-block');
  }
  field.classList.remove('is-invalid');
  field.removeAttribute('aria-invalid');
  // green border only on text fields the user typed into
  const isTextField = field.tagName !== 'FIELDSET' && field.type !== 'checkbox';
  field.classList.toggle('is-valid', isTextField && field.value.trim() !== '');
}

function clearFieldState(field) {
  showFieldValid(field);
  field.classList.remove('is-valid');
}

// runs the rules of one field; the first failing rule wins
function validateField(field, fieldRules) {
  const value = field.value === undefined ? '' : String(field.value);
  for (const rule of fieldRules) {
    const message = rule(value, field);
    if (message) {
      showFieldError(field, message);
      return false;
    }
  }
  showFieldValid(field);
  return true;
}


/* ---------- 4. setUpValidation ----------
   form     : the <form> element
   schema   : { fieldId: [rules...] }
   onValid  : called with the form when every field is valid
   options  : { activeFields() } — optional; returns the ids to check on
              submit (the multi-step form checks only the steps shown so far)
   Returns { validate, reset, refresh, showSummary } for scripts that need them. */
function setUpValidation(form, schema, onValid, options = {}) {
  form.noValidate = true;   // the same as novalidate in the HTML
  let submitted = false;

  const fields = Object.keys(schema).map((id) => {
    const field = document.getElementById(id);
    if (!field) {
      console.warn('Validation: no field with id "' + id + '"');
    }
    return { id, field, rules: schema[id], touched: false };
  }).filter((item) => item.field);

  const alertBox = document.createElement('div');
  alertBox.className = 'alert alert-danger form-alert small py-2';
  alertBox.setAttribute('role', 'alert');
  alertBox.hidden = true;
  // a form can mark where the summary goes with <div class="form-alert-slot">
  const slot = form.querySelector('.form-alert-slot');
  if (slot) {
    slot.appendChild(alertBox);
  } else {
    form.prepend(alertBox);
  }

  function validate(onlyThese) {
    const list = onlyThese ? fields.filter((item) => onlyThese.includes(item.id)) : fields;
    let firstInvalid = null;
    let errors = 0;
    list.forEach((item) => {
      item.touched = true;   // from now on the field is re-checked while the user types
      if (!validateField(item.field, item.rules)) {
        errors++;
        firstInvalid = firstInvalid || item.field;
      }
    });
    return { errors, firstInvalid };
  }

  function showSummary(errors) {
    alertBox.hidden = errors === 0;
    alertBox.textContent = errors === 1
      ? 'Please correct the field marked in red.'
      : `Please correct the ${errors} fields marked in red.`;
  }

  // live checking: after the first blur of a field, or after the first submit
  fields.forEach((item) => {
    const eventName = item.field.tagName === 'FIELDSET' || item.field.type === 'checkbox' ? 'change' : 'input';
    item.field.addEventListener(eventName, () => {
      if (item.touched || submitted) {
        validateField(item.field, item.rules);
        if (submitted) {
          showSummary(validate(activeIds()).errors);
        }
      }
    });
    // text fields are checked when the user leaves them (if something was typed);
    // checkboxes and radio groups only on change or submit, so tabbing past them
    // does not show an error
    item.field.addEventListener('focusout', () => {
      const isChoice = item.field.tagName === 'FIELDSET' || item.field.type === 'checkbox';
      if (!isChoice && item.field.value !== '') {
        item.touched = true;
        validateField(item.field, item.rules);
      }
    });
  });

  function activeIds() {
    return options.activeFields ? options.activeFields() : null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();   // there is no server: we never reload the page
    submitted = true;
    const result = validate(activeIds());
    showSummary(result.errors);
    if (result.errors > 0) {
      result.firstInvalid.focus();
      form.classList.remove('shake');
      void form.offsetWidth;   // restart the animation
      form.classList.add('shake');
      return;
    }
    onValid(form);
  });

  // re-check after a script changed a value (e.g. a click on a topic chip)
  function refresh() {
    if (submitted) {
      showSummary(validate(activeIds()).errors);
    } else {
      fields.filter((item) => item.touched).forEach((item) => validateField(item.field, item.rules));
    }
  }

  function reset() {
    submitted = false;
    alertBox.hidden = true;
    fields.forEach((item) => {
      item.touched = false;
      clearFieldState(item.field);
    });
  }

  form.addEventListener('reset', () => setTimeout(reset, 0));

  return { validate, reset, refresh, showSummary };
}
