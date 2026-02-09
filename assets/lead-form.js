(() => {
  const serviceOptions = [
    'Emergency Plumbing',
    '24 Hour Plumber',
    'Boiler Repair',
    'Blocked Drains',
    'Leak Detection',
    'Bathroom Plumbing',
    'Central Heating',
    'Other'
  ];

  const state = {
    turnstileSiteKey: null,
    addressMode: 'lookup'
  };

  const formatPostcode = (value) => value.replace(/\s+/g, '').toUpperCase();

  const createElement = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'class') {
        el.className = value;
      } else if (key.startsWith('data-')) {
        el.setAttribute(key, value);
      } else if (key === 'text') {
        el.textContent = value;
      } else {
        el.setAttribute(key, value);
      }
    });
    children.forEach((child) => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    });
    return el;
  };

  const getDefaultServiceFromPath = () => {
    const path = window.location.pathname;
    if (path.includes('emergency-plumber')) return 'Emergency Plumbing';
    if (path.includes('24-hour-plumber')) return '24 Hour Plumber';
    if (path.includes('boiler-repair')) return 'Boiler Repair';
    if (path.includes('blocked-drains')) return 'Blocked Drains';
    return '';
  };

  const buildForm = (container, options = {}) => {
    const form = createElement('form', { class: 'lead-form', novalidate: 'novalidate' });
    form.innerHTML = `
      <div class="lead-form__header">
        <p class="lead-form__title">Request a Call Back</p>
        <p class="lead-form__subtitle">Tell us about your plumbing issue and we will respond quickly.</p>
      </div>
      <div class="lead-form__fields">
        <label class="lead-form__field">
          <span>Full name *</span>
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label class="lead-form__field">
          <span>Phone number *</span>
          <input type="tel" name="phone" autocomplete="tel" required />
        </label>
        <label class="lead-form__field">
          <span>Email *</span>
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label class="lead-form__field">
          <span>Postcode (UK) *</span>
          <input type="text" name="postcode" autocomplete="postal-code" required />
        </label>
        <div class="lead-form__field lead-form__field--inline">
          <button type="button" class="lead-form__btn" data-action="find-address">Find address</button>
          <button type="button" class="lead-form__link" data-action="manual-address">Enter address manually</button>
        </div>
        <label class="lead-form__field lead-form__field--select" data-field="address-select" hidden>
          <span>Select address *</span>
          <select name="address_select" aria-label="Select address"></select>
        </label>
        <label class="lead-form__field lead-form__field--textarea" data-field="address-manual" hidden>
          <span>Full address *</span>
          <textarea name="address_manual" rows="3"></textarea>
        </label>
        <label class="lead-form__field">
          <span>Service required *</span>
          <select name="service" required></select>
        </label>
        <label class="lead-form__field" data-field="other-service" hidden>
          <span>Other service *</span>
          <input type="text" name="other_service" />
        </label>
        <label class="lead-form__field lead-form__field--textarea">
          <span>Notes (optional)</span>
          <textarea name="notes" rows="3"></textarea>
        </label>
        <label class="lead-form__field lead-form__field--honeypot" aria-hidden="true">
          <span>Website</span>
          <input type="text" name="website" tabindex="-1" autocomplete="off" />
        </label>
        <div class="lead-form__turnstile" data-field="turnstile"></div>
        <input type="hidden" name="address_label" />
        <input type="hidden" name="address_id" />
        <input type="hidden" name="address_json" />
      </div>
      <div class="lead-form__actions">
        <button type="submit" class="lead-form__submit">Send request</button>
        <p class="lead-form__status" role="status" aria-live="polite"></p>
      </div>
    `;

    container.appendChild(form);

    const serviceSelect = form.querySelector('select[name="service"]');
    serviceOptions.forEach((service) => {
      const option = document.createElement('option');
      option.value = service;
      option.textContent = service;
      serviceSelect.appendChild(option);
    });

    const defaultService = options.defaultService || getDefaultServiceFromPath();
    if (defaultService) {
      serviceSelect.value = defaultService;
    }

    const otherServiceField = form.querySelector('[data-field="other-service"]');
    const addressSelectField = form.querySelector('[data-field="address-select"]');
    const addressSelect = form.querySelector('select[name="address_select"]');
    const addressManualField = form.querySelector('[data-field="address-manual"]');
    const manualAddressInput = form.querySelector('textarea[name="address_manual"]');
    const statusEl = form.querySelector('.lead-form__status');
    const turnstileSlot = form.querySelector('[data-field="turnstile"]');

    const setStatus = (message, type = 'info') => {
      statusEl.textContent = message;
      statusEl.className = `lead-form__status lead-form__status--${type}`;
    };

    const setAddressMode = (mode) => {
      state.addressMode = mode;
      if (mode === 'manual') {
        addressManualField.hidden = false;
        addressSelectField.hidden = true;
      } else {
        addressManualField.hidden = true;
        addressSelectField.hidden = false;
      }
    };

    setAddressMode('lookup');

    serviceSelect.addEventListener('change', () => {
      if (serviceSelect.value === 'Other') {
        otherServiceField.hidden = false;
        otherServiceField.querySelector('input').setAttribute('required', 'required');
      } else {
        otherServiceField.hidden = true;
        otherServiceField.querySelector('input').removeAttribute('required');
      }
    });

    form.querySelector('[data-action="manual-address"]').addEventListener('click', () => {
      setAddressMode('manual');
      setStatus('Please enter your full address manually.', 'info');
    });

    form.querySelector('[data-action="find-address"]').addEventListener('click', async () => {
      const postcodeInput = form.querySelector('input[name="postcode"]');
      const postcode = formatPostcode(postcodeInput.value);
      if (!postcode) {
        setStatus('Please enter a valid postcode before searching.', 'error');
        return;
      }

      setStatus('Searching for addresses...', 'info');
      addressSelect.innerHTML = '';
      addressSelect.appendChild(new Option('Select an address', ''));

      try {
        const response = await fetch(`/api/address/suggest?postcode=${encodeURIComponent(postcode)}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Address lookup is currently unavailable.');
        }
        const payload = await response.json();
        if (!payload.addresses || payload.addresses.length === 0) {
          setAddressMode('manual');
          setStatus('No addresses found. Please enter your address manually.', 'warning');
          return;
        }
        payload.addresses.forEach((item) => {
          addressSelect.appendChild(new Option(item.label, item.id));
        });
        setAddressMode('lookup');
        setStatus('Select your address from the list.', 'success');
      } catch (error) {
        setAddressMode('manual');
        setStatus(error.message || 'Address lookup failed. Please enter your address manually.', 'warning');
      }
    });

    addressSelect.addEventListener('change', async () => {
      const selectedId = addressSelect.value;
      if (!selectedId) {
        return;
      }
      setStatus('Fetching address details...', 'info');
      try {
        const response = await fetch(`/api/address/get?id=${encodeURIComponent(selectedId)}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Unable to fetch address details.');
        }
        const payload = await response.json();
        form.querySelector('input[name="address_label"]').value = payload.label || '';
        form.querySelector('input[name="address_id"]').value = payload.id || selectedId;
        form.querySelector('input[name="address_json"]').value = JSON.stringify(payload.raw || payload);
        setStatus('Address selected.', 'success');
      } catch (error) {
        setAddressMode('manual');
        setStatus(error.message || 'Unable to load address details. Enter address manually.', 'warning');
      }
    });

    const hydrateTurnstile = async () => {
      try {
        const response = await fetch('/api/lead-config');
        if (!response.ok) {
          return;
        }
        const payload = await response.json();
        if (!payload.turnstileSiteKey) {
          return;
        }
        state.turnstileSiteKey = payload.turnstileSiteKey;
        turnstileSlot.innerHTML = '<div class="cf-turnstile" data-sitekey="' + payload.turnstileSiteKey + '"></div>';
        if (!window.turnstile) {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        // If config fails, keep form usable without Turnstile.
      }
    };

    hydrateTurnstile();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const serviceValue = formData.get('service');
      const otherServiceValue = formData.get('other_service');
      const manualAddress = formData.get('address_manual');
      const addressLabel = formData.get('address_label');
      const addressId = formData.get('address_id');
      const addressJson = formData.get('address_json');

      if (!formData.get('name') || !formData.get('phone') || !formData.get('email') || !formData.get('postcode')) {
        setStatus('Please complete all required fields.', 'error');
        return;
      }

      if (serviceValue === 'Other' && !otherServiceValue) {
        setStatus('Please specify the other service required.', 'error');
        return;
      }

      let resolvedAddressLabel = addressLabel;
      let resolvedAddressId = addressId;
      let resolvedAddressJson = addressJson;

      if (state.addressMode === 'manual') {
        if (!manualAddress) {
          setStatus('Please enter your full address.', 'error');
          return;
        }
        resolvedAddressLabel = manualAddress;
        resolvedAddressId = '';
        resolvedAddressJson = '';
      }

      if (!resolvedAddressLabel) {
        setStatus('Please select or enter your full address.', 'error');
        return;
      }

      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        postcode: formData.get('postcode'),
        address_label: resolvedAddressLabel,
        address_id: resolvedAddressId,
        address_json: resolvedAddressJson,
        service: serviceValue,
        other_service: otherServiceValue,
        notes: formData.get('notes'),
        source_path: window.location.pathname,
        referrer: document.referrer || null,
        turnstile_token: formData.get('cf-turnstile-response') || null,
        website: formData.get('website')
      };

      try {
        setStatus('Submitting your request...', 'info');
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || 'Unable to submit your request.');
        }

        form.reset();
        form.querySelector('input[name="address_label"]').value = '';
        form.querySelector('input[name="address_id"]').value = '';
        form.querySelector('input[name="address_json"]').value = '';
        otherServiceField.hidden = true;
        setAddressMode('lookup');
        setStatus('Thanks! Your request has been sent.', 'success');
      } catch (error) {
        setStatus(error.message || 'Unable to submit your request. Please try again.', 'error');
      }
    });
  };

  const injectLeadForm = (section) => {
    const container = section.querySelector('.container');
    if (!container || container.querySelector('.lead-form-wrapper')) {
      return;
    }

    const heroContent = document.createElement('div');
    heroContent.className = 'hero-content';

    while (container.firstChild) {
      heroContent.appendChild(container.firstChild);
    }

    const formWrapper = document.createElement('div');
    formWrapper.className = 'lead-form-wrapper';

    container.appendChild(heroContent);
    container.appendChild(formWrapper);

    const defaultService = section.getAttribute('data-default-service');
    buildForm(formWrapper, { defaultService });
    container.classList.add('hero-with-form');
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.hero, .page-hero').forEach(injectLeadForm);
  });
})();
