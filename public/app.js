(function () {
  'use strict';

  var STORAGE_KEY = 'psc_data_v3';

  var CALC_IDS = ['runtime', 'solar', 'ac'];

  var CURRENCY_SYMBOLS = { Tk: '৳', USD: '$', GBP: '£', EUR: '€' };

  var stations = [];
  var devices = [blankDevice()];
  var solarFactor = 1.2;
  var acFactor = 1.1;
  var currency = 'Tk';
  var dailyTotals = { totalWh: 0, totalWatts: 0, deviceCount: 0 };

  var activeStationId = null;
  var toastTimer;

  /* Comparison view state. Sort lives only in memory so a reload returns to the
     neutral order; nothing here is persisted. */
  var comparisonSort = { key: null, dir: 'asc' };
  /* null means "follow the screen size": a table is the better desktop
     comparison, a ranked list is the only workable one on a phone. Choosing a
     view explicitly pins it. */
  var compareView = null;
  var rankedMetric = 'runtime';

  /* Bundled product catalog (public/catalog.js). Brands come from the Star Tech
     Bangladesh listings; AC input and solar input are not published there, so
     those two fields are always supplied by the user. */
  var CATALOG = window.PSC_CATALOG && Array.isArray(window.PSC_CATALOG.brands)
    ? window.PSC_CATALOG
    : { brands: [] };

  var formMode = 'catalog';
  var catalogBrand = CATALOG.brands.length ? CATALOG.brands[0].name : '';
  var catalogQuery = '';
  var selectedProduct = null;

  /* Non-null while the station modal is editing an existing station rather than
     adding one. The two actions share one form so they cannot drift apart. */
  var editingStationId = null;

  var stationModal = document.getElementById('station-modal');
  var openModalBtn = document.getElementById('open-station-modal');
  var cancelModalBtn = document.getElementById('station-modal-cancel');

  var guidelineModal = document.getElementById('guideline-modal');
  var openGuidelineBtn = document.getElementById('open-guideline');
  var guidelineMask = guidelineModal.querySelector('.modal__mask');
  var guidelineCloseBtn = document.getElementById('guideline-close');

  var addForm = document.getElementById('add-station-form');
  var nameInput = document.getElementById('station-name');
  var brandInput = document.getElementById('station-brand');
  var capacityInput = document.getElementById('station-capacity');
  var outputInput = document.getElementById('station-output');
  var acChargeInput = document.getElementById('station-accharge');
  var solarChargeInput = document.getElementById('station-solarcharge');
  var priceInput = document.getElementById('station-price');
  var priceLabelEl = document.getElementById('station-price-label');

  var modalTitleEl = document.getElementById('station-modal-title');
  var modalSubEl = document.getElementById('station-modal-sub');
  var stationModeSeg = document.getElementById('station-mode-seg');
  var stationSubmitLabel = document.getElementById('station-modal-submit-label');
  var modeCatalogBtn = document.getElementById('mode-catalog');
  var modeCustomBtn = document.getElementById('mode-custom');
  var catalogPanel = document.getElementById('catalog-panel');
  var catalogBrandSelect = document.getElementById('catalog-brand');
  var catalogList = document.getElementById('catalog-list');
  var catalogCountEl = document.getElementById('catalog-count');
  var catalogNoteEl = document.getElementById('catalog-note');
  var catalogSearchInput = document.getElementById('catalog-search');
  var catalogSearchClear = document.getElementById('catalog-search-clear');
  var stationSubmitBtn = document.getElementById('station-modal-submit');

  var deviceRows = document.getElementById('device-rows');
  var addDeviceBtn = document.getElementById('add-device');
  var dailyWattsEl = document.getElementById('daily-watts');
  var dailyWhEl = document.getElementById('daily-wh');

  var currencyInput = document.getElementById('currency');
  var solarFactorInput = document.getElementById('solar-factor');
  var acFactorInput = document.getElementById('ac-factor');

  var emptyState = document.getElementById('empty-state');
  var emptyAddBtn = document.getElementById('empty-add-btn');
  var stationsArea = document.getElementById('stations-area');
  var stationTabs = document.getElementById('station-tabs');
  var stationContent = document.getElementById('station-content');
  var compareHint = document.getElementById('compare-hint');
  var compareArea = document.getElementById('compare-area');
  var printReport = document.getElementById('print-report');
  var toast = document.getElementById('toast');
  var clearAllBtn = document.getElementById('clear-all');
  var generateCompareBtn = document.getElementById('generate-compare');

  /* ---------- Persistence ---------- */

  function blankDevice() {
    return { name: '', watts: '', hours: '', qty: '' };
  }

  function normalizeDevice(d) {
    d = d && typeof d === 'object' ? d : {};
    return {
      name: d.name == null ? '' : d.name,
      watts: d.watts == null ? '' : d.watts,
      hours: d.hours == null ? '' : d.hours,
      qty: d.qty == null ? '' : d.qty
    };
  }

  /* Stations saved before these fields existed must keep working: an absent
     `included` means "in the comparison", and an absent `priceCurrency` means
     "same as the current display currency", which suppresses the mismatch warning
     instead of inventing one. */
  function normalizeStation(s) {
    if (!s || typeof s !== 'object') return s;
    if (s.included === undefined) s.included = true;
    if (s.priceCurrency === undefined) s.priceCurrency = null;
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === 'object') {
        stations = Array.isArray(data.stations) ? data.stations.map(normalizeStation) : [];
        devices = Array.isArray(data.devices) && data.devices.length
          ? data.devices.map(normalizeDevice)
          : [blankDevice()];
        solarFactor = typeof data.solarFactor === 'number' && isFinite(data.solarFactor) ? data.solarFactor : 1.2;
        acFactor = typeof data.acFactor === 'number' && isFinite(data.acFactor) ? data.acFactor : 1.1;
        currency = CURRENCY_SYMBOLS[data.currency] ? data.currency : 'Tk';
        return;
      }
    } catch (e) { /* ignore */ }

    stations = [];
    devices = [blankDevice()];
    solarFactor = 1.2;
    acFactor = 1.1;
    currency = 'Tk';
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stations: stations,
        devices: devices,
        solarFactor: solarFactor,
        acFactor: acFactor,
        currency: currency
      }));
    } catch (e) { /* storage full or unavailable */ }
  }

  /* ---------- Helpers ---------- */

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function fmt(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '—';
    return Number(value.toFixed(2)).toString();
  }

  function num(value) {
    return typeof value === 'number' && isFinite(value) ? fmt(value) : '';
  }

  function parseNum(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    var s = String(value == null ? '' : value).trim();
    if (!/^(?:\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function isInvalidNumber(field, raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s === '') return false;
    var pattern = field === 'qty' ? /^\d+$/ : /^(?:\d+\.?\d*|\.\d+)$/;
    return !pattern.test(s);
  }

  function currencySymbol() {
    return CURRENCY_SYMBOLS[currency] || CURRENCY_SYMBOLS.Tk;
  }

  /* Prices are read at a glance and compared, so they get thousands grouping
     (`৳82,500`). Measured values keep using fmt(), whose trailing-zero trimming
     matters for Wh/W figures. */
  function fmtPrice(value) {
    if (typeof value !== 'number' || !isFinite(value)) return '—';
    return Number(value.toFixed(2)).toLocaleString('en-US');
  }

  function priceLabelFor(station) {
    if (typeof station.price !== 'number' || !isFinite(station.price)) return '—';
    return symbolFor(station.priceCurrency) + fmtPrice(station.price);
  }

  function symbolFor(code) {
    return CURRENCY_SYMBOLS[code] || CURRENCY_SYMBOLS[currency];
  }

  /* Stations carry the currency their price was typed in. Without this, switching
     the selector relabels every stored number — a BDT 82500 would render as
     $82500 — and the comparison would rank prices that are not comparable. */
  function priceCurrencies() {
    var seen = {};
    includedStations().forEach(function (s) {
      if (typeof s.price === 'number' && isFinite(s.price)) seen[s.priceCurrency || currency] = true;
    });
    return Object.keys(seen);
  }

  function hasMixedCurrencies() {
    return priceCurrencies().length > 1;
  }

  function deviceQty(d) {
    var s = String(d.qty == null ? '' : d.qty).trim();
    var q = /^\d+$/.test(s) ? parseInt(s, 10) : 1;
    return q >= 1 ? q : 1;
  }

  function getActiveStation() {
    return stations.find(function (s) { return s.id === activeStationId; }) || null;
  }

  /* A station the user has kept out of the comparison still shows its own results;
     it just does not take part in the table or the Best marks. */
  function includedStations() {
    return stations.filter(function (s) { return s.included !== false; });
  }

  /* Derived comparison metrics. Both reuse numbers already on screen: the same
     0.85 inverter factor as runtime, and the daily need every station shares. */
  function coverageDays(station) {
    if (!(dailyTotals.totalWh > 0) || !(station.capacityWh > 0)) return null;
    return (station.capacityWh * 0.85) / dailyTotals.totalWh;
  }

  function pricePerWh(station) {
    if (!(station.capacityWh > 0) || typeof station.price !== 'number' || !isFinite(station.price)) return null;
    return station.price / station.capacityWh;
  }

  function countDone(station) {
    return CALC_IDS.reduce(function (n, id) { return n + (station.calcs[id].done ? 1 : 0); }, 0);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.hidden = true; }, 200);
    }, 2600);
  }

  function setFieldError(input, message) {
    var field = input.closest('.field');
    if (!field) return;
    var error = field.querySelector('.field__error');
    if (!error) {
      error = document.createElement('div');
      error.className = 'field__error';
      field.appendChild(error);
    }
    error.textContent = message || '';
    field.classList.toggle('is-invalid', !!message);
  }

  function validate(input, condition, message) {
    if (condition) {
      setFieldError(input, '');
      return true;
    }
    setFieldError(input, message);
    return false;
  }

  /* ---------- Icons ---------- */

  function iconCheck(size) {
    size = size || 11;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"></path></svg>';
  }

  function iconWarn(size) {
    size = size || 14;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path></svg>';
  }

  function iconEdit(size) {
    size = size || 14;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
  }

  function iconTrash() {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>';
  }

  function iconX() {
    return '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
  }

  /* ---------- Calculations ---------- */

  function computeDaily() {
    var totalWh = 0;
    var totalWatts = 0;
    var deviceCount = 0;
    devices.forEach(function (d) {
      var w = parseNum(d.watts);
      var h = parseNum(d.hours);
      if (isFinite(w) && w > 0 && isFinite(h) && h > 0) {
        var q = deviceQty(d);
        totalWatts += w * q;
        totalWh += w * h * q;
        deviceCount++;
      }
    });
    return { totalWh: totalWh, totalWatts: totalWatts, deviceCount: deviceCount };
  }

  function calcRuntime(station, loadWatts) {
    return (station.capacityWh * 0.85) / loadWatts;
  }

  function calcSolar(station) {
    return (station.capacityWh / station.solarChargeW) * solarFactor;
  }

  function calcAc(station) {
    return (station.capacityWh / station.acChargeW) * acFactor;
  }

  function recomputeAll() {
    dailyTotals = computeDaily();

    stations.forEach(function (s) {
      if (dailyTotals.totalWatts > 0 && s.capacityWh > 0) {
        s.calcs.runtime.loadWatts = dailyTotals.totalWatts;
        s.calcs.runtime.hours = calcRuntime(s, dailyTotals.totalWatts);
        s.calcs.runtime.done = true;
      } else {
        s.calcs.runtime.loadWatts = dailyTotals.totalWatts > 0 ? dailyTotals.totalWatts : null;
        s.calcs.runtime.hours = 0;
        s.calcs.runtime.done = false;
      }

      if (s.solarChargeW > 0 && s.capacityWh > 0) {
        s.calcs.solar.hours = calcSolar(s);
        s.calcs.solar.done = true;
      } else {
        s.calcs.solar.hours = 0;
        s.calcs.solar.done = false;
      }

      if (s.acChargeW > 0 && s.capacityWh > 0) {
        s.calcs.ac.hours = calcAc(s);
        s.calcs.ac.done = true;
      } else {
        s.calcs.ac.hours = 0;
        s.calcs.ac.done = false;
      }
    });
  }

  /* ---------- Station factory ---------- */

  function createStation(data) {
    return {
      id: uid(),
      name: data.name,
      brand: data.brand,
      capacityWh: data.capacityWh,
      continuousOutputW: data.continuousOutputW,
      acChargeW: data.acChargeW,
      solarChargeW: data.solarChargeW,
      price: data.price,
      priceCurrency: currency,
      included: true,
      catalogId: data.catalogId || null,
      calcs: {
        runtime: { done: false, loadWatts: null, hours: 0 },
        solar: { done: false, hours: 0 },
        ac: { done: false, hours: 0 }
      }
    };
  }

  /* ---------- Catalog picker ---------- */

  function catalogBrands() {
    return CATALOG.brands;
  }

  function findBrand(name) {
    return catalogBrands().find(function (b) { return b.name === name; }) || null;
  }

  function findProduct(id) {
    var found = null;
    catalogBrands().some(function (b) {
      return b.products.some(function (p) {
        if (p.id !== id) return false;
        found = { brand: b.name, product: p };
        return true;
      });
    });
    return found;
  }

  function isProductAdded(id) {
    return stations.some(function (s) { return s.catalogId === id; });
  }

  /* Catalog prices come from a BDT source listing, so they are only prefilled
     while the app is showing BDT — otherwise the number would be read as
     whatever currency the user picked. */
  function catalogPriceMatchesCurrency() {
    return currency === 'Tk';
  }

  function bdtLabel(value) {
    return '৳' + fmt(value);
  }

  function productMetaHTML(p) {
    var parts = [
      (typeof p.capacityWh === 'number' ? fmt(p.capacityWh) + ' Wh' : '— Wh'),
      (typeof p.outputW === 'number' ? fmt(p.outputW) + ' W out' : '— W out')
    ];
    if (typeof p.peakW === 'number') parts.push(fmt(p.peakW) + ' W peak');
    return parts.map(function (part) { return esc(part); }).join(' &#183; ');
  }

  /* Every field the source listing does not state stays blank on the form, so
     name them up front instead of letting validation surprise the user. */
  function missingSpecLabels(p) {
    var missing = [];
    if (typeof p.capacityWh !== 'number') missing.push('capacity');
    if (typeof p.outputW !== 'number') missing.push('continuous output');
    if (typeof p.acInputW !== 'number') missing.push('AC input');
    if (typeof p.solarInputW !== 'number') missing.push('solar input');
    return missing;
  }

  /* A spec the source listing does not state shows as a dash here, which is the
     same signal the station form gives when the field is left blank. */
  function productChargeHTML(p) {
    var parts = [
      'AC in ' + (typeof p.acInputW === 'number' ? fmt(p.acInputW) + ' W' : '—'),
      'Solar in ' + (typeof p.solarInputW === 'number' ? fmt(p.solarInputW) + ' W' : '—')
    ];
    if (p.chemistry) parts.push(p.chemistry);
    return parts.map(function (part) { return esc(part); }).join(' &#183; ');
  }

  function renderCatalogBrands() {
    catalogBrandSelect.innerHTML = catalogBrands().map(function (b) {
      return '<option value="' + esc(b.name) + '">' + esc(b.name) + ' (' + b.products.length + ')</option>';
    }).join('');
    catalogBrandSelect.value = catalogBrand;
  }

  /* Matches on model, full name and chemistry. Every whitespace-separated term has
     to match, so "delta 2" finds "DELTA 2 Max" without also matching "DELTA Pro". */
  function matchesQuery(p, terms) {
    var haystack = [p.model, p.full, p.chemistry].filter(Boolean).join(' ').toLowerCase();
    return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
  }

  /* Plain substring matching would rank "Premium 150 AC180P" above "AC180" for the
     query "ac180", which matters because Enter takes the top match. Exact and
     prefix model hits therefore sort to the front. */
  function relevanceOf(p, query) {
    var model = String(p.model).toLowerCase();
    if (model === query) return 0;
    if (model.indexOf(query) === 0) return 1;
    return 2;
  }

  function filteredProducts() {
    var brand = findBrand(catalogBrand);
    var products = brand ? brand.products : [];
    var query = catalogQuery.trim().toLowerCase();
    if (!query) return products;

    var terms = query.split(/\s+/);
    return products
      .map(function (p, index) { return { product: p, index: index }; })
      .filter(function (entry) { return matchesQuery(entry.product, terms); })
      .map(function (entry) {
        entry.rank = relevanceOf(entry.product, query);
        return entry;
      })
      .sort(function (a, b) { return a.rank - b.rank || a.index - b.index; })
      .map(function (entry) { return entry.product; });
  }

  function updateSearchClear() {
    catalogSearchClear.hidden = catalogQuery === '';
  }

  function resetCatalogSearch() {
    catalogQuery = '';
    catalogSearchInput.value = '';
    updateSearchClear();
  }

  function renderCatalogList() {
    var brand = findBrand(catalogBrand);
    var listed = brand ? brand.products : [];
    var products = filteredProducts();
    var query = catalogQuery.trim();

    catalogCountEl.textContent = !listed.length
      ? ''
      : query
        ? '· ' + products.length + ' of ' + listed.length
        : '· ' + listed.length + (listed.length === 1 ? ' station' : ' stations');

    if (!products.length) {
      catalogList.innerHTML = '<p class="plist__empty">' + (query
        ? 'No models in ' + esc(catalogBrand) + ' match “' + esc(query) + '”.'
        : 'No stations listed for this brand.') + '</p>';
      return;
    }

    catalogList.innerHTML = products.map(function (p) {
      var selected = !!selectedProduct && selectedProduct.id === p.id;
      var added = isProductAdded(p.id);

      return '<button type="button" class="pcard' + (selected ? ' is-selected' : '') + (added ? ' is-added' : '') + '"' +
        ' data-product="' + esc(p.id) + '" role="option" aria-selected="' + (selected ? 'true' : 'false') + '">' +
        '<span class="pcard__row">' +
          '<span class="pcard__model">' + esc(p.model) + '</span>' +
          '<span class="pcard__price">' + (typeof p.price === 'number' ? esc(bdtLabel(p.price)) : '—') + '</span>' +
        '</span>' +
        '<span class="pcard__meta">' + productMetaHTML(p) + '</span>' +
        '<span class="pcard__meta">' + productChargeHTML(p) + '</span>' +
        (added ? '<span class="pcard__tags"><span class="pcard__tag pcard__tag--added">Added</span></span>' : '') +
        '</button>';
    }).join('');
  }

  function renderCatalogNote() {
    var parts = ['Prefilled from the bundled catalog — every field stays editable.'];
    if (!catalogPriceMatchesCurrency()) {
      parts.push('Catalog prices are listed in ৳ (BDT), so price is left blank while you work in ' + currency + '.');
    }
    if (selectedProduct) {
      var missing = missingSpecLabels(selectedProduct.product);
      if (missing.length) {
        parts.push('Not published for this model: ' + missing.join(', ') + ' — enter before adding.');
      }
    }
    catalogNoteEl.textContent = parts.join(' ');
  }

  function selectCatalogProduct(id) {
    var found = findProduct(id);
    if (!found) return;

    var p = found.product;
    selectedProduct = { id: p.id, brand: found.brand, product: p };

    nameInput.value = p.model || '';
    brandInput.value = found.brand;
    capacityInput.value = num(p.capacityWh);
    outputInput.value = num(p.outputW);
    /* Each field is assigned from the catalog rather than left alone, so a value
       from a previously picked model can never linger behind a new choice. */
    acChargeInput.value = num(p.acInputW);
    solarChargeInput.value = num(p.solarInputW);
    priceInput.value = catalogPriceMatchesCurrency() && typeof p.price === 'number' ? num(p.price) : '';

    clearAddErrors();
    renderCatalogList();
    renderCatalogNote();

    /* Land on whatever the listing could not supply; if nothing is missing the
       station is ready, so hand focus to the button that adds it. */
    var missingField = [capacityInput, outputInput, acChargeInput, solarChargeInput]
      .find(function (input) { return input.value === ''; });
    (missingField || stationSubmitBtn).focus();
  }

  function editingStation() {
    if (!editingStationId) return null;
    return stations.find(function (s) { return s.id === editingStationId; }) || null;
  }

  /* True when the station's saved price is already in the currency the price
     field is labelled with. A price from another currency must not be copied
     into the field, or it would silently be re-labelled on save. */
  function priceMatchesDisplayCurrency(station) {
    if (typeof station.price !== 'number' || !isFinite(station.price)) return true;
    return !station.priceCurrency || station.priceCurrency === currency;
  }

  /* One place decides the title, the subtitle, the submit label and which parts
     of the body are visible, for both the add and the edit action. */
  function setModalChrome() {
    var station = editingStation();
    var editing = !!station;
    var usingCatalog = !editing && formMode === 'catalog' && catalogBrands().length > 0;

    modalTitleEl.textContent = editing ? 'Edit Power Station' : 'Add Power Station';
    stationSubmitLabel.textContent = editing ? 'Save Changes' : 'Add Station';

    /* The catalog picker replaces every field, which would discard the station
       being edited, so it is only offered while adding. */
    stationModeSeg.hidden = editing;
    catalogPanel.hidden = !usingCatalog;

    if (editing) {
      var sub = 'Change any spec — the results and the comparison update when you save.';
      if (!priceMatchesDisplayCurrency(station)) {
        sub += ' The saved price is in ' + (station.priceCurrency || 'another currency') +
          ', so the price field is blank to avoid relabelling it.';
      }
      modalSubEl.textContent = sub;
      return;
    }

    modalSubEl.textContent = usingCatalog
      ? 'Pick a model and its specs are filled in, or enter them yourself.'
      : 'Enter the specs from the manufacturer sheet.';
  }

  function setFormMode(mode) {
    formMode = mode === 'custom' ? 'custom' : 'catalog';
    var usingCatalog = formMode === 'catalog' && catalogBrands().length > 0;

    modeCatalogBtn.classList.toggle('is-active', usingCatalog);
    modeCustomBtn.classList.toggle('is-active', !usingCatalog);
    modeCatalogBtn.setAttribute('aria-selected', usingCatalog ? 'true' : 'false');
    modeCustomBtn.setAttribute('aria-selected', usingCatalog ? 'false' : 'true');

    if (!usingCatalog && !editingStation()) {
      selectedProduct = null;
      addForm.reset();
      clearAddErrors();
      resetCatalogSearch();
      renderCatalogList();
      renderCatalogNote();
    }
    setModalChrome();
  }

  /* ---------- Station modal ---------- */

  function openStationModal() {
    editingStationId = null;
    stationModal.hidden = false;
    document.body.classList.add('is-modal-open');

    selectedProduct = null;
    addForm.reset();
    clearAddErrors();
    resetCatalogSearch();
    renderCatalogBrands();
    renderCatalogList();
    renderCatalogNote();
    setFormMode(formMode);

    if (formMode === 'catalog' && catalogBrands().length) {
      catalogBrandSelect.focus();
    } else {
      nameInput.focus();
    }
  }

  /* Loads the station into the same form the add action uses. */
  function openEditStationModal(id) {
    var station = stations.find(function (s) { return s.id === id; });
    if (!station) return;

    editingStationId = id;
    stationModal.hidden = false;
    document.body.classList.add('is-modal-open');

    selectedProduct = null;
    addForm.reset();
    clearAddErrors();
    resetCatalogSearch();

    nameInput.value = station.name || '';
    brandInput.value = station.brand || '';
    capacityInput.value = num(station.capacityWh);
    outputInput.value = num(station.continuousOutputW);
    acChargeInput.value = num(station.acChargeW);
    solarChargeInput.value = num(station.solarChargeW);
    priceInput.value = priceMatchesDisplayCurrency(station) ? num(station.price) : '';

    setModalChrome();
    nameInput.focus();
    nameInput.select();
  }

  function closeStationModal(reset) {
    stationModal.hidden = true;
    document.body.classList.remove('is-modal-open');
    if (reset) {
      addForm.reset();
      clearAddErrors();
      resetCatalogSearch();
      selectedProduct = null;
      editingStationId = null;
      setModalChrome();
    }
  }

  /* ---------- Rendering ---------- */

  function render() {
    var hasStations = stations.length > 0;
    emptyState.hidden = hasStations;
    stationsArea.hidden = !hasStations;

    if (!hasStations) {
      activeStationId = null;
    } else if (!stations.some(function (s) { return s.id === activeStationId; })) {
      activeStationId = stations[0].id;
    }

    if (hasStations) {
      renderStationTabs();
      renderStationContent();
    } else {
      stationTabs.innerHTML = '';
      stationContent.innerHTML = '';
    }

    updateCompareCta();
    renderComparison();
    renderPrintReport();
  }

  /* The nav button says what it will actually do: how many stations are in the
     running, not a promise to "generate" something already computed. */
  function updateCompareCta() {
    var n = includedStations().length;
    var label = n ? 'Compare (' + n + ')' : 'Compare';
    var long = generateCompareBtn.querySelector('.btn__label--long');
    var short = generateCompareBtn.querySelector('.btn__label--short');
    if (long) long.textContent = label;
    if (short) short.textContent = label;
  }

  /* Send the user to whatever is actually blocking the comparison. */
  function gotoMissing(stationId, field) {
    if (field === 'devices') {
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = deviceRows.querySelector('input[data-field="name"]');
      if (first) first.focus();
      return;
    }
    if (stationId) {
      activeStationId = stationId;
      render();
    }
    stationsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderStationTabs() {
    var html = stations.map(function (s) {
      var done = countDone(s);
      var active = s.id === activeStationId ? 'is-active' : '';
      return '<button type="button" class="tab ' + active + '" data-station="' + esc(s.id) + '" role="tab" aria-selected="' + (s.id === activeStationId) + '">' +
        '<span>' + esc(s.name) + '</span>' +
        '<span class="tab__count' + (done === CALC_IDS.length ? '' : ' tab__count--todo') + '">' + done + '/' + CALC_IDS.length + '</span>' +
        '<span class="tab__remove" data-remove-station="' + esc(s.id) + '" aria-label="Delete ' + esc(s.name) + '">' + iconX() + '</span>' +
        '</button>';
    }).join('');

    stationTabs.innerHTML = html;

    stationTabs.querySelectorAll('.tab[data-station]').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        if (e.target.closest('[data-remove-station]')) return;
        activeStationId = tab.dataset.station;
        render();
        /* Only on an explicit tab change — render() also runs on every keystroke,
           and re-scrolling then would yank the page while the user is typing. */
        var active = stationTabs.querySelector('.tab.is-active');
        if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });

    stationTabs.querySelectorAll('[data-remove-station]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.removeStation;
        var station = stations.find(function (s) { return s.id === id; });
        if (window.confirm('Delete "' + (station ? station.name : 'this station') + '"?')) {
          stations = stations.filter(function (s) { return s.id !== id; });
          save();
          if (activeStationId === id) activeStationId = stations.length ? stations[0].id : null;
          render();
          showToast('Power station deleted');
        }
      });
    });
  }

  function renderStationContent() {
    var station = getActiveStation();
    if (!station) {
      stationContent.innerHTML = '';
      return;
    }
    stationContent.innerHTML = stationSummaryHTML(station) + stationResultsHTML(station);
  }

  function stationSummaryHTML(station) {
    var done = countDone(station);
    var pct = Math.round(done / CALC_IDS.length * 100);
    var days = coverageDays(station);
    var perWh = pricePerWh(station);
    var metrics = [
      ['Brand', station.brand || '—'],
      ['Capacity', fmt(station.capacityWh) + ' Wh'],
      ['Output', fmt(station.continuousOutputW) + ' W'],
      ['AC Input', fmt(station.acChargeW) + ' W'],
      ['Solar Input', fmt(station.solarChargeW) + ' W'],
      ['Price', priceLabelFor(station)]
    ];
    if (days !== null) metrics.push(['Coverage', fmt(days) + (displayNumber(days) === 1 ? ' day' : ' days')]);
    if (perWh !== null) metrics.push(['Price / Wh', symbolFor(station.priceCurrency) + fmtPrice(perWh)]);
    var tiles = metrics.map(function (m) {
      return '<div class="metric">' +
        '<span class="metric__label">' + esc(m[0]) + '</span>' +
        '<span class="metric__value">' + esc(m[1]) + '</span>' +
        '</div>';
    }).join('');
    return '<div class="station-summary">' +
      '<div class="station-summary__grid">' + tiles + '</div>' +
      '<div class="progress" aria-hidden="true"><div class="progress__bar" style="width:' + pct + '%"></div></div>' +
      '<div class="station-summary__actions">' +
      '<label class="shortlist">' +
      '<input type="checkbox" data-include="' + esc(station.id) + '"' + (station.included !== false ? ' checked' : '') + '>' +
      '<span>Include in comparison</span>' +
      '</label>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-edit-station="' + esc(station.id) + '">' +
      iconEdit() + 'Edit Specs</button>' +
      '</div>' +
      '</div>';
  }

  function stationResultsHTML(station) {
    return '<div class="results-grid">' +
      runtimeTileHTML(station) +
      solarTileHTML(station) +
      acTileHTML(station) +
      '</div>';
  }

  function tileHTML(modifier, label, value, unit, meta, statusHTML) {
    return '<div class="result-tile result-tile--' + modifier + '">' +
      '<div class="result-tile__label">' + label + '</div>' +
      '<div class="result-tile__value">' + value + (unit ? ' <span class="result-tile__unit">' + unit + '</span>' : '') + '</div>' +
      (meta ? '<div class="result-tile__meta">' + meta + '</div>' : '') +
      (statusHTML || '') +
      '</div>';
  }

  function runtimeTileHTML(station) {
    var r = station.calcs.runtime;
    if (!r.done) {
      return tileHTML('runtime', 'Runtime', '—', '', 'Add devices to estimate', '');
    }
    var over = r.loadWatts > station.continuousOutputW;
    var status = over
      ? '<div class="result-tile__status result-tile__status--warn">' + iconWarn() + ' Load exceeds output (' + fmt(station.continuousOutputW) + ' W)</div>'
      : '<div class="result-tile__status result-tile__status--ok">' + iconCheck(14) + ' Within continuous output (' + fmt(station.continuousOutputW) + ' W)</div>';
    return tileHTML('runtime', 'Runtime', fmt(r.hours), 'hours', 'At ' + fmt(r.loadWatts) + ' W load', status);
  }

  function solarTileHTML(station) {
    var c = station.calcs.solar;
    if (!c.done) {
      return tileHTML('solar', 'Solar Recharge', '—', '', 'Add solar input', '');
    }
    return tileHTML('solar', 'Solar Recharge', fmt(c.hours), 'hours', fmt(station.solarChargeW) + ' W solar × ' + fmt(solarFactor), '');
  }

  function acTileHTML(station) {
    var c = station.calcs.ac;
    if (!c.done) {
      return tileHTML('ac', 'AC Recharge', '—', '', 'Add AC input', '');
    }
    return tileHTML('ac', 'AC Recharge', fmt(c.hours), 'hours', fmt(station.acChargeW) + ' W AC × ' + fmt(acFactor), '');
  }

  /* ---------- Comparison ---------- */

  /* One definition per column drives both the header buttons and the body cells,
     so a column's label, its sort key and its bar can never drift apart.
     `bar` is only set on metrics where a longer bar means better — barring the
     recharge times would draw "best" as the shortest bar and misread badly. */
  var COMPARE_COLUMNS = [
    { key: 'name', label: 'Power Station', sortable: false },
    { key: 'price', label: 'Price', sortable: true, better: 'low' },
    { key: 'perWh', label: 'Price / Wh', sortable: true, better: 'low' },
    { key: 'capacity', label: 'Capacity', sortable: true, better: 'high', bar: true },
    { key: 'coverage', label: 'Coverage', sortable: true, better: 'high', bar: true },
    { key: 'runtime', label: 'Runtime', sortable: true, better: 'high', bar: true, best: true },
    { key: 'solar', label: 'Solar Recharge', sortable: true, better: 'low', best: true },
    { key: 'ac', label: 'AC Recharge', sortable: true, better: 'low', best: true }
  ];

  var RANK_METRICS = [
    { key: 'runtime', label: 'Runtime', better: 'high' },
    { key: 'coverage', label: 'Coverage', better: 'high' },
    { key: 'capacity', label: 'Capacity', better: 'high' },
    { key: 'solar', label: 'Solar', better: 'low' },
    { key: 'ac', label: 'AC', better: 'low' },
    { key: 'price', label: 'Price', better: 'low' }
  ];

  var BEST_KEYS = [
    { key: 'runtime', better: 'high' },
    { key: 'solar', better: 'low' },
    { key: 'ac', better: 'low' }
  ];

  function compareValue(station, key) {
    switch (key) {
      case 'price': return typeof station.price === 'number' && isFinite(station.price) ? station.price : null;
      case 'perWh': return pricePerWh(station);
      case 'capacity': return station.capacityWh > 0 ? station.capacityWh : null;
      case 'coverage': return coverageDays(station);
      case 'runtime': return station.calcs.runtime.done ? station.calcs.runtime.hours : null;
      case 'solar': return station.calcs.solar.done ? station.calcs.solar.hours : null;
      case 'ac': return station.calcs.ac.done ? station.calcs.ac.hours : null;
      default: return null;
    }
  }

  /* What the cell actually prints, at fmt()'s two-decimal precision. */
  function displayNumber(value) {
    return value === null || value === undefined ? null : Number(value.toFixed(2));
  }

  function compareText(station, key) {
    var value = compareValue(station, key);
    if (value === null) return '—';
    switch (key) {
      case 'price': return priceLabelFor(station);
      case 'perWh': return symbolFor(station.priceCurrency) + fmtPrice(value);
      case 'capacity': return fmt(value) + ' Wh';
      case 'coverage': return fmt(value) + (displayNumber(value) === 1 ? ' day' : ' days');
      default: return fmt(value) + ' h';
    }
  }

  /* Best is decided on the printed value, not the raw float: comparing raw hours
     let two stations both display "8.7 h" with only one of them badged. */
  function bestValues() {
    var list = includedStations();
    if (list.length < 2) return {};
    var best = {};
    BEST_KEYS.forEach(function (spec) {
      var values = list.map(function (s) { return displayNumber(compareValue(s, spec.key)); })
        .filter(function (v) { return v !== null; });
      if (!values.length) return;
      best[spec.key] = spec.better === 'high'
        ? Math.max.apply(null, values)
        : Math.min.apply(null, values);
    });
    return best;
  }

  function isBestCell(station, key, best) {
    var value = displayNumber(compareValue(station, key));
    return value !== null && best[key] !== undefined && value === best[key];
  }

  /* Bar scales, one per barrable column. A column where every station ties gets
     no scale at all, so nothing renders as a row of identical full-width bars. */
  function barScales() {
    var scales = {};
    COMPARE_COLUMNS.filter(function (col) { return col.bar; }).forEach(function (col) {
      var values = includedStations().map(function (s) { return compareValue(s, col.key); })
        .filter(function (v) { return typeof v === 'number' && isFinite(v) && v > 0; });
      if (values.length < 2) return;
      var max = Math.max.apply(null, values);
      if (!(max > Math.min.apply(null, values))) return;
      scales[col.key] = max;
    });
    return scales;
  }

  function barHTML(station, key, max) {
    var value = compareValue(station, key);
    if (!(max > 0) || !(value > 0)) return '';
    var pct = Math.max(3, Math.round(value / max * 100));
    return '<span class="compare-bar" aria-hidden="true">' +
      '<span class="compare-bar__fill" style="width:' + pct + '%"></span></span>';
  }

  function sortedIncludedStations() {
    var list = includedStations().slice();
    var key = comparisonSort.key;
    if (!key) return list;
    var dir = comparisonSort.dir === 'desc' ? -1 : 1;
    return list
      .map(function (s, index) { return { station: s, index: index }; })
      .sort(function (a, b) {
        var av = compareValue(a.station, key);
        var bv = compareValue(b.station, key);
        /* Blanks sink to the bottom whichever way the column is pointing —
           reversing them would put "—" rows on top, which reads as "best". */
        if (av === null && bv === null) return a.index - b.index;
        if (av === null) return 1;
        if (bv === null) return -1;
        if (av === bv) return a.index - b.index;
        return (av - bv) * dir;
      })
      .map(function (entry) { return entry.station; });
  }

  function compareHeadHTML() {
    var cells = COMPARE_COLUMNS.map(function (col) {
      if (!col.sortable) return '<th scope="col">' + esc(col.label) + '</th>';
      var active = comparisonSort.key === col.key;
      var state = active ? (comparisonSort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" aria-sort="' + state + '">' +
        '<button type="button" class="compare-sort' + (active ? ' is-active' : '') + '" data-sort="' + col.key + '">' +
        esc(col.label) +
        '<span class="compare-sort__arrow" aria-hidden="true">' + (active ? (comparisonSort.dir === 'asc' ? '↑' : '↓') : '↕') + '</span>' +
        '</button></th>';
    }).join('');
    return '<thead><tr>' + cells + '</tr></thead>';
  }

  function compareRowHTML(station, best, scales) {
    var cells = COMPARE_COLUMNS.map(function (col) {
      if (col.key === 'name') {
        return '<td data-label="Power Station" class="compare-station">' +
          '<span class="compare-station__name">' + esc(station.name) + '</span>' +
          '<span class="compare-station__brand">' + esc(station.brand || '—') + '</span>' +
          '</td>';
      }
      var text = compareText(station, col.key);
      var marked = col.best && isBestCell(station, col.key, best);
      var bar = scales[col.key] ? barHTML(station, col.key, scales[col.key]) : '';
      return '<td data-label="' + esc(col.label) + '"' + (marked ? ' class="is-best"' : '') + '>' +
        (marked ? '<span class="best-badge" title="Best">' + text + '</span>' : text) +
        bar +
        '</td>';
    }).join('');
    return '<tr>' + cells + '</tr>';
  }

  // Daily need is identical for every station, so it sits above the table
  // instead of repeating as a column.
  function dailyNeedHTML() {
    return '<div class="compare-daily">' +
      '<span class="compare-daily__label">Daily Energy Need — shared by every station</span>' +
      '<span class="compare-daily__values">' +
      '<span><strong>' + fmt(dailyTotals.totalWh) + ' Wh</strong> per day</span>' +
      '<span><strong>' + fmt(dailyTotals.totalWatts) + ' W</strong> total load</span>' +
      '</span>' +
      '</div>';
  }

  /* Stations stamped with different currencies cannot be ranked against each
     other, and inventing an exchange rate would be worse than saying so. */
  function mixedCurrencyHTML() {
    if (!hasMixedCurrencies()) return '';
    return '<p class="compare-warn">' + iconWarn() + ' These stations have prices in different currencies (' +
      priceCurrencies().join(', ') + '), so price and Price / Wh are not directly comparable.</p>';
  }

  function compareTableHTML() {
    var list = sortedIncludedStations();
    var best = bestValues();
    var scales = barScales();
    var rows = list.map(function (s) { return compareRowHTML(s, best, scales); }).join('');
    return '<div class="compare-table-wrap"><table class="compare-table">' +
      compareHeadHTML() + '<tbody>' + rows + '</tbody></table></div>';
  }

  /* ---------- Mobile ranked comparison ---------- */

  function isNarrow() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  /* The ranked list is offered on every screen size. Until the user picks a view
     explicitly, a narrow screen leads with the ranking (a stack of station cards
     cannot be compared) and a wide one leads with the table. */
  function resolvedCompareView() {
    return compareView || (isNarrow() ? 'ranked' : 'specs');
  }

  function rankControlsHTML() {
    var view = resolvedCompareView();
    var metrics = RANK_METRICS.map(function (m) {
      return '<button type="button" class="rank-pick' + (m.key === rankedMetric ? ' is-active' : '') +
        '" data-metric="' + m.key + '">' + esc(m.label) + '</button>';
    }).join('');
    return '<div class="compare-rank__controls">' +
      '<div class="seg seg--view" role="tablist" aria-label="Comparison view">' +
      '<button type="button" class="seg__btn' + (view === 'ranked' ? ' is-active' : '') + '" data-view="ranked" role="tab" aria-selected="' + (view === 'ranked') + '">Ranked</button>' +
      '<button type="button" class="seg__btn' + (view === 'specs' ? ' is-active' : '') + '" data-view="specs" role="tab" aria-selected="' + (view === 'specs') + '">All Specs</button>' +
      '</div>' +
      '<div class="rank-picks" role="group" aria-label="Rank by">' + metrics + '</div>' +
      '</div>';
  }

  /* Always rendered; CSS decides whether the card is currently showing it. */
  function rankedHTML() {
    var metric = RANK_METRICS.filter(function (m) { return m.key === rankedMetric; })[0] || RANK_METRICS[0];
    var list = includedStations().filter(function (s) { return compareValue(s, metric.key) !== null; });

    if (!list.length) {
      return '<div class="compare-rank"><p class="compare-check__lead">Nothing to rank yet — ' +
        esc(metric.label.toLowerCase()) + ' is unavailable for the included stations.</p></div>';
    }

    list.sort(function (a, b) {
      var av = compareValue(a, metric.key);
      var bv = compareValue(b, metric.key);
      return metric.better === 'high' ? bv - av : av - bv;
    });

    var values = list.map(function (s) { return compareValue(s, metric.key); });
    var max = Math.max.apply(null, values);
    var showBars = max > Math.min.apply(null, values);
    var best = bestValues();

    var rows = list.map(function (s, i) {
      var value = compareValue(s, metric.key);
      var marked = BEST_KEYS.some(function (b) { return b.key === metric.key; }) && isBestCell(s, metric.key, best);
      var bar = showBars
        ? '<span class="compare-bar" aria-hidden="true"><span class="compare-bar__fill" style="width:' +
          Math.max(3, Math.round(value / max * 100)) + '%"></span></span>'
        : '';
      return '<li class="rank">' +
        '<div class="rank__top">' +
        '<span class="rank__pos">' + (i + 1) + '</span>' +
        '<span class="rank__name">' + esc(s.name) + '</span>' +
        '<span class="rank__value' + (marked ? ' is-best' : '') + '">' + compareText(s, metric.key) + '</span>' +
        '</div>' +
        '<div class="rank__brand">' + esc(s.brand || '—') + '</div>' +
        bar +
        '</li>';
    }).join('');

    return '<div class="compare-rank"><ol class="rank-list">' + rows + '</ol></div>';
  }

  /* ---------- Locked state ---------- */

  function compareChecklistHTML() {
    var noDevices = !(dailyTotals.totalWatts > 0);
    var items = [];

    if (noDevices) {
      items.push('<li class="check">' +
        '<span class="check__body"><span class="check__what">Daily Energy Consumption</span>' +
        '<span class="check__why">Add at least one device — runtime needs a total load.</span></span>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-goto-field="devices">Go</button>' +
        '</li>');
    }

    includedStations().forEach(function (s) {
      var missing = [];
      if (!s.calcs.runtime.done && !noDevices) missing.push('capacity');
      if (!s.calcs.solar.done) missing.push('solar input');
      if (!s.calcs.ac.done) missing.push('AC input');
      if (!missing.length) return;
      var field = !s.calcs.ac.done ? 'station-accharge' : (!s.calcs.solar.done ? 'station-solarcharge' : 'station-capacity');
      items.push('<li class="check">' +
        '<span class="check__body"><span class="check__what">' + esc(s.name) + '</span>' +
        '<span class="check__why">Needs ' + esc(missing.join(' and ')) + '.</span></span>' +
        '<button type="button" class="btn btn--ghost btn--sm" data-goto-station="' + esc(s.id) + '" data-goto-field="' + field + '">Go</button>' +
        '</li>');
    });

    if (!items.length) return '';

    return '<div class="compare-check">' +
      '<p class="compare-check__lead">Still needed before the comparison unlocks:</p>' +
      '<ul class="check-list">' + items.join('') + '</ul>' +
      '</div>';
  }

  function renderComparison() {
    if (stations.length === 0) {
      compareHint.textContent = 'Add a power station and complete the shared inputs to generate the comparison.';
      compareArea.innerHTML = '<div class="compare-empty">' +
        '<h3>How the comparison works</h3>' +
        '<ol class="compare-steps">' +
        '<li>List the devices you want to run, so every station is judged against the same load.</li>' +
        '<li>Add two or more power stations — pick them from the catalog and the specs are filled in.</li>' +
        '<li>Once each station has its inputs, the side-by-side table appears here and can be saved as a PDF.</li>' +
        '</ol></div>';
      return;
    }

    var list = includedStations();

    if (!list.length) {
      compareHint.textContent = 'Every station is currently excluded from the comparison.';
      compareArea.innerHTML = '<div class="compare-locked">Include at least one station from its summary to build the comparison.</div>';
      return;
    }

    var complete = list.every(function (s) { return countDone(s) === CALC_IDS.length; });

    if (!complete) {
      var total = list.length * CALC_IDS.length;
      var doneCount = 0;
      list.forEach(function (s) { doneCount += countDone(s); });
      compareHint.textContent = 'Complete every station\'s inputs to generate the table (' + doneCount + '/' + total + ' complete).';
      compareArea.innerHTML = '<div class="compare-locked">' + compareChecklistHTML() + '</div>';
      return;
    }

    compareHint.textContent = list.length > 1
      ? 'All inputs complete — here is the side-by-side summary.'
      : 'Add a second station to see a side-by-side comparison.';

    compareArea.innerHTML = comparisonCardHTML();
  }

  function comparisonCardHTML() {
    return '<div class="compare-card' + (resolvedCompareView() === 'ranked' ? ' is-rank' : ' is-specs') + '">' +
      '<div class="compare-card__head">' +
      '<div><h3>Comparison</h3><p class="compare-note">Rank by any metric — longest runtime and shortest recharge times are marked "Best". Choose "Save as PDF" in the print dialog to download.</p></div>' +
      '<button type="button" class="btn btn--primary" id="download-pdf">Download PDF</button>' +
      '</div>' +
      dailyNeedHTML() +
      mixedCurrencyHTML() +
      rankControlsHTML() +
      compareTableHTML() +
      rankedHTML() +
      '</div>';
  }

  /* ---------- Print report ---------- */

  function renderPrintReport() {
    var hasData = stations.length > 0 || dailyTotals.deviceCount > 0;
    if (!hasData) {
      printReport.innerHTML = '';
      return;
    }

    var html = '<h1 class="print-report__title">Power Station Report</h1>';
    html += '<p class="print-report__date">Generated on ' + new Date().toLocaleDateString() + ' · Currency: ' + esc(currency) + ' (' + currencySymbol() + ')</p>';

    html += '<h2 class="print-report__h2">Daily Energy Consumption</h2>';
    var deviceRowsHTML = devices.map(function (d) {
      var w = parseNum(d.watts);
      var h = parseNum(d.hours);
      if (!isFinite(w) || w <= 0 || !isFinite(h) || h <= 0) return '';
      var q = deviceQty(d);
      return '<tr>' +
        '<td>' + esc(d.name || 'Unnamed device') + '</td>' +
        '<td>' + fmt(q) + '</td>' +
        '<td>' + fmt(w) + ' W</td>' +
        '<td>' + fmt(h) + ' h</td>' +
        '<td>' + fmt(w * h * q) + ' Wh</td>' +
        '</tr>';
    }).join('');
    html += '<table class="report-table">' +
      '<thead><tr><th>Device</th><th>Qty</th><th>Watts</th><th>Hours</th><th>Wh</th></tr></thead>' +
      '<tbody>' + deviceRowsHTML +
      '<tr class="report-table__total"><td>Total</td><td></td><td>' + fmt(dailyTotals.totalWatts) + ' W</td><td></td><td>' + fmt(dailyTotals.totalWh) + ' Wh</td></tr>' +
      '</tbody></table>';
    html += '<p class="print-report__note">Derate factors — solar: ×' + fmt(solarFactor) + ', AC: ×' + fmt(acFactor) + '. Runtime uses a 0.85 inverter efficiency factor.</p>';

    html += '<h2 class="print-report__h2">Power Stations Summary</h2>';
    stations.forEach(function (s) { html += reportStationHTML(s); });

    printReport.innerHTML = html;
  }

  function reportStationHTML(s) {
    var r = s.calcs.runtime;
    var over = r.done && r.loadWatts > s.continuousOutputW;
    return '<div class="report-station">' +
      '<h3>' + esc(s.name) + (s.brand ? ' <span>· ' + esc(s.brand) + '</span>' : '') + '</h3>' +
      '<table class="report-table">' +
      '<thead><tr><th>Capacity</th><th>Continuous Output</th><th>AC Input</th><th>Solar Input</th><th>Price</th></tr></thead>' +
      '<tbody><tr>' +
      '<td>' + fmt(s.capacityWh) + ' Wh</td>' +
      '<td>' + fmt(s.continuousOutputW) + ' W</td>' +
      '<td>' + fmt(s.acChargeW) + ' W</td>' +
      '<td>' + fmt(s.solarChargeW) + ' W</td>' +
      '<td>' + priceLabelFor(s) + '</td>' +
      '</tr></tbody></table>' +
      '<table class="report-table">' +
      '<thead><tr><th>Runtime</th><th>Solar Recharge</th><th>AC Recharge</th></tr></thead>' +
      '<tbody><tr>' +
      '<td>' + (r.done ? fmt(r.hours) + ' h' : '—') + '</td>' +
      '<td>' + (s.calcs.solar.done ? fmt(s.calcs.solar.hours) + ' h' : '—') + '</td>' +
      '<td>' + (s.calcs.ac.done ? fmt(s.calcs.ac.hours) + ' h' : '—') + '</td>' +
      '</tr></tbody></table>' +
      (r.done ? '<p class="report-station__status' + (over ? ' report-station__status--warn' : '') + '">' +
        (over ? 'Load exceeds continuous output (' + fmt(s.continuousOutputW) + ' W)' : 'Within continuous output (' + fmt(s.continuousOutputW) + ' W) at ' + fmt(r.loadWatts) + ' W load') +
        '</p>' : '') +
      '</div>';
  }

  /* ---------- Shared input rendering ---------- */

  function renderDeviceRows() {
    deviceRows.innerHTML = devices.map(function (d, i) {
      return '<tr data-device="' + i + '">' +
        '<td class="device-cell device-cell--name"><input type="text" data-field="name" value="' + esc(d.name) + '" placeholder="Laptop" autocomplete="off"></td>' +
        '<td class="device-cell device-table__qty" data-label="Qty"><input type="number" data-field="qty" value="' + esc(d.qty) + '" min="1" step="1" placeholder="1" inputmode="numeric"' + (isInvalidNumber('qty', d.qty) ? ' class="is-invalid"' : '') + '></td>' +
        '<td class="device-cell" data-label="Watts (W)"><input type="number" data-field="watts" value="' + esc(d.watts) + '" min="0" step="0.5" placeholder="100" inputmode="decimal"' + (isInvalidNumber('watts', d.watts) ? ' class="is-invalid"' : '') + '></td>' +
        '<td class="device-cell" data-label="Hours (h)"><input type="number" data-field="hours" value="' + esc(d.hours) + '" min="0" step="0.5" placeholder="5" inputmode="decimal"' + (isInvalidNumber('hours', d.hours) ? ' class="is-invalid"' : '') + '></td>' +
        '<td class="device-cell" data-label="Energy (Wh)" data-wh>—</td>' +
        '<td class="device-cell device-cell--remove"><button type="button" class="device-remove" data-remove="' + i + '" aria-label="Remove device">' + iconTrash() + '</button></td>' +
        '</tr>';
    }).join('');
  }

  function updateDeviceUI() {
    deviceRows.querySelectorAll('tr[data-device]').forEach(function (row) {
      var idx = Number(row.dataset.device);
      var d = devices[idx];
      if (!d) return;
      var w = parseNum(d.watts);
      var h = parseNum(d.hours);
      var wh = isFinite(w) && isFinite(h) && w > 0 && h > 0 ? w * h * deviceQty(d) : 0;
      row.querySelector('[data-wh]').textContent = wh > 0 ? fmt(wh) : '—';
    });
    dailyWattsEl.textContent = fmt(dailyTotals.totalWatts) + ' W';
    dailyWhEl.textContent = fmt(dailyTotals.totalWh) + ' Wh';
  }

  function setSharedInputs() {
    currencyInput.value = currency;
    solarFactorInput.value = num(solarFactor);
    acFactorInput.value = num(acFactor);
    priceLabelEl.textContent = 'Price (' + currencySymbol() + ')';
  }

  /* ---------- Events ---------- */

  function bindGlobalEvents() {
    openModalBtn.addEventListener('click', openStationModal);
    emptyAddBtn.addEventListener('click', openStationModal);
    cancelModalBtn.addEventListener('click', function () {
      closeStationModal(true);
    });

    modeCatalogBtn.addEventListener('click', function () {
      setFormMode('catalog');
    });

    modeCustomBtn.addEventListener('click', function () {
      setFormMode('custom');
    });

    catalogBrandSelect.addEventListener('change', function () {
      catalogBrand = catalogBrandSelect.value;
      selectedProduct = null;
      /* A query typed for one brand usually matches nothing in the next, so a
         brand change starts from a clean search. */
      resetCatalogSearch();
      renderCatalogList();
      renderCatalogNote();
    });

    catalogSearchInput.addEventListener('input', function () {
      catalogQuery = catalogSearchInput.value;
      updateSearchClear();
      renderCatalogList();
    });

    catalogSearchInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      /* Enter inside the form would submit it, so take the top match instead. */
      e.preventDefault();
      var first = catalogList.querySelector('.pcard');
      if (first) selectCatalogProduct(first.dataset.product);
    });

    catalogSearchClear.addEventListener('click', function () {
      resetCatalogSearch();
      renderCatalogList();
      catalogSearchInput.focus();
    });

    catalogList.addEventListener('click', function (e) {
      var card = e.target.closest('[data-product]');
      if (!card) return;
      selectCatalogProduct(card.dataset.product);
    });

    addDeviceBtn.addEventListener('click', function () {
      devices.push(blankDevice());
      recomputeAll();
      renderDeviceRows();
      updateDeviceUI();
      save();
      render();
      var inputs = deviceRows.querySelectorAll('input[data-field="name"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    deviceRows.addEventListener('input', function (e) {
      var row = e.target.closest('tr[data-device]');
      if (!row) return;
      var idx = Number(row.dataset.device);
      var field = e.target.dataset.field;
      if (!field || !devices[idx]) return;
      devices[idx][field] = e.target.value;
      if (field !== 'name' && e.target.classList) {
        e.target.classList.toggle('is-invalid', isInvalidNumber(field, e.target.value));
      }
      recomputeAll();
      updateDeviceUI();
      save();
      render();
    });

    deviceRows.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (!btn) return;
      var idx = Number(btn.dataset.remove);
      devices.splice(idx, 1);
      if (devices.length === 0) devices.push(blankDevice());
      recomputeAll();
      renderDeviceRows();
      updateDeviceUI();
      save();
      render();
    });

    currencyInput.addEventListener('change', function () {
      if (CURRENCY_SYMBOLS[currencyInput.value]) currency = currencyInput.value;
      setSharedInputs();
      save();
      render();
    });

    bindFactorInput(solarFactorInput, function (v) { solarFactor = v; });
    bindFactorInput(acFactorInput, function (v) { acFactor = v; });

    function closeGuideline() {
      guidelineModal.hidden = true;
      document.body.classList.remove('is-modal-open');
    }

    openGuidelineBtn.addEventListener('click', function () {
      guidelineModal.hidden = false;
      document.body.classList.add('is-modal-open');
    });

    guidelineMask.addEventListener('click', closeGuideline);
    guidelineCloseBtn.addEventListener('click', closeGuideline);

    generateCompareBtn.addEventListener('click', function () {
      var list = includedStations();
      if (!list.length) {
        showToast('Add a power station first');
        document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      var missing = list.filter(function (s) { return countDone(s) !== CALC_IDS.length; });
      if (missing.length) {
        showToast(missing.length === 1
          ? missing[0].name + ' still needs input — see the checklist'
          : missing.length + ' stations still need input — see the checklist');
      }
      document.getElementById('compare').scrollIntoView({ behavior: 'smooth' });
    });

    /* One delegated listener for everything the comparison renders, so no
       per-render binding accumulates as the table is rebuilt on every keystroke. */
    compareArea.addEventListener('click', function (e) {
      var sortBtn = e.target.closest('[data-sort]');
      if (sortBtn) {
        var key = sortBtn.dataset.sort;
        var col = COMPARE_COLUMNS.filter(function (c) { return c.key === key; })[0];
        if (comparisonSort.key === key) {
          comparisonSort.dir = comparisonSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          comparisonSort.key = key;
          /* Open on the useful end: cheapest first, longest first. */
          comparisonSort.dir = col && col.better === 'low' ? 'asc' : 'desc';
        }
        renderComparison();
        var again = compareArea.querySelector('[data-sort="' + key + '"]');
        if (again) again.focus();
        return;
      }

      var viewBtn = e.target.closest('[data-view]');
      if (viewBtn) {
        /* An explicit choice pins the view and stops it tracking the screen size. */
        compareView = viewBtn.dataset.view === 'specs' ? 'specs' : 'ranked';
        renderComparison();
        var viewAgain = compareArea.querySelector('[data-view="' + compareView + '"]');
        if (viewAgain) viewAgain.focus();
        return;
      }

      var metricBtn = e.target.closest('[data-metric]');
      if (metricBtn) {
        rankedMetric = metricBtn.dataset.metric;
        renderComparison();
        var metricAgain = compareArea.querySelector('[data-metric="' + rankedMetric + '"]');
        if (metricAgain) metricAgain.focus();
        return;
      }

      var goBtn = e.target.closest('[data-goto-field]');
      if (goBtn) {
        gotoMissing(goBtn.dataset.gotoStation, goBtn.dataset.gotoField);
        return;
      }

      if (e.target.closest('#download-pdf')) window.print();
    });

    stationContent.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-edit-station]');
      if (btn) openEditStationModal(btn.dataset.editStation);
    });

    /* While the view is still automatic, crossing the breakpoint has to swap it.
       A pinned choice is left alone. */
    var resizeTimer;
    window.addEventListener('resize', function () {
      if (compareView) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderComparison, 150);
    });

    /* Shortlist toggle lives in the station summary. */
    stationContent.addEventListener('change', function (e) {
      var box = e.target.closest('[data-include]');
      if (!box) return;
      var station = stations.find(function (s) { return s.id === box.dataset.include; });
      if (!station) return;
      station.included = box.checked;
      save();
      render();
      showToast(box.checked ? station.name + ' added to the comparison' : station.name + ' removed from the comparison');
    });

    clearAllBtn.addEventListener('click', function () {
      if (stations.length === 0 && devices.length === 1 && !devices[0].name && !devices[0].watts && !devices[0].hours && !devices[0].qty) {
        showToast('Nothing to clear');
        return;
      }
      if (window.confirm('Clear all power stations, devices, and calculations?')) {
        stations = [];
        devices = [blankDevice()];
        solarFactor = 1.2;
        acFactor = 1.1;
        currency = 'Tk';
        activeStationId = null;
        recomputeAll();
        renderDeviceRows();
        updateDeviceUI();
        setSharedInputs();
        save();
        render();
        showToast('All data cleared');
      }
    });

    addForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (nameInput.value || '').trim();
      var brand = (brandInput.value || '').trim();
      var capacityWh = parseNum(capacityInput.value);
      var continuousOutputW = parseNum(outputInput.value);
      var acChargeW = parseNum(acChargeInput.value);
      var solarChargeW = parseNum(solarChargeInput.value);
      var priceRaw = (priceInput.value || '').trim();
      var price = priceRaw === '' ? null : parseNum(priceRaw);

      var valid = true;
      valid = validate(nameInput, !!name, 'Name is required') && valid;
      valid = validate(capacityInput, isFinite(capacityWh) && capacityWh > 0, 'Enter a capacity greater than 0') && valid;
      valid = validate(outputInput, isFinite(continuousOutputW) && continuousOutputW > 0, 'Enter an output greater than 0') && valid;
      valid = validate(acChargeInput, isFinite(acChargeW) && acChargeW > 0, 'Enter an AC input greater than 0') && valid;
      valid = validate(solarChargeInput, isFinite(solarChargeW) && solarChargeW > 0, 'Enter a solar input greater than 0') && valid;
      valid = validate(priceInput, priceRaw === '' || (price != null && isFinite(price) && price >= 0), 'Enter a valid price') && valid;

      if (!valid) return;

      var existing = editingStation();
      var station = existing || createStation({
        name: name,
        brand: brand,
        capacityWh: capacityWh,
        continuousOutputW: continuousOutputW,
        acChargeW: acChargeW,
        solarChargeW: solarChargeW,
        price: price,
        catalogId: formMode === 'catalog' && selectedProduct ? selectedProduct.id : null
      });

      station.name = name;
      station.brand = brand;
      station.capacityWh = capacityWh;
      station.continuousOutputW = continuousOutputW;
      station.acChargeW = acChargeW;
      station.solarChargeW = solarChargeW;
      station.price = price;
      /* Whatever was typed sits under a field labelled in the display currency,
         so that is the currency it is in. Clearing the price clears the stamp. */
      station.priceCurrency = price === null ? null : currency;

      if (existing) {
        /* id, catalogId, included and calcs are left alone; recomputeAll refreshes
           the results from the new specs. */
        activeStationId = existing.id;
      } else {
        stations.push(station);
        activeStationId = station.id;
      }

      recomputeAll();
      save();
      closeStationModal(true);
      render();
      showToast(existing ? 'Power station updated' : 'Power station added');
    });
  }

  function bindFactorInput(input, setter) {
    input.addEventListener('input', function () {
      var raw = (input.value || '').trim();
      var v = parseNum(raw);
      var ok = isFinite(v) && v > 0;
      if (raw !== '' && !ok) {
        setFieldError(input, 'Enter a decimal number greater than 0');
      } else {
        setFieldError(input, '');
        if (ok) setter(v);
      }
      recomputeAll();
      save();
      render();
    });
  }

  function clearAddErrors() {
    [nameInput, capacityInput, outputInput, acChargeInput, solarChargeInput, priceInput].forEach(function (input) {
      setFieldError(input, '');
    });
  }

  /* ---------- Init ---------- */

  function init() {
    load();
    if (stations.length) activeStationId = stations[0].id;
    setSharedInputs();
    renderDeviceRows();
    recomputeAll();
    updateDeviceUI();
    bindGlobalEvents();

    if (catalogBrands().length) {
      resetCatalogSearch();
      renderCatalogBrands();
      renderCatalogList();
      renderCatalogNote();
      setFormMode(formMode);
    } else {
      /* No catalog available — fall back to the custom form on its own. */
      formMode = 'custom';
      catalogPanel.hidden = true;
      modeCatalogBtn.hidden = true;
      modeCustomBtn.hidden = true;
    }

    render();
  }

  init();
})();
