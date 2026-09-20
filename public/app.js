(function () {
  'use strict';

  var STORAGE_KEY = 'psc_data_v3';

  var CALC_IDS = ['runtime', 'solar', 'ac'];

  var CURRENCY_SYMBOLS = { Tk: '৳', USD: '$', GBP: '£', EUR: '€' };

  var stations = [];
  var devices = [blankDevice()];
  /* When set, one backup time applies to every device row. */
  var sameHours = false;
  var outageHours = '';
  var solarFactor = 1.2;
  var acFactor = 1.1;
  var currency = 'Tk';
  var dailyTotals = { totalWh: 0, totalWatts: 0, deviceCount: 0, missingHours: 0 };

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

  /* Typical wattages for common appliances (public/appliances.js), used to fill the
     Watts cell for people who know their devices but not what they draw. */
  var APPLIANCES = Array.isArray(window.PSC_APPLIANCES) ? window.PSC_APPLIANCES : [];

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

  var settingsModal = document.getElementById('settings-modal');
  var openSettingsBtn = document.getElementById('open-settings');
  var settingsMask = settingsModal.querySelector('.modal__mask');
  var settingsCloseBtn = document.getElementById('settings-close');
  var settingsDoneBtn = document.getElementById('settings-done');

  var confirmModal = document.getElementById('confirm-modal');
  var confirmMask = confirmModal.querySelector('.modal__mask');
  var confirmTitleEl = document.getElementById('confirm-title');
  var confirmMessageEl = document.getElementById('confirm-message');
  var confirmAcceptBtn = document.getElementById('confirm-accept');
  var confirmCancelBtn = document.getElementById('confirm-cancel');

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
  var sameHoursInput = document.getElementById('same-hours');
  var outageHoursInput = document.getElementById('outage-hours');
  var deviceLegend = document.getElementById('device-legend');
  var applianceMenu = document.getElementById('appliance-menu');
  var deviceHoursHint = document.getElementById('device-hours-hint');

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
  var tooltipEl = document.getElementById('tooltip');
  var clearAllBtn = document.getElementById('clear-all');
  var generateCompareBtn = document.getElementById('generate-compare');

  /* ---------- Persistence ---------- */

  function blankDevice() {
    /* est marks a wattage suggested from the appliance list rather than typed. */
    return { name: '', watts: '', hours: '', qty: '', est: false };
  }

  function normalizeDevice(d) {
    d = d && typeof d === 'object' ? d : {};
    return {
      name: d.name == null ? '' : d.name,
      watts: d.watts == null ? '' : d.watts,
      hours: d.hours == null ? '' : d.hours,
      qty: d.qty == null ? '' : d.qty,
      est: d.est === true
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
        sameHours = data.sameHours === true;
        outageHours = typeof data.outageHours === 'string' ? data.outageHours : '';
        return;
      }
    } catch (e) { /* ignore */ }

    stations = [];
    devices = [blankDevice()];
    solarFactor = 1.2;
    acFactor = 1.1;
    currency = 'Tk';
    sameHours = false;
    outageHours = '';
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stations: stations,
        devices: devices,
        solarFactor: solarFactor,
        acFactor: acFactor,
        currency: currency,
        sameHours: sameHours,
        outageHours: outageHours
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

  /* ---------- Metric tooltips ---------- */

  var tooltipTarget = null;

  /* Positioned below the icon, flipped above when there is no room, and clamped
     to the viewport so it can never be cut off. */
  function showTooltip(target) {
    var text = target.getAttribute('data-tip');
    if (!text) return;
    tooltipEl.textContent = text;
    tooltipEl.hidden = false;

    /* A tip that names an anchor points at that anchor, so the bubble sits under the
       ⓘ the reader is on rather than under the whole control around it. */
    var anchorEl = target.querySelector('[data-tip-anchor]') || target;
    var anchor = anchorEl.getBoundingClientRect();
    var box = tooltipEl.getBoundingClientRect();
    var left = anchor.left + anchor.width / 2 - box.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - box.width - 12));
    var top = anchor.bottom + 8;
    if (top + box.height > window.innerHeight - 12) top = Math.max(12, anchor.top - box.height - 8);
    tooltipEl.style.left = Math.round(left) + 'px';
    tooltipEl.style.top = Math.round(top) + 'px';
  }

  function hideTooltip() {
    tooltipTarget = null;
    tooltipEl.hidden = true;
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

  function iconInfo(size) {
    size = size || 12;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>';
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
    var missingHours = 0;
    devices.forEach(function (d) {
      var w = parseNum(d.watts);
      if (!isFinite(w) || w <= 0) return;
      var q = deviceQty(d);
      var h = parseNum(d.hours);
      /* Load and energy are counted separately on purpose. Runtime is derived from
         the load alone, so a device with a known wattage counts immediately —
         someone who knows they want two fans backed up but has not worked out for
         how long still gets a runtime. Hours only turn the load into energy. */
      totalWatts += w * q;
      deviceCount++;
      if (isFinite(h) && h > 0) {
        totalWh += w * h * q;
      } else {
        missingHours++;
      }
    });
    return { totalWh: totalWh, totalWatts: totalWatts, deviceCount: deviceCount, missingHours: missingHours };
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

  /* ---------- Confirmation ---------- */

  /* One dialog answers every yes/no in the app. window.confirm cannot be styled and
     arrives wearing the browser's clothes rather than this product's, and the two
     places that ask a destructive question should look like each other. */
  var confirmResolve = null;
  var confirmReturnFocus = null;

  function askConfirm(title, message, confirmLabel) {
    /* A second question can only arrive if the first was left hanging; settle it as
       a no rather than dropping the promise on the floor. */
    if (confirmResolve) settleConfirm(false);
    confirmTitleEl.textContent = title;
    confirmMessageEl.textContent = message;
    confirmAcceptBtn.textContent = confirmLabel;
    confirmReturnFocus = document.activeElement;
    confirmModal.hidden = false;
    document.body.classList.add('is-modal-open');
    /* Focus lands on Cancel: Enter on a dialog nobody has read yet must not delete
       anything. */
    confirmCancelBtn.focus();
    return new Promise(function (resolve) { confirmResolve = resolve; });
  }

  function settleConfirm(answer) {
    if (confirmModal.hidden) return;
    confirmModal.hidden = true;
    document.body.classList.remove('is-modal-open');
    var resolve = confirmResolve;
    var back = confirmReturnFocus;
    confirmResolve = null;
    confirmReturnFocus = null;
    /* The trigger may have been re-rendered away while the question was open. */
    if (back && back.isConnected) back.focus();
    if (resolve) resolve(answer);
  }

  function confirmIsOpen() {
    return !confirmModal.hidden;
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
    var long = generateCompareBtn.querySelector('.btn__label--long');
    var short = generateCompareBtn.querySelector('.btn__label--short');
    /* The count rides the long label only: four buttons now share the phone's width,
       and "Compare (3)" is what an ellipsis would eat. */
    if (long) long.textContent = n ? 'Compare (' + n + ')' : 'Generate Comparison';
    if (short) short.textContent = 'Compare';
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
        askConfirm(
          'Delete This Station?',
          '“' + (station ? station.name : 'This station') + '” and its results will be removed from the page and from the comparison.',
          'Delete Station'
        ).then(function (confirmed) {
          if (!confirmed) return;
          stations = stations.filter(function (s) { return s.id !== id; });
          save();
          if (activeStationId === id) activeStationId = stations.length ? stations[0].id : null;
          render();
          showToast('Power station deleted');
        });
      });
    });
  }

  function renderStationContent() {
    var station = getActiveStation();
    if (!station) {
      stationContent.innerHTML = '';
      renderedStationId = undefined;
      return;
    }
    stationContent.innerHTML = stationSummaryHTML(station) + stationResultsHTML(station);
    /* Switching station is the only navigation on this page, so it is the one place a
       group entrance carries meaning. The content is rebuilt on every keystroke, so
       the class is tied to the tab actually changing — and stays silent on the first
       render, which is page load, not navigation. */
    if (renderedStationId !== undefined && station.id !== renderedStationId && !motionOff()) {
      stationContent.classList.remove('is-entering');
      void stationContent.offsetWidth;
      stationContent.classList.add('is-entering');
    }
    renderedStationId = station.id;
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
      '<div class="progress" aria-hidden="true"><div class="progress__bar" style="--fill:' + (pct / 100) + '"></div></div>' +
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

  /* ---------- Motion ---------- */

  /* This is a tool, so its motion is feedback: it says that an answer moved, that a
     list reordered, that something arrived. Everything below is driven by a diff
     against what was on screen a moment ago, because the page rebuilds its HTML on
     every keystroke — an entrance animation baked into the markup would replay
     continuously and read as a flicker, which is exactly what the result tiles used
     to do. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function motionOff() {
    return reduceMotion.matches;
  }

  /* The last figure drawn for each live number, so a render can tell a real change
     from a repaint of the same value. */
  var lastValues = {};

  function changedClass(key, value) {
    var previous = lastValues[key];
    lastValues[key] = value;
    if (motionOff()) return '';
    return previous !== undefined && previous !== value ? ' is-updated' : '';
  }

  function tileHTML(modifier, stationId, label, value, unit, meta, statusHTML) {
    var changed = changedClass(stationId + ':' + modifier, value);
    return '<div class="result-tile result-tile--' + modifier + '">' +
      '<div class="result-tile__label">' + label + '</div>' +
      '<div class="result-tile__value' + changed + '">' + value + (unit ? ' <span class="result-tile__unit">' + unit + '</span>' : '') + '</div>' +
      (meta ? '<div class="result-tile__meta">' + meta + '</div>' : '') +
      (statusHTML || '') +
      '</div>';
  }

  function runtimeTileHTML(station) {
    var r = station.calcs.runtime;
    if (!r.done) {
      return tileHTML('runtime', station.id, 'Runtime', '—', '', 'Add devices to estimate', '');
    }
    var over = r.loadWatts > station.continuousOutputW;
    var status = over
      ? '<div class="result-tile__status result-tile__status--warn">' + iconWarn() + ' Load exceeds output (' + fmt(station.continuousOutputW) + ' W)</div>'
      : '<div class="result-tile__status result-tile__status--ok">' + iconCheck(14) + ' Within continuous output (' + fmt(station.continuousOutputW) + ' W)</div>';
    return tileHTML('runtime', station.id, 'Runtime', fmt(r.hours), 'hours', 'At ' + fmt(r.loadWatts) + ' W load', status);
  }

  function solarTileHTML(station) {
    var c = station.calcs.solar;
    if (!c.done) {
      return tileHTML('solar', station.id, 'Solar Recharge', '—', '', 'Add solar input', '');
    }
    return tileHTML('solar', station.id, 'Solar Recharge', fmt(c.hours), 'hours', fmt(station.solarChargeW) + ' W solar × ' + fmt(solarFactor), '');
  }

  function acTileHTML(station) {
    var c = station.calcs.ac;
    if (!c.done) {
      return tileHTML('ac', station.id, 'AC Recharge', '—', '', 'Add AC input', '');
    }
    return tileHTML('ac', station.id, 'AC Recharge', fmt(c.hours), 'hours', fmt(station.acChargeW) + ' W AC × ' + fmt(acFactor), '');
  }

  /* ---------- Comparison ---------- */

  /* One definition per column drives both the header buttons and the body cells,
     so a column's label, its sort key and its bar can never drift apart.
     `bar` is only set on metrics where a longer bar means better — barring the
     recharge times would draw "best" as the shortest bar and misread badly. */
  /* `hint` is the single source for the ⓘ tooltip on the column heading, the ⓘ on
     the matching Rank by button and the wording in the Guideline glossary. */
  var COMPARE_COLUMNS = [
    { key: 'name', label: 'Power Station', sortable: false,
      hint: 'The stations taking part in the comparison. Change any spec from its own tab.' },
    { key: 'price', label: 'Price', sortable: true, better: 'low',
      hint: 'What the station costs, in the currency set under Shared Settings.' },
    { key: 'perWh', label: 'Price / Wh', sortable: true, better: 'low',
      hint: 'Price ÷ capacity — the value you get per watt-hour. Lower is better.' },
    { key: 'capacity', label: 'Capacity', sortable: true, better: 'high', bar: true,
      hint: 'Energy the battery stores, in watt-hours. About 85% of it reaches your devices.' },
    { key: 'coverage', label: 'Coverage', sortable: true, better: 'high', bar: true,
      hint: 'Usable energy (capacity × 0.85) ÷ your total backup need. 1.0 exactly covers your outage.' },
    { key: 'runtime', label: 'Runtime', sortable: true, better: 'high', bar: true, best: true,
      hint: 'How long one charge runs your total load: (capacity × 0.85) ÷ total watts.' },
    { key: 'solar', label: 'Solar Recharge', sortable: true, better: 'low', best: true,
      hint: 'Time to refill from solar: (capacity ÷ solar input) × the solar derate factor.' },
    { key: 'ac', label: 'AC Recharge', sortable: true, better: 'low', best: true,
      hint: 'Time to refill from the wall: (capacity ÷ AC input) × the AC derate factor.' }
  ];

  var RANK_METRICS = [
    { key: 'runtime', label: 'Runtime', better: 'high' },
    { key: 'coverage', label: 'Coverage', better: 'high' },
    { key: 'capacity', label: 'Capacity', better: 'high' },
    /* Spelled out rather than abbreviated: these are the two labels users read
       side by side when choosing what to rank by. */
    { key: 'solar', label: 'Solar Recharge Time', better: 'low' },
    { key: 'ac', label: 'AC Recharge Time', better: 'low' },
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

  /* One piece of markup draws every magnitude bar, in the table and in the ranked
     list alike — they are the same object and must never disagree about how a bar is
     painted. The ratio is a custom property rather than a width, so the fill scales
     on the compositor instead of driving layout. `from` is the ratio this bar had
     last time it was drawn: the element is seeded with it and then released, which is
     what makes a changed input read as a bar that moved. */
  function barMarkup(pct, from) {
    return '<span class="compare-bar" aria-hidden="true">' +
      '<span class="compare-bar__fill" style="--fill:' + (pct / 100) + '"' +
      (from === undefined ? '' : ' data-from="' + from + '"') +
      '></span></span>';
  }

  var barRatios = {};

  function barHTML(station, key, max) {
    var value = compareValue(station, key);
    if (!(max > 0) || !(value > 0)) return '';
    var pct = Math.max(3, Math.round(value / max * 100));
    var id = station.id + '|' + key;
    var from = barRatios[id];
    barRatios[id] = pct;
    return barMarkup(pct, from === undefined ? 0 : from);
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

  function columnHint(key) {
    var col = COMPARE_COLUMNS.filter(function (c) { return c.key === key; })[0];
    return col ? col.hint : '';
  }

  /* The ⓘ is a focusable span rather than a button: it sits beside the sort
     button, not inside it (interactive content cannot nest), and it is reachable
     by keyboard and by tap as well as hover. Its aria-label carries the whole
     explanation, so the bubble is decorative to assistive tech. */
  function hintHTML(label, hint) {
    if (!hint) return '';
    var text = label + ' — ' + hint;
    return '<span class="info-tip" tabindex="0" data-tip="' + esc(text) + '" aria-label="' + esc(text) + '">' +
      iconInfo(12) + '</span>';
  }

  function compareHeadHTML() {
    var cells = COMPARE_COLUMNS.map(function (col) {
      if (!col.sortable) {
        return '<th scope="col"><span class="th-inner">' + esc(col.label) + hintHTML(col.label, col.hint) + '</span></th>';
      }
      var active = comparisonSort.key === col.key;
      var state = active ? (comparisonSort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" aria-sort="' + state + '"><span class="th-inner">' +
        '<button type="button" class="compare-sort' + (active ? ' is-active' : '') + '" data-sort="' + col.key + '">' +
        esc(col.label) +
        '<span class="compare-sort__arrow" aria-hidden="true">' + (active ? (comparisonSort.dir === 'asc' ? '↑' : '↓') : '↕') + '</span>' +
        '</button>' + hintHTML(col.label, col.hint) +
        '</span></th>';
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
      var hint = columnHint(m.key);
      var text = m.label + ' — ' + hint;
      /* The explanation belongs to the ⓘ, not to the pill. The pill is a button that
         already says what it does, and raising a bubble every time the pointer crosses
         it turns a row of controls into a row of pop-ups — so the icon is marked as
         the pointer's target with data-tip-anchor. The text stays on the button as
         well, because a button cannot hold a second focusable element and keyboard
         focus and assistive tech still need to reach it. */
      return '<button type="button" class="rank-pick' + (m.key === rankedMetric ? ' is-active' : '') +
        '" data-metric="' + m.key + '"' +
        (hint ? ' data-tip="' + esc(text) + '" aria-label="' + esc(text) + '"' : '') +
        '>' + esc(m.label) +
        (hint ? '<span class="rank-pick__icon" data-tip-anchor aria-hidden="true">' + iconInfo(12) + '</span>' : '') +
        '</button>';
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
    /* Every included station is listed, including one with nothing to show for this
       metric — a station with no price, most often. Filtering those out made the
       ranked list disagree with the table about which stations exist, and on a phone
       the ranked list *is* the comparison. Such a row states a dash and sorts to the
       bottom without taking a placing, exactly as a blank cell does in the table. */
    var list = includedStations().slice();
    var valued = list.filter(function (s) { return compareValue(s, metric.key) !== null; });

    if (!valued.length) {
      return '<div class="compare-rank"><p class="compare-check__lead">Nothing to rank yet — ' +
        esc(metric.label.toLowerCase()) + ' is unavailable for the included stations.</p></div>';
    }

    list.sort(function (a, b) {
      var av = compareValue(a, metric.key);
      var bv = compareValue(b, metric.key);
      /* Blanks sink whichever way the metric points. */
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return metric.better === 'high' ? bv - av : av - bv;
    });

    var values = valued.map(function (s) { return compareValue(s, metric.key); });
    var max = Math.max.apply(null, values);
    var showBars = max > Math.min.apply(null, values);
    var best = bestValues();
    var place = 0;

    var rows = list.map(function (s) {
      var value = compareValue(s, metric.key);
      if (value !== null) place++;
      var marked = value !== null && BEST_KEYS.some(function (b) { return b.key === metric.key; }) && isBestCell(s, metric.key, best);
      /* No origin here: the ranked list already says what moved by sliding its rows,
         and a bar gliding at the same time would be two answers to one question. */
      var bar = showBars && value !== null ? barMarkup(Math.max(3, Math.round(value / max * 100))) : '';
      return '<li class="rank" data-rank="' + esc(s.id) + '">' +
        '<div class="rank__top">' +
        '<span class="rank__pos">' + (value === null ? '–' : place) + '</span>' +
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

  /* Which of the four things the comparison section can be showing, so a render can
     tell that it has just become available. */
  var compareState = null;
  var renderedStationId;

  function comparisonState() {
    if (stations.length === 0) return 'empty';
    var list = includedStations();
    if (!list.length) return 'excluded';
    return list.every(function (s) { return countDone(s) === CALC_IDS.length; }) ? 'ready' : 'locked';
  }

  /* The ranked rows, keyed by station, measured where they are right now. */
  function rankPositions() {
    var positions = {};
    Array.prototype.forEach.call(compareArea.querySelectorAll('.rank[data-rank]'), function (el) {
      positions[el.dataset.rank] = el.getBoundingClientRect().top;
    });
    return positions;
  }

  /* FLIP: hand each row the distance it has to travel, let it render there for one
     frame, then release it so the transition carries it home. Without this a
     re-rank is a jump cut and the reader has to re-read the whole list to see what
     changed. */
  function playReorder(positions) {
    var moved = [];
    Array.prototype.forEach.call(compareArea.querySelectorAll('.rank[data-rank]'), function (el) {
      var was = positions[el.dataset.rank];
      if (was === undefined) return;
      var delta = was - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 2) return;
      el.style.transition = 'none';
      el.style.transform = 'translateY(' + delta + 'px)';
      el.style.willChange = 'transform';
      moved.push(el);
    });
    if (!moved.length) return;
    void compareArea.offsetWidth;
    requestAnimationFrame(function () {
      moved.forEach(function (el) {
        el.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = '';
      });
      /* A plain timeout rather than transitionend: the whole card is replaced on the
         next keystroke, and the cleanup must not depend on the animation finishing. */
      setTimeout(function () {
        moved.forEach(function (el) { el.style.transition = ''; el.style.willChange = ''; });
      }, 400);
    });
  }

  function settleBars() {
    var fills = Array.prototype.slice.call(compareArea.querySelectorAll('.compare-bar__fill[data-from]'));
    if (!fills.length) return;
    /* A render where no bar changed length is the common case — typing backup hours
       does not touch them — and it must cost nothing: no reflow, no frame. */
    var moving = fills.filter(function (el) {
      return Number(el.dataset.from) !== Math.round(Number(el.style.getPropertyValue('--fill')) * 100);
    });
    if (motionOff() || !moving.length) {
      /* Nothing to play, but the "where this came from" mark must not be left
         standing, or the next render would read a stale origin. */
      fills.forEach(function (el) { delete el.dataset.from; });
      return;
    }
    fills.forEach(function (el) {
      el.style.transition = 'none';
      el.style.transform = 'scaleX(' + (Number(el.dataset.from) / 100) + ')';
    });
    void compareArea.offsetWidth;
    requestAnimationFrame(function () {
      fills.forEach(function (el) {
        el.style.transition = '';
        el.style.transform = '';
        delete el.dataset.from;
      });
    });
  }

  function markComparisonArrival() {
    var card = compareArea.querySelector('.compare-card');
    if (!card) return;
    card.classList.add('is-arriving');
    setTimeout(function () { card.classList.remove('is-arriving'); }, 700);
  }

  /* Wraps the render so motion can be decided by what changed across it. */
  function renderComparison() {
    var positions = motionOff() ? null : rankPositions();
    var was = compareState;
    compareState = comparisonState();
    renderComparisonNow();
    if (positions) playReorder(positions);
    settleBars();
    if (motionOff()) return;
    /* Deliberately silent on the first render: a returning visitor already knows what
       is in the comparison, and page load is not the moment to perform it. */
    if (compareState === 'ready' && was !== null && was !== 'ready') markComparisonArrival();
  }

  function renderComparisonNow() {
    hideTooltip();
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

  /* ---------- Appliance wattage suggestions ---------- */

  function findAppliance(name) {
    var wanted = String(name == null ? '' : name).trim().toLowerCase();
    if (!wanted) return null;
    return APPLIANCES.filter(function (a) { return a.name.toLowerCase() === wanted; })[0] || null;
  }

  /* The tooltip spells out the realistic range, because the suggested figure is an
     expected draw rather than a nameplate rating — for some devices they differ. */
  function applianceTip(device) {
    var match = findAppliance(device.name);
    if (!match) return 'Typical value from the appliance list. Type your own to replace it.';
    return 'Typical value for ' + match.name + ' (' + fmt(match.min) + '–' + fmt(match.max) + ' W). Type your own to replace it.' +
      (match.note ? ' ' + match.note : '');
  }

  /* ---------- Appliance dropdown ---------- */

  /* A native <datalist> cannot be opened by script, so it only ever appeared once
     the user started typing. This is a small listbox instead: it opens when an
     empty Device field takes focus, and filters as the user types. Focus — not
     hover — is the trigger, because hovering fired while the pointer merely
     travelled across a row and the list then had to guess when to close. */
  var menuInput = null;
  var menuIndex = -1;

  function applianceMatches(query) {
    var q = String(query == null ? '' : query).trim().toLowerCase();
    if (!q) return APPLIANCES.slice();
    return APPLIANCES.filter(function (a) { return a.name.toLowerCase().indexOf(q) !== -1; });
  }

  function renderApplianceMenu(query) {
    var matches = applianceMatches(query);
    if (!matches.length) return 0;
    applianceMenu.innerHTML = matches.map(function (a) {
      return '<button type="button" class="appliance-option" role="option" data-appliance="' + esc(a.name) + '">' +
        '<span class="appliance-option__name">' + esc(a.name) + '</span>' +
        '<span class="appliance-option__watts">' + fmt(a.watts) + ' W typical</span>' +
        '</button>';
    }).join('');
    menuIndex = -1;
    return matches.length;
  }

  function positionApplianceMenu(input) {
    var anchor = input.getBoundingClientRect();
    applianceMenu.style.left = Math.round(anchor.left) + 'px';
    applianceMenu.style.width = Math.round(anchor.width) + 'px';
    var below = anchor.bottom + 4;
    var box = applianceMenu.getBoundingClientRect();
    /* Flip above the field when there is no room underneath. */
    applianceMenu.style.top = (below + box.height > window.innerHeight - 8
      ? Math.round(Math.max(8, anchor.top - box.height - 4))
      : Math.round(below)) + 'px';
  }

  function openApplianceMenu(input) {
    if (!APPLIANCES.length) return;
    /* An exact name means the user already landed on an appliance — there is
       nothing left to suggest, and reopening here would fight the selection that
       just filled the field. */
    if (findAppliance(input.value)) { closeApplianceMenu(); return; }
    if (renderApplianceMenu(input.value) === 0) { closeApplianceMenu(); return; }
    menuInput = input;
    applianceMenu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    positionApplianceMenu(input);
  }

  function closeApplianceMenu() {
    /* The field owns the list, so it is also what reports the list as collapsed. */
    if (menuInput) menuInput.setAttribute('aria-expanded', 'false');
    menuInput = null;
    menuIndex = -1;
    applianceMenu.hidden = true;
  }

  function chooseAppliance(name) {
    var input = menuInput;
    if (!input) return;
    input.value = name;
    closeApplianceMenu();
    /* Ride the normal name handler so the wattage suggestion takes the same path
       as a typed name, including the estimate marker and its tooltip. */
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }

  function highlightApplianceOption(delta) {
    var options = Array.prototype.slice.call(applianceMenu.querySelectorAll('.appliance-option'));
    if (!options.length) return;
    menuIndex = (menuIndex + delta + options.length) % options.length;
    options.forEach(function (o, i) { o.classList.toggle('is-active', i === menuIndex); });
    options[menuIndex].scrollIntoView({ block: 'nearest' });
  }

  function menuIsOpenFor(input) {
    return menuInput === input;
  }

  /* The list is fixed, so a scroll leaves it hanging where the field used to be.
     Only a field that has actually left the viewport is worth dismissing — a
     scroll of a pixel or two, which is what focusing a field on a phone causes,
     should just carry the list along with it. */
  function inputIsOffScreen(input) {
    var box = input.getBoundingClientRect();
    return box.bottom <= 0 || box.top >= window.innerHeight;
  }

  function updateDeviceLegend() {
    deviceLegend.hidden = !devices.some(function (d) { return d.est === true; });
    /* Only worth saying once a load exists to compute a runtime from. */
    deviceHoursHint.hidden = !(dailyTotals.totalWatts > 0 && dailyTotals.missingHours > 0);
  }

  /* ---------- Shared backup time ---------- */

  function setSharedTimeInputs() {
    sameHoursInput.checked = sameHours;
    outageHoursInput.value = outageHours;
    outageHoursInput.disabled = !sameHours;
  }

  /* The shared time is written into every device, so unticking the box leaves the
     values in place rather than clearing work the user has done. */
  function applySharedHours() {
    if (!sameHours) return;
    devices.forEach(function (d) { d.hours = outageHours; });
  }

  function renderDeviceRows() {
    closeApplianceMenu();
    deviceRows.innerHTML = devices.map(function (d, i) {
      var wattsClasses = [];
      if (isInvalidNumber('watts', d.watts)) wattsClasses.push('is-invalid');
      if (d.est === true) wattsClasses.push('is-est');
      return '<tr data-device="' + i + '">' +
        '<td class="device-cell device-cell--name"><input type="text" data-field="name" value="' + esc(d.name) + '" placeholder="Type or pick a device" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="appliance-menu" aria-autocomplete="list"></td>' +
        '<td class="device-cell device-table__qty" data-label="Qty *"><input type="number" data-field="qty" value="' + esc(d.qty) + '" min="1" step="1" placeholder="1" inputmode="numeric"' + (isInvalidNumber('qty', d.qty) ? ' class="is-invalid"' : '') + '></td>' +
        '<td class="device-cell" data-label="Watts (W) *"><input type="number" data-field="watts" value="' + esc(d.watts) + '" min="0" step="0.5" placeholder="100" inputmode="decimal"' +
        (wattsClasses.length ? ' class="' + wattsClasses.join(' ') + '"' : '') +
        (d.est === true ? ' data-tip="' + esc(applianceTip(d)) + '"' : '') + '></td>' +
        '<td class="device-cell" data-label="Hours (h, Optional)"><input type="number" data-field="hours" value="' + esc(d.hours) + '" min="0" step="0.5" placeholder="5" inputmode="decimal"' +
        (isInvalidNumber('hours', d.hours) ? ' class="is-invalid"' : '') + (sameHours ? ' readonly' : '') + '></td>' +
        '<td class="device-cell" data-label="Energy (Wh)" data-wh>—</td>' +
        '<td class="device-cell device-cell--remove"><button type="button" class="device-remove" data-remove="' + i + '" aria-label="Remove device">' + iconTrash() + '</button></td>' +
        '</tr>';
    }).join('');
    updateDeviceLegend();
  }

  /* The two figures the device card is built around are updated in place rather than
     re-rendered, so their mark is applied and released here instead of coming free
     with a fresh element. Restarting the animation needs the reflow. */
  function setLiveFigure(el, text) {
    if (el.textContent === text) return;
    el.textContent = text;
    if (motionOff()) return;
    el.classList.remove('is-updated');
    void el.offsetWidth;
    el.classList.add('is-updated');
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
      /* With a shared time the row inputs mirror it in place, so typing stays in
         the one field being edited instead of rebuilding the table. */
      if (sameHours) {
        var hoursInput = row.querySelector('input[data-field="hours"]');
        if (hoursInput && hoursInput.value !== String(d.hours)) hoursInput.value = d.hours;
      }
    });
    setLiveFigure(dailyWattsEl, fmt(dailyTotals.totalWatts) + ' W');
    setLiveFigure(dailyWhEl, fmt(dailyTotals.totalWh) + ' Wh');
    /* Both hints depend on the recomputed totals, and typing hours changes them
       without rebuilding the rows — so refresh them here, not only on a render. */
    updateDeviceLegend();
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
      var added = blankDevice();
      if (sameHours) added.hours = outageHours;
      devices.push(added);
      recomputeAll();
      renderDeviceRows();
      updateDeviceUI();
      save();
      render();
      var inputs = deviceRows.querySelectorAll('input[data-field="name"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
    });

    /* ---------- Appliance dropdown wiring ---------- */

    function nameInputOf(target) {
      return target && target.closest ? target.closest('input[data-field="name"]') : null;
    }

    /* Focusing an empty Device field offers the list; a field that already names
       a device is left alone, so the list never covers a choice already made. The
       else branch settles the state for a field that has text, which is what stops
       a list opened for the previous row from surviving the move. */
    deviceRows.addEventListener('focusin', function (e) {
      var input = nameInputOf(e.target);
      if (!input) return;
      if (input.value.trim() === '') openApplianceMenu(input);
      else closeApplianceMenu();
    });

    /* Clicking back into an empty field offers the list again. Focus alone cannot
       do this: a field that already holds focus fires no focusin, so a list
       dismissed with Escape could not otherwise be brought back without first
       leaving the field. mousedown rather than click, so the list is in place
       before the press finishes. */
    deviceRows.addEventListener('mousedown', function (e) {
      var input = nameInputOf(e.target);
      if (input && input.value.trim() === '') openApplianceMenu(input);
    });

    /* Focus opens the list, so focus has to close it as well — otherwise tabbing
       or clicking out of the field would leave the list floating over the page. */
    deviceRows.addEventListener('focusout', function (e) {
      var input = nameInputOf(e.target);
      if (!input || !menuIsOpenFor(input)) return;
      /* Reading activeElement after the event: a click on an option is a mousedown
         on the list, which is prevented from taking focus, so focus is still here
         and the list stays open for the handler above to use. */
      setTimeout(function () {
        if (menuIsOpenFor(input) && document.activeElement !== input) closeApplianceMenu();
      }, 0);
    });

    deviceRows.addEventListener('keydown', function (e) {
      var input = nameInputOf(e.target);
      if (!input) return;
      if (applianceMenu.hidden) {
        if (e.key === 'Escape') closeApplianceMenu();
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightApplianceOption(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlightApplianceOption(-1); }
      else if (e.key === 'Escape') { closeApplianceMenu(); }
      else if (e.key === 'Enter') {
        var active = applianceMenu.querySelector('.appliance-option.is-active');
        if (active) { e.preventDefault(); chooseAppliance(active.dataset.appliance); }
      }
    });

    /* mousedown, not click: the field's blur would otherwise close the list first. */
    applianceMenu.addEventListener('mousedown', function (e) {
      var option = e.target.closest('[data-appliance]');
      if (!option) return;
      e.preventDefault();
      chooseAppliance(option.dataset.appliance);
    });

    document.addEventListener('mousedown', function (e) {
      if (applianceMenu.hidden) return;
      if (e.target.closest('#appliance-menu') || nameInputOf(e.target)) return;
      closeApplianceMenu();
    });

    /* A scroll moves the field out from under a fixed list, so the list is carried
       along with it and only dismissed once the field has genuinely left the
       viewport. Two things make that the right shape: the list's own scrollbar is
       how the longer appliance list is read, and focusing a field that sits below
       the fold makes the browser scroll to it — so judging the field on the first
       scroll event, before that scroll has finished, closed the list the moment it
       was opened. Hence the settle timer. */
    var scrollSettle;
    window.addEventListener('scroll', function (e) {
      if (e.target === applianceMenu || applianceMenu.contains(e.target)) return;
      if (!menuInput) return;
      positionApplianceMenu(menuInput);
      clearTimeout(scrollSettle);
      scrollSettle = setTimeout(function () {
        if (menuInput && inputIsOffScreen(menuInput)) closeApplianceMenu();
      }, 200);
    }, true);

    deviceRows.addEventListener('input', function (e) {
      var row = e.target.closest('tr[data-device]');
      if (!row) return;
      var idx = Number(row.dataset.device);
      var field = e.target.dataset.field;
      if (!field || !devices[idx]) return;
      var device = devices[idx];
      device[field] = e.target.value;

      if (field === 'watts') {
        /* A typed figure is the user's own, so the suggestion no longer applies. */
        device.est = false;
        e.target.classList.remove('is-est');
        e.target.removeAttribute('data-tip');
        updateDeviceLegend();
      }

      if (field === 'name') {
        openApplianceMenu(e.target);
        var match = findAppliance(device.name);
        var wattsInput = row.querySelector('input[data-field="watts"]');
        var blankOrSuggested = String(device.watts).trim() === '' || device.est === true;

        /* Landing on a known appliance means one of it. A blank quantity is only
           ever a default — the arithmetic already treats it as 1 — so writing it
           in makes the row read correctly and still leaves a typed count alone. */
        if (match && String(device.qty).trim() === '') {
          device.qty = '1';
          var qtyInput = row.querySelector('input[data-field="qty"]');
          if (qtyInput) qtyInput.value = '1';
        }

        if (match && blankOrSuggested) {
          /* Fill a blank or still-suggested wattage — never a figure already typed. */
          device.watts = String(match.watts);
          device.est = true;
          if (wattsInput) {
            wattsInput.value = device.watts;
            wattsInput.classList.add('is-est');
            wattsInput.setAttribute('data-tip', applianceTip(device));
          }
          updateDeviceLegend();
        } else if (!match && device.est === true) {
          /* Renamed to something off the list: keep the number, drop the claim. */
          device.est = false;
          if (wattsInput) {
            wattsInput.classList.remove('is-est');
            wattsInput.removeAttribute('data-tip');
          }
          updateDeviceLegend();
        }
      }

      if (field !== 'name' && e.target.classList) {
        e.target.classList.toggle('is-invalid', isInvalidNumber(field, e.target.value));
      }
      recomputeAll();
      updateDeviceUI();
      save();
      render();
    });

    sameHoursInput.addEventListener('change', function () {
      sameHours = sameHoursInput.checked;
      if (sameHours) {
        /* Seed from a row that already has hours, so ticking the box never blanks
           work the user has already done. */
        if (outageHours === '') {
          var existing = devices.filter(function (d) { return String(d.hours).trim() !== ''; })[0];
          if (existing) outageHours = String(existing.hours);
        }
        outageHoursInput.value = outageHours;
      }
      outageHoursInput.disabled = !sameHours;
      applySharedHours();
      recomputeAll();
      renderDeviceRows();
      updateDeviceUI();
      save();
      render();
    });

    outageHoursInput.addEventListener('input', function () {
      outageHours = outageHoursInput.value;
      var raw = outageHours.trim();
      outageHoursInput.classList.toggle('is-invalid', raw !== '' && isInvalidNumber('hours', raw));
      applySharedHours();
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

    function closeSettings() {
      settingsModal.hidden = true;
      document.body.classList.remove('is-modal-open');
      if (openSettingsBtn.isConnected) openSettingsBtn.focus();
    }

    openSettingsBtn.addEventListener('click', function () {
      settingsModal.hidden = false;
      document.body.classList.add('is-modal-open');
      currencyInput.focus();
    });

    settingsMask.addEventListener('click', closeSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsDoneBtn.addEventListener('click', closeSettings);

    confirmCancelBtn.addEventListener('click', function () { settleConfirm(false); });
    confirmAcceptBtn.addEventListener('click', function () { settleConfirm(true); });
    confirmMask.addEventListener('click', function () { settleConfirm(false); });

    /* Escape closes anything that is only being read or chosen between — never the
       station form, where it would throw away typing with no way back. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (confirmIsOpen()) { settleConfirm(false); return; }
      if (!settingsModal.hidden) { closeSettings(); return; }
      if (!guidelineModal.hidden) closeGuideline();
    });

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
    /* Delegated on document: the comparison is rebuilt on every keystroke, so
       per-element binding would have to be redone constantly. */
    /* A tip that names an anchor answers to the pointer only while the pointer is on
       that anchor; everywhere else on the control is just the control. */
    function tipForPointer(node) {
      var tip = node.closest('[data-tip]');
      if (!tip) return null;
      var anchor = tip.querySelector('[data-tip-anchor]');
      if (anchor && !anchor.contains(node)) return null;
      return tip;
    }

    document.addEventListener('mouseover', function (e) {
      var tip = tipForPointer(e.target);
      if (tip === tooltipTarget) return;
      if (tip) { tooltipTarget = tip; showTooltip(tip); } else { hideTooltip(); }
    });

    document.addEventListener('mouseout', function (e) {
      if (!tooltipTarget) return;
      if (e.relatedTarget && tooltipTarget.contains(e.relatedTarget)) return;
      hideTooltip();
    });

    /* Focus covers keyboard users and taps, which is how the tooltip is reached on a
       touch screen. Where a tip names a pointer anchor, though, a mouse click on the
       control must not leave the explanation pinned open behind it — so on a device
       that can hover, only focus the browser itself considers keyboard-driven counts.
       Touch is deliberately left alone: it has no hover, so focus is the only way in. */
    var canHover = window.matchMedia('(hover: hover)');

    document.addEventListener('focusin', function (e) {
      var tip = e.target.closest('[data-tip]');
      if (!tip) return;
      if (tip.querySelector('[data-tip-anchor]') && canHover.matches && !e.target.matches(':focus-visible')) return;
      tooltipTarget = tip;
      showTooltip(tip);
    });

    document.addEventListener('focusout', hideTooltip);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideTooltip();
    });
    /* A fixed bubble would be left behind by any scrolling, including the
       comparison table's own scroll container. */
    window.addEventListener('scroll', hideTooltip, true);

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
      askConfirm(
        'Clear Everything?',
        'This removes every power station, every device, and all of the calculations built from them. There is no undo.',
        'Clear Everything'
      ).then(function (confirmed) {
        if (!confirmed) return;
        stations = [];
        devices = [blankDevice()];
        solarFactor = 1.2;
        acFactor = 1.1;
        currency = 'Tk';
        sameHours = false;
        outageHours = '';
        activeStationId = null;
        recomputeAll();
        renderDeviceRows();
        updateDeviceUI();
        setSharedInputs();
        setSharedTimeInputs();
        save();
        render();
        showToast('All data cleared');
      });
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

  /* The brand shimmer repaints a background position every frame. It earns that while
     the heading is on screen and earns nothing once it is not — and the comparison,
     which is what the page is actually for, sits well below it. */
  function bindBrandShimmer() {
    var mark = document.querySelector('.grad');
    if (!mark || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        mark.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
    }, { threshold: 0 }).observe(mark);
  }

  /* ---------- Init ---------- */

  function init() {
    load();
    if (stations.length) activeStationId = stations[0].id;
    setSharedInputs();
    setSharedTimeInputs();
    renderDeviceRows();
    recomputeAll();
    updateDeviceUI();
    bindGlobalEvents();
    bindBrandShimmer();

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
