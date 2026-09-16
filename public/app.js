(function () {
  'use strict';

  var STORAGE_KEY = 'psc_data_v3';

  var CALC_IDS = ['runtime', 'solar', 'ac'];

  var stations = [];
  var devices = [{ name: '', watts: '', hours: '' }];
  var solarFactor = 1.2;
  var acFactor = 1.1;
  var dailyTotals = { totalWh: 0, totalWatts: 0, deviceCount: 0 };

  var activeStationId = null;
  var toastTimer;

  var addForm = document.getElementById('add-station-form');
  var nameInput = document.getElementById('station-name');
  var brandInput = document.getElementById('station-brand');
  var capacityInput = document.getElementById('station-capacity');
  var outputInput = document.getElementById('station-output');
  var acChargeInput = document.getElementById('station-accharge');
  var solarChargeInput = document.getElementById('station-solarcharge');
  var priceInput = document.getElementById('station-price');

  var deviceRows = document.getElementById('device-rows');
  var addDeviceBtn = document.getElementById('add-device');
  var dailyWattsEl = document.getElementById('daily-watts');
  var dailyWhEl = document.getElementById('daily-wh');

  var solarFactorInput = document.getElementById('solar-factor');
  var acFactorInput = document.getElementById('ac-factor');

  var emptyState = document.getElementById('empty-state');
  var emptyAddBtn = document.getElementById('empty-add-btn');
  var stationsArea = document.getElementById('stations-area');
  var stationTabs = document.getElementById('station-tabs');
  var stationContent = document.getElementById('station-content');
  var compareHint = document.getElementById('compare-hint');
  var compareArea = document.getElementById('compare-area');
  var toast = document.getElementById('toast');
  var clearAllBtn = document.getElementById('clear-all');
  var generateCompareBtn = document.getElementById('generate-compare');

  /* ---------- Persistence ---------- */

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : null;
      if (data && typeof data === 'object') {
        stations = Array.isArray(data.stations) ? data.stations : [];
        devices = Array.isArray(data.devices) && data.devices.length ? data.devices : [{ name: '', watts: '', hours: '' }];
        solarFactor = typeof data.solarFactor === 'number' && isFinite(data.solarFactor) ? data.solarFactor : 1.2;
        acFactor = typeof data.acFactor === 'number' && isFinite(data.acFactor) ? data.acFactor : 1.1;
        return;
      }
    } catch (e) { /* ignore */ }

    stations = [];
    devices = [{ name: '', watts: '', hours: '' }];
    solarFactor = 1.2;
    acFactor = 1.1;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stations: stations,
        devices: devices,
        solarFactor: solarFactor,
        acFactor: acFactor
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

  function priceLabel(price) {
    if (typeof price !== 'number' || !isFinite(price)) return '—';
    return '$' + fmt(price);
  }

  function getActiveStation() {
    return stations.find(function (s) { return s.id === activeStationId; }) || null;
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

  function iconTrash() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>';
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
      var w = parseFloat(d.watts);
      var h = parseFloat(d.hours);
      if (isFinite(w) && w > 0 && isFinite(h) && h > 0) {
        totalWatts += w;
        totalWh += w * h;
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
      calcs: {
        runtime: { done: false, loadWatts: null, hours: 0 },
        solar: { done: false, hours: 0 },
        ac: { done: false, hours: 0 }
      }
    };
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

    renderComparison();
  }

  function renderStationTabs() {
    var html = stations.map(function (s) {
      var done = countDone(s);
      var active = s.id === activeStationId ? 'is-active' : '';
      return '<button type="button" class="tab ' + active + '" data-station="' + esc(s.id) + '" role="tab" aria-selected="' + (s.id === activeStationId) + '">' +
        '<span>' + esc(s.name) + '</span>' +
        '<span class="tab__count">' + done + '/' + CALC_IDS.length + '</span>' +
        '<span class="tab__remove" data-remove-station="' + esc(s.id) + '" aria-label="Delete ' + esc(s.name) + '">' + iconX() + '</span>' +
        '</button>';
    }).join('');

    stationTabs.innerHTML = html;

    stationTabs.querySelectorAll('.tab[data-station]').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        if (e.target.closest('[data-remove-station]')) return;
        activeStationId = tab.dataset.station;
        render();
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
    var metrics = [
      ['Brand', station.brand || '—'],
      ['Capacity', fmt(station.capacityWh) + ' Wh'],
      ['Output', fmt(station.continuousOutputW) + ' W'],
      ['AC input', fmt(station.acChargeW) + ' W'],
      ['Solar input', fmt(station.solarChargeW) + ' W'],
      ['Price', priceLabel(station.price)]
    ];
    var tiles = metrics.map(function (m) {
      return '<div class="metric">' +
        '<span class="metric__label">' + esc(m[0]) + '</span>' +
        '<span class="metric__value">' + esc(m[1]) + '</span>' +
        '</div>';
    }).join('');
    return '<div class="station-summary">' +
      '<div class="station-summary__grid">' + tiles + '</div>' +
      '<div class="progress" aria-hidden="true"><div class="progress__bar" style="width:' + pct + '%"></div></div>' +
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
      return tileHTML('solar', 'Solar recharge', '—', '', 'Add solar input', '');
    }
    return tileHTML('solar', 'Solar recharge', fmt(c.hours), 'hours', fmt(station.solarChargeW) + ' W solar × ' + fmt(solarFactor), '');
  }

  function acTileHTML(station) {
    var c = station.calcs.ac;
    if (!c.done) {
      return tileHTML('ac', 'AC recharge', '—', '', 'Add AC input', '');
    }
    return tileHTML('ac', 'AC recharge', fmt(c.hours), 'hours', fmt(station.acChargeW) + ' W AC × ' + fmt(acFactor), '');
  }

  /* ---------- Comparison ---------- */

  function renderComparison() {
    var total = stations.length * CALC_IDS.length;
    var doneCount = 0;
    stations.forEach(function (s) { doneCount += countDone(s); });

    if (stations.length === 0) {
      compareHint.textContent = 'Add a power station and complete the shared inputs to generate the comparison.';
      compareArea.innerHTML = '<div class="compare-locked">Your comparison table will appear here.</div>';
      return;
    }

    if (doneCount === total) {
      compareHint.textContent = 'All inputs complete — here is the side-by-side summary.';
      compareArea.innerHTML = comparisonTableHTML();
      document.getElementById('download-pdf').addEventListener('click', function () {
        window.print();
      });
    } else {
      compareHint.textContent = 'Complete every station\'s calculations to generate the table (' + doneCount + '/' + total + ' complete).';
      compareArea.innerHTML = '<div class="compare-locked">Add devices, plus AC and solar inputs for each station to generate the table.</div>';
    }
  }

  function comparisonTableHTML() {
    var head = '<thead><tr>' +
      '<th>Power Station</th><th>Brand</th><th>Price</th><th>Capacity (Wh)</th><th>Daily Need (Wh)</th><th>Runtime (h)</th><th>Solar (h)</th><th>AC (h)</th>' +
      '</tr></thead>';

    var rows = stations.map(function (s) {
      return '<tr>' +
        '<td>' + esc(s.name) + '</td>' +
        '<td>' + esc(s.brand || '—') + '</td>' +
        '<td>' + priceLabel(s.price) + '</td>' +
        '<td>' + fmt(s.capacityWh) + '</td>' +
        '<td>' + fmt(dailyTotals.totalWh) + '</td>' +
        '<td>' + fmt(s.calcs.runtime.hours) + '</td>' +
        '<td>' + fmt(s.calcs.solar.hours) + '</td>' +
        '<td>' + fmt(s.calcs.ac.hours) + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="compare-card">' +
      '<div class="compare-card__head">' +
      '<div><h3>Comparison Table</h3><p class="compare-note">Choose "Save as PDF" in the print dialog to download.</p></div>' +
      '<button type="button" class="btn btn--primary" id="download-pdf">Download PDF</button>' +
      '</div>' +
      '<div class="compare-table-wrap"><table class="compare-table">' + head + '<tbody>' + rows + '</tbody></table></div>' +
      '</div>';
  }

  /* ---------- Shared input rendering ---------- */

  function renderDeviceRows() {
    deviceRows.innerHTML = devices.map(function (d, i) {
      return '<tr data-device="' + i + '">' +
        '<td><input type="text" data-field="name" value="' + esc(d.name) + '" placeholder="Laptop" autocomplete="off"></td>' +
        '<td><input type="number" data-field="watts" value="' + esc(d.watts) + '" min="0" step="any" placeholder="100" inputmode="decimal"></td>' +
        '<td><input type="number" data-field="hours" value="' + esc(d.hours) + '" min="0" step="any" placeholder="5" inputmode="decimal"></td>' +
        '<td data-wh>—</td>' +
        '<td><button type="button" class="device-remove" data-remove="' + i + '" aria-label="Remove device">' + iconTrash() + '</button></td>' +
        '</tr>';
    }).join('');
  }

  function updateDeviceUI() {
    deviceRows.querySelectorAll('tr[data-device]').forEach(function (row) {
      var idx = Number(row.dataset.device);
      var d = devices[idx];
      if (!d) return;
      var w = parseFloat(d.watts);
      var h = parseFloat(d.hours);
      var wh = isFinite(w) && isFinite(h) && w > 0 && h > 0 ? w * h : 0;
      row.querySelector('[data-wh]').textContent = wh > 0 ? fmt(wh) : '—';
    });
    dailyWattsEl.textContent = fmt(dailyTotals.totalWatts) + ' W';
    dailyWhEl.textContent = fmt(dailyTotals.totalWh) + ' Wh';
  }

  function setSharedInputs() {
    solarFactorInput.value = num(solarFactor);
    acFactorInput.value = num(acFactor);
  }

  /* ---------- Events ---------- */

  function bindGlobalEvents() {
    emptyAddBtn.addEventListener('click', function () {
      document.getElementById('station-name').focus();
      document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    });

    addDeviceBtn.addEventListener('click', function () {
      devices.push({ name: '', watts: '', hours: '' });
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
      if (devices.length === 0) devices.push({ name: '', watts: '', hours: '' });
      recomputeAll();
      renderDeviceRows();
      updateDeviceUI();
      save();
      render();
    });

    solarFactorInput.addEventListener('input', function () {
      var v = parseFloat(solarFactorInput.value);
      if (isFinite(v) && v > 0) solarFactor = v;
      recomputeAll();
      save();
      render();
    });

    acFactorInput.addEventListener('input', function () {
      var v = parseFloat(acFactorInput.value);
      if (isFinite(v) && v > 0) acFactor = v;
      recomputeAll();
      save();
      render();
    });

    generateCompareBtn.addEventListener('click', function () {
      if (stations.length === 0) {
        showToast('Add a power station first');
        document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      var total = stations.length * CALC_IDS.length;
      var done = stations.reduce(function (n, s) { return n + countDone(s); }, 0);
      if (done === total) {
        document.getElementById('compare').scrollIntoView({ behavior: 'smooth' });
      } else {
        showToast('Complete all inputs to generate the comparison');
        document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
      }
    });

    clearAllBtn.addEventListener('click', function () {
      if (stations.length === 0 && devices.length === 1 && !devices[0].name && !devices[0].watts && !devices[0].hours) {
        showToast('Nothing to clear');
        return;
      }
      if (window.confirm('Clear all power stations, devices, and calculations?')) {
        stations = [];
        devices = [{ name: '', watts: '', hours: '' }];
        solarFactor = 1.2;
        acFactor = 1.1;
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
      var capacityWh = parseFloat(capacityInput.value);
      var continuousOutputW = parseFloat(outputInput.value);
      var acChargeW = parseFloat(acChargeInput.value);
      var solarChargeW = parseFloat(solarChargeInput.value);
      var priceRaw = (priceInput.value || '').trim();
      var price = priceRaw === '' ? null : parseFloat(priceRaw);

      var valid = true;
      valid = validate(nameInput, !!name, 'Name is required') && valid;
      valid = validate(capacityInput, isFinite(capacityWh) && capacityWh > 0, 'Enter a capacity greater than 0') && valid;
      valid = validate(outputInput, isFinite(continuousOutputW) && continuousOutputW > 0, 'Enter an output greater than 0') && valid;
      valid = validate(acChargeInput, isFinite(acChargeW) && acChargeW > 0, 'Enter an AC input greater than 0') && valid;
      valid = validate(solarChargeInput, isFinite(solarChargeW) && solarChargeW > 0, 'Enter a solar input greater than 0') && valid;
      valid = validate(priceInput, priceRaw === '' || (price != null && isFinite(price) && price >= 0), 'Enter a valid price') && valid;

      if (!valid) return;

      var station = createStation({
        name: name,
        brand: brand,
        capacityWh: capacityWh,
        continuousOutputW: continuousOutputW,
        acChargeW: acChargeW,
        solarChargeW: solarChargeW,
        price: price
      });

      stations.push(station);
      activeStationId = station.id;
      recomputeAll();
      save();
      addForm.reset();
      clearAddErrors();
      render();
      showToast('Power station added');
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
    render();
  }

  init();
})();
