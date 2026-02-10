/**
 * Address Lookup Widget
 *
 * Initialises postcode-based address lookup on a form.
 *
 * Usage:
 *   initAddressLookup({
 *     postcodeInputId: 'postcode',
 *     findButtonId: 'find-address-btn',
 *     addressDropdownId: 'address-dropdown',
 *     selectedAddressId: 'selected-address',
 *     hiddenPostcodeId: 'hidden-postcode',
 *     hiddenAddressId: 'hidden-address'
 *   });
 */
function initAddressLookup(opts) {
  var postcodeInput = document.getElementById(opts.postcodeInputId);
  var findButton = document.getElementById(opts.findButtonId);
  var addressDropdown = document.getElementById(opts.addressDropdownId);
  var selectedAddressDisplay = document.getElementById(opts.selectedAddressId);
  var hiddenPostcode = document.getElementById(opts.hiddenPostcodeId);
  var hiddenAddress = document.getElementById(opts.hiddenAddressId);

  if (!postcodeInput || !findButton) return;

  var postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

  findButton.addEventListener('click', async function () {
    var postcode = postcodeInput.value.trim();

    if (!postcode) {
      showMessage('Please enter a postcode.', true);
      return;
    }

    if (!postcodeRegex.test(postcode)) {
      showMessage('Please enter a valid UK postcode (e.g. BS1 4QA).', true);
      return;
    }

    findButton.disabled = true;
    findButton.textContent = 'Searching...';
    addressDropdown.style.display = 'none';
    selectedAddressDisplay.style.display = 'none';
    clearHiddenFields();

    try {
      var response = await fetch('/api/address/suggest?postcode=' + encodeURIComponent(postcode));

      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        showMessage(errData.message || 'Address lookup failed. Please enter your address manually.', true);
        return;
      }

      var data = await response.json();

      if (!data.suggestions || data.suggestions.length === 0) {
        showMessage('No addresses found for this postcode. Please check and try again.', true);
        return;
      }

      addressDropdown.innerHTML = '<option value="">Select your address...</option>';
      data.suggestions.forEach(function (suggestion) {
        var option = document.createElement('option');
        option.value = suggestion.id;
        option.textContent = suggestion.address;
        addressDropdown.appendChild(option);
      });
      addressDropdown.style.display = 'block';
      selectedAddressDisplay.style.display = 'none';
    } catch (error) {
      showMessage('Address lookup is temporarily unavailable. You can still submit the form.', true);
    } finally {
      findButton.disabled = false;
      findButton.textContent = 'Find Address';
    }
  });

  postcodeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      findButton.click();
    }
  });

  addressDropdown.addEventListener('change', async function () {
    var selectedId = addressDropdown.value;

    if (!selectedId) {
      selectedAddressDisplay.style.display = 'none';
      clearHiddenFields();
      return;
    }

    try {
      var response = await fetch('/api/address/get?id=' + encodeURIComponent(selectedId));

      if (!response.ok) {
        // Fall back to suggestion text
        var fallbackText = addressDropdown.options[addressDropdown.selectedIndex].text;
        hiddenPostcode.value = postcodeInput.value.trim();
        hiddenAddress.value = fallbackText;
        showMessage(fallbackText, false);
        return;
      }

      var data = await response.json();

      hiddenPostcode.value = data.postcode || postcodeInput.value.trim();
      hiddenAddress.value = data.address;
      showMessage(data.address, false);
    } catch (error) {
      var fallback = addressDropdown.options[addressDropdown.selectedIndex].text;
      hiddenPostcode.value = postcodeInput.value.trim();
      hiddenAddress.value = fallback;
      showMessage(fallback, false);
    }
  });

  function showMessage(text, isError) {
    selectedAddressDisplay.textContent = text;
    selectedAddressDisplay.style.display = 'block';
    if (isError) {
      selectedAddressDisplay.style.color = '#721c24';
      selectedAddressDisplay.style.backgroundColor = '#f8d7da';
      selectedAddressDisplay.style.borderLeftColor = '#e63946';
    } else {
      selectedAddressDisplay.style.color = '';
      selectedAddressDisplay.style.backgroundColor = '';
      selectedAddressDisplay.style.borderLeftColor = '';
    }
  }

  function clearHiddenFields() {
    hiddenPostcode.value = '';
    hiddenAddress.value = '';
  }
}
