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

## Follow-up — Polish, motion, SEO and credit (inline request)

Source: inline request. Branch: `feature/polish-seo-footer`.
Status: Implemented — verified with a headless-Chromium suite (208 checks across four
passes: desktop, phone, reduced motion and locked→ready). Awaiting user review +
commit permission.

### 1. The Backup Load card no longer buries its own form

The card's helper paragraph was the tallest thing above the first input: **189px of an
844px phone viewport**, which pushed the first Device field to y=872 — below the fold,
so the form had to be scrolled to before it could be seen at all. The copy is trimmed at
the source (370 → 141 characters: it now says what to do and where the appliance list
is, and leaves the reasoning to the Guideline modal), and on phones it is set at
13px/1.45. The first Device field now sits at **y=742**, above the fold.

### 2. Contrast floor

Measured, not guessed. Every secondary-text role in the app failed 4.5:1, and the fix is
at the token, which is where the cause was:

| Token | Was | Now | Why |
| --- | --- | --- | --- |
| `--smoke` | `#7f8491` | `#6a6e79` | 3.74:1 on paper / 3.38:1 on mist carried the lede, card copy, field hints, table headers, legends and the footer. Now 5.10:1 / 4.60:1 |
| `--pewter` | `#b0b3bb` | `#898c93` | 2.10:1 — the border is the only thing identifying a ghost button, and non-text contrast needs 3:1. Now 3.37:1 |
| `--green` | `#059669` | `#07835d` | White on it measured 3.77:1, under 4.5:1 for the 13px "Best" badge. Now 5.20:1 |

The device-table input border moved from Ash to Pewter: at 1.30:1 the cells read as
blank space, with nothing to say where to type. The print sheet's hardcoded copy of the
green now reads the token, so screen and paper cannot drift. DESIGN.md records all four.

### 3. SEO

Brand-targeted title, description and keywords; canonical; `robots`; Open Graph and
Twitter cards; and `WebApplication` structured data listing the seven catalog brands
(EcoFlow, Bluetti, Anker, Oraimo, Marsriva, Hithium, EcoSONIC), the six calculations and
the developer. The canonical and `og:url` point at
`https://power-station-calculator.pages.dev/` — change both if a custom domain is used.

### 4. Footer credit

The old tagline is gone; the footer now carries a single quiet credit linking to
https://smdev.uk.

### 5. Motion — polish and animate

**Thesis.** This is an Operate surface, so motion is feedback first: it says that an
answer moved, that a list reordered, that something arrived. There is one entrance
(`enter-up`), shared by everything that arrives as a whole, rather than a different
effect per component.

**Focal moment — the ranked comparison reorders.** Choosing a metric re-ranks the
stations. The rows now FLIP: app.js measures each row before the re-render, hands it the
distance it has to travel as a transform, then releases it so a 320ms transition carries
it home. A re-rank is no longer a jump cut the reader has to re-read.

**Supporting motion, each tied to a real change:**

- **Changed answers.** The result-tile values and the two device totals are compared
  against the figure last drawn, and only a genuine difference is acknowledged —
  `value-settle`, 260ms. A repaint stays perfectly still.
- **Bar continuity.** Comparison bars state a ratio as `--fill` and scale themselves by
  it, so a bar slides from the length it had to the length it now has instead of
  restarting from zero. A render where no bar changed length does no work at all.
- **The comparison's arrival.** The one element that enters. It plays once, on the render
  where the last missing input lands — and is silent on page load, so a returning visitor
  is not made to watch it.
- **Station switching.** The only navigation on the page, so the summary and its three
  tiles arrive together with a single 60ms offset. Triggered by the tab actually
  changing, never by a re-render.

**Removed.** Three animations that fired on every render and therefore meant nothing:
the per-tile `rise` (which replayed on every keystroke and read as a flicker), the
`bar-grow` restart, and the dead `transition: width` on the summary progress bar, whose
element is rebuilt each render so it could never play. The brand shimmer now pauses when
its heading is off screen. The hero eyebrow pill ("Output") was removed — it duplicated
the heading beneath it — along with the print rule that hid it.

**Reduced motion.** A global block resolves every animation and transition to its final
state in 1ms, and app.js reads the same query so the reorder and bar transitions are
never started rather than started-and-collapsed. The brand loop stops entirely.

### 6. Three defects found while polishing

- **The ranked list's bars were painted full length.** The table and the ranked list each
  drew their own bar markup; converting the table to a scale ratio left the ranked list
  still writing `width`, which the new rule does not read, so every ranked bar rendered
  at 100%. Both now call one `barMarkup()`, and the suite asserts that every bar is
  painted at the ratio it declares rather than trusting the markup.
- **The sortable column headings were 14px tall.** They are the primary control in the
  comparison table, and a 14px target is a miss on a phone. Padding with a cancelling
  negative margin takes the hit area to 24px without moving a pixel of the header.
- **Four print rules hardcoded the old Smoke grey.** `.print-report__date`,
  `.print-report__note`, `.report-station h3 span` and `.report-station__status` each
  carried `#7f8491` as a literal, so the PDF would have kept the low-contrast grey after
  the token moved — the same drift the green had. They read `var(--smoke)` now, verified
  under emulated print media.

### Verified

Headless-Chromium suite, **237 checks across five passes**, all green, no console or page
errors: desktop 1280, phone 390, reduced motion, locked→ready, and print (A4).

- First Device field above the fold on a 390x844 phone: **y=742** (was 872).
- Card helper paragraph: **57px tall** (was 189px).
- Every text role >= 4.5:1; every control edge >= 3:1.
- The PDF path was re-checked because two painting changes touch it. Bars are withheld
  from paper by design (`.compare-bar { display: none }` in print); the cells carry their
  own values and units, and the "Best" badge still resolves the green token.
- Three probe readings remain flagged and are deliberate: the active tab's count pill
  (paper on a translucent white over charcoal — ~10:1, the probe stops at the translucent
  layer), the card's decorative hairline at 1.64:1, and the active rank pill whose border
  matches its own fill.

### Done when

- The first Device field is above the fold on a 390x844 phone. ✓ (y=742)
- Every text role measures >= 4.5:1 and every control edge >= 3:1. ✓
- SEO, Open Graph, structured data and the credit are present and parse. ✓
- Motion is driven by change, not by render; no per-render entrance remains. ✓
- Reduced motion disables all of it. ✓
- The PDF report and existing localStorage data both still work. ✓
- No console errors. ✓

## Follow-up — Settings dialog, our own confirm, optional price (inline request)

Source: inline request. Branch: `feature/settings-modal-price-optional`.
Status: Implemented — verified with a headless-Chromium suite (116 checks over five
passes for these four items, plus 35 regression checks over the previous pass's
invariants). Awaiting user review + commit permission.

### 1. Shared Settings moved into a dialog

The card spent about a third of the first screen on four small values. It is gone from
the column; the navbar now carries a **Shared Settings** button (short label
`Settings` on phones) that opens a 460px dialog: currency alone on the first line, the
two derate factors side by side under it via a new `.field-row` grid. Changes apply as
they are made — the results behind the dialog are already updated — so `Done`, the ×,
the mask and Escape all simply close it, and focus returns to the button that opened it.

To make room for a fourth navbar button on a phone, the Comparison button's short label
is now `Compare` and the running count rides the long label only; the suite asserts
every navbar label fits without truncating.

**Space freed, measured.** On desktop the station area moved from y=1513 to y=810 on a
900px viewport — it is now on the first screen. On a 390x844 phone the station area
moved up by the height of the removed card (~690px, measured on the previous layout),
but it still sits below the fold: a six-field device card cannot share the first screen
with it. That is a layout fact, not a regression, and the suite records it as such.

### 2. Our own confirmation dialog

`window.confirm` is gone from the codebase. A single `.modal--confirm` dialog answers
both destructive questions — Clear All and deleting a station — in the product's own
voice, with the design system's own buttons (Charcoal fill, per DESIGN.md's rule that
status is carried by weight and words, not colour). It is a `role="alertdialog"` with
`aria-describedby`, focus lands on **Cancel** so a stray Enter cannot delete anything,
and Escape, the mask and Cancel all mean no. `askConfirm()` returns a promise, so both
call sites read as a question rather than a nested `if`.

Escape now also closes the Guideline and Settings dialogs — never the station form,
where it would throw away typing with no way back.

### 3. Price is optional

Reproduced first: the station **table** already kept a price-less station and showed a
dash, but `rankedHTML()` filtered out any station whose metric value was `null`, so
ranking by **Price** silently dropped it. On a phone the ranked list *is* the comparison,
which is how a station can appear to vanish.

The ranked list now lists every included station. One with no value for the chosen metric
states a dash, sorts to the bottom without taking a placing (so the stations above keep
1..n), and draws no bar — exactly how a blank cell behaves in the table. The two views
can no longer disagree about which stations exist.

### 4. Hours is marked optional in the heading

`Hours (h)` → `Hours (h, Optional)`, in the table heading and in the mobile field label
that is rendered from `data-label`, so both stay in step. The three required columns keep
their asterisk.

### Verified

- 116 checks over five passes (desktop, phone, two "space freed" measurements, print),
  plus 35 regression checks (desktop, phone, reduced motion). All green, no console or
  page errors.
- The dialog is measured, not assumed: the currency field spans the dialog width, the
  two derate fields share a line and split it evenly, and the dialog fits a 390px phone
  without sideways scroll.
- No native browser dialog is ever reached — the suite stubs `window.confirm`/`alert`
  and fails if either is called.
- Print is re-checked: the two new dialogs are hidden on the sheet.

## Follow-up — Rank-by tooltips answer to the ⓘ (inline request)

Source: inline request. Branch: `fix/rank-pick-tooltip-anchor`.
Status: Implemented — verified with a headless-Chromium suite driven by a **real pointer**
(20 checks), plus 8 checks for the touch and unanchored-tip paths and 35 regression
checks. Awaiting user review + commit permission.

### The report, reproduced

`data-tip` sat on the `.rank-pick` button, so the explanation belonged to the whole
pill: crossing it anywhere raised the bubble. Measured with a real pointer before the
change:

| Pointer on | Before | After |
| --- | --- | --- |
| the pill body | tooltip raised | nothing |
| the ⓘ | tooltip raised | tooltip raised |
| the pill body, after the ⓘ | tooltip stayed | hidden |
| a mouse click on the pill | tooltip pinned open | nothing |
| keyboard Tab onto the pill | tooltip raised | tooltip raised |
| a tap on the pill (touch) | tooltip raised | tooltip raised |

The click case was the one that made the bubble feel permanent: the click handler
re-renders the card and then calls `focus()` on the new pill, which raised the
explanation and left it there until something else took focus.

### The fix

- **The ⓘ is marked as the pointer's target.** `data-tip-anchor` goes on the icon span;
  the pointer handler resolves a tip through its anchor, so the explanation answers to
  the icon and to nothing else on the pill. The text stays on the button as well,
  because a button cannot hold a second focusable element — that is what keeps the
  keyboard and assistive-tech paths working.
- **A mouse click no longer pins it.** Where a tip names an anchor, the focus path now
  requires focus the browser itself calls keyboard-driven (`:focus-visible`) — but only
  on devices that can hover. A touch screen has no hover, so tapping still reveals the
  explanation there, which the suite checks by measuring `(hover: hover)` and dispatching
  a real touch event.
- **The bubble now points at the ⓘ** rather than at the centre of the pill, so it sits
  under the thing the reader is actually on.
- **The ⓘ is 20×20 instead of a 12px glyph.** Padding widens the hit area and a matching
  negative margin hands the space straight back: the pill still measures 95×30 and the
  label has not moved. The cursor says `help` on the icon while the pill keeps
  `pointer`, so which part does what is visible before you commit to a hover.

Nothing else in the tooltip system changed: the column-heading ⓘ, the estimated-wattage
field and every other `data-tip` have no anchor and behave exactly as before.

### Verified

- 20 checks with a real CDP pointer: every hover re-measures its own coordinates and
  asserts `elementFromPoint` really is the pill or the ⓘ before judging the result.
  (The first attempt at this suite was wrong precisely because it measured mid
  smooth-scroll and put the pointer on a neighbouring row.)
- 8 checks for the touch path and for tips that have no anchor.
- 35 regression checks: metric selection still re-ranks, every station still listed,
  bar ratios intact, pill contrast above 4.5:1, the Guideline and Settings dialogs and
  the appliance list unaffected, no overflow, reduced motion still collapses everything.
- No console or page errors in any pass.
