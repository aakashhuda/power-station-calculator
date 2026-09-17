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
