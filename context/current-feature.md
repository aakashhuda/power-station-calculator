# Current Feature — UI Improvements Batch

Source: `context/docs/prompts/improvements.md`
Branch: `feature/ui-improvements-batch`
Status: Implemented — verified with an in-project DOM smoke test (42 checks, all passing). Awaiting user browser review + commit permission.

## Scope

1. **Device quantity column** — daily energy consumption rows get a Qty field so repeated
   devices (3 fans, 2 lights) are entered once. Wh = watts × hours × qty; total load
   (W) = watts × qty. Existing stored devices default to qty 1.
2. **Currency selector** — Tk (default), USD, GBP, EUR. Applies to station price input
   label, station summary, and comparison table price cells. Persisted in localStorage.
3. **Power station form as modal** — the aside form becomes a dialog opened by a
   "+ Add Power Station" button placed beside the station tabs (same size as a tab).
   Only the Cancel button closes it (no mask/esc close); Cancel clears the form.
   "+ Add Station" validates, adds the station, resets the form and closes. The
   stations area takes the full width previously shared with the aside.
4. **PDF content** — the printed report includes Daily Energy Consumption and a Power
   Stations Summary (specs + runtime/solar/AC results per station) above the comparison
   table, styled like the web page (colors preserved in print).
5. **Comparison best-value marks** — the longest runtime and the shortest solar and AC
   charge times are labeled "Best" in the comparison table.
6. **Comparison units** — headers drop "(unit)" suffixes; data cells carry units
   (Wh, h, currency symbol).
7. **Capitalization** — headers, labels and buttons use title case.
8. **Delete icon size** — device row trash icon enlarged.
9. **Number steps** — number inputs step by 0.5 (Qty steps by 1, derate factors keep 0.01).
10. **Required asterisks** — required fields show a `*` beside the label.

## Done when

- All 10 items work in the browser (desktop + mobile width).
- Existing localStorage data loads without breaking (qty/currency defaults applied).
- No console errors; print preview shows the full report.

## Follow-up — Improvements 2 (`context/docs/prompts/improvements-2.md`)

Implemented on the same branch:

1. Modal buttons pinned within the dialog's view height (flex column dialog,
   scrollable form body, actions bar fixed at the bottom with a divider).
2. Daily Energy Consumption and Shared Settings cards now stack vertically
   (`.card-stack` replaces the side-by-side `.grid-2`).
3. Best badge compacted — the badge now holds the value text itself
   (e.g. a green "5.8 h" pill) instead of value + separate badge.
4. Global `max-width: 100%` no longer applies to `svg`, so the device row
   trash icon renders at full 20px.
5. PDF spacing fixed — `body min-height: 0`, eyebrow hidden, page break moved
   from `.compare-card` to the Comparison `.section-head` (removes the empty
   page), tightened report paddings/margins, `break-inside: avoid` on tables
   and station cards.

Verified with `node --check` and the in-project DOM smoke test (42/42 passing).

## Follow-up — Improvements 3 (inline request)

Implemented on the same branch:

1. Number input spinners removed (webkit + firefox); strict decimal validation
   added — device qty/watts/hours, derate factors, and station modal fields now
   reject malformed decimals (`parseNum` pattern check); invalid device cells
   get an `is-invalid` outline and are excluded from totals; factors show an
   inline field error.
2. Add Device button moved onto the Total Load / Total Energy row
   (`.device-total` is now a space-between flex row; `.card__actions` removed).
3. Guideline button in the navbar opens a usage/how-it's-calculated modal.
   It closes only by clicking the mask (scrolls internally, wider dialog).
4. Comparison table Runtime / Solar Recharge / AC Recharge columns
   (nth-child ≥ 6) are center-aligned, headers and cells.

Verified with `node --check` and the extended DOM smoke test (55/55 passing).

## Follow-up — Improvements 4 (mobile layout fixes, inline request)

Source: inline request. Branch: `ui/redesign` (unchanged, as requested).
Scope: mobile-only layout issues, plus one change applied at every width.

1. **Horizontal overflow fixed** — the Daily Energy Consumption and Shared
   Settings cards were 396px wide on a 390px screen (27px of page overflow).
   Root cause: `.card-stack` used `grid-template-columns: 1fr`, so each grid
   item's automatic minimum size equalled the device table's min-content width
   and the column could not shrink. Fixed with `minmax(0, 1fr)` (and the same
   for the mobile `.results-grid`). Both cards now sit inside the gutter.
2. **Navbar action buttons** — `Generate Comparison` → `Comparison` and
   `Clear All` → `Clear` below 640px (long labels kept on wider screens via
   `.btn__label--long` / `--short`). Buttons use `flex: 1 1 0` and their icons
   are hidden on mobile, so all three are exactly equal width (111px each at
   390px) with no text truncation.
3. **Daily consumption form** — below 640px the 6-column table becomes one card
   per device: device name full width with the delete button pinned top-right,
   then a 2×2 grid of Qty / Watts / Hours / Energy. Every field carries a
   visible label from `data-label` (`::before`), and inputs are 127px wide
   instead of 26–45px.
4. **Comparison mobile layout** — below 768px the table becomes one card per
   station (name as the card heading, then label/value rows). No horizontal
   scrolling anywhere; "Best" badges are preserved.
5. **Daily Need moved out of the table** — the column is gone at every width;
   it is stated once above the table as `.compare-daily`
   ("Daily Energy Need — shared by every station · 2480 Wh per day · 360 W
   total load") on screen and in the PDF. This also fixes the PDF clipping:
   the comparison table was 745px wide inside a 672px A4 content area (73px
   cut off); it is now 626px and fits.
6. Mobile-layout rules are inside `@media screen and (...)`, so the print
   report always keeps real tables. `node --check` passes.

Verified against a headless-Chromium run (Node built-ins only — no packages
installed): 42/42 layout + behaviour checks and 16/16 edge-case checks
(320/360/390/480/640px, desktop, print emulation at A4 content width, fresh
and legacy localStorage, locked comparison state, station modal).

## Follow-up — Improvements 5 (inline request)

Source: inline request. Branch: `fix/appliance-list-focus-guideline-info`.
Status: Implemented — verified with a headless-Chromium smoke test (48 desktop +
15 mobile checks, all passing, no console errors). Awaiting user browser review +
commit permission.

### 1. Appliance list opens on focus, not hover

The Device cell's appliance list was driven by `mouseover`/`mouseout` with a
180 ms grace timer, so it opened whenever the pointer merely crossed a row and
then had to guess when to close. It is now driven by focus:

- `focusin` on an empty Device field opens the list; a field that already names
  a device closes it, so a list opened for the previous row cannot survive a move.
- `mousedown` on an empty field re-offers a list dismissed with Escape — a field
  that already holds focus fires no `focusin`, so focus alone would dead-end.
- `focusout` closes the list, with the option `mousedown` (which is prevented
  from taking focus) left alone.
- The `mouseover`/`mouseout` handlers are gone. CSS `:hover` on the options is
  kept, so the pointer still highlights a row of the list.

Two further defects in the same code path, both found by the mobile pass:

- **Scroll closed the list it had just opened.** A fixed list has to be
  repositioned when the page scrolls, not dismissed — and focusing a Device field
  below the fold makes the browser scroll to it, so the list vanished the instant
  it appeared. The list now follows its field on scroll and is dismissed only once
  the field has left the viewport, checked after the scroll settles (200 ms). A
  scroll of the list's own scrollbar was also closing it, which made the lower
  appliances unreachable.
- **`aria-expanded` was hard-coded to `false`.** It now tracks the list, and the
  combobox points at the listbox with `aria-controls="appliance-menu"`.

### 2. Guideline modal — missing information added

The modal already documented the appliance list and the shared backup time, so
the audit added what was genuinely absent:

- **Qty column** — new "Running More Than One of the Same Device" section:
  Watts × Qty for load, Watts × Qty × Hours for energy, blank counts as one,
  whole numbers only.
- **Appliance list** — now says the list appears when the cursor lands in an empty
  Device field, filters as you type, is driven by arrow keys + Enter, is dismissed
  with Escape or by leaving the field, and sets Qty to 1 when it fills the Watts.
- **Shared backup time** — names the "Backup time (h)" field the number goes in.
- **Add Device / bin icon** — new "Adding, Removing and Typing Rows" section,
  including that an invalid entry is outlined and left out of the totals.
- **Station tabs** — the 0/3 counter and the × that deletes a station.
- **Catalog prices** — filled in only while the currency is Tk (BDT listing);
  an already-added model is tagged "Added".
- **Locked comparison** — the missing-input checklist and its "Go" buttons.

### Done when

- An empty Device field shows the list on focus at desktop and phone widths, and
  the list stays put while the page scrolls.
- Every element the page renders is described somewhere in the Guideline modal.
- No console errors; existing localStorage data loads unchanged.
