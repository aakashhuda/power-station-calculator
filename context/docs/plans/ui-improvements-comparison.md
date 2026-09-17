# UI Improvement Plan — Power Station Calculator

Status: **Implemented** on branch `feature/comparison-ux` — P1, P2, P3 and the optional
derived metrics, verified with 167 automated checks in headless Chromium.
Source: UI analysis of `public/` (index.html, app.js, styles.css) against `DESIGN.md`.

## Decisions taken

1. **Scope** — all of P1, P2 and P3, plus the optional derived metrics.
2. **Green status colour** — Signal Green is kept **only** for the "Best" marker
   (P3.13). It was removed from the catalog "Added" tag and the print status line, which
   now use Charcoal and Smoke. The exception is documented in `DESIGN.md`.
3. **Derived metrics** — both were added: **Coverage** (days one charge covers the shared
   daily need) and **Price / Wh**.

### Deviations from the plan as written

- **The locked checklist is mostly about devices.** Station inputs are validated at add
  time, so an added station is always complete — the earlier concern about 24 catalog
  products with no published AC input does not reach the comparison, because the form
  requires those values before the station can be added. The checklist is implemented
  generally but in practice reports the pending daily-consumption input.
- **Bars are on Capacity, Coverage and Runtime only, not on the recharge times.** A longer
  bar reads as "more", and for recharge times more is worse — barring them would have
  drawn the best station with the shortest bar. The Best marker covers those two columns.
- **Brand is no longer its own column**; it sits under the station name. That bought back
  the width needed for the two new metric columns.
- **Bars are hidden by default in print** and the ranked view never prints; the PDF keeps
  a plain table.

## Goal

Make the comparison the strongest part of the product. The page already collects good
data; the gap is that it does not help anyone *decide*. Success means a buyer with 3–5
candidates can answer "which one should I buy?" without mentally sorting a table.

**Success criteria**

- Every comparison metric can be ranked by clicking its header, and the ranking is
  announced to assistive tech.
- Differences in magnitude are visible at a glance, not just "who won".
- Comparing on a phone is possible — today it is structurally impossible.
- The "Best" badge never contradicts the number printed next to it.
- Prices are readable and never silently compared across currencies.
- When the comparison is locked, the user is told exactly what to fix and can get there.

## Current state (what was analysed)

Comparison lives in `renderComparison()` / `comparisonTableHTML()` (`public/app.js`),
styled by `.compare-*` in `public/styles.css`.

- Table is **rows = stations, columns = Name | Brand | Price | Capacity | Runtime | Solar | AC**.
- Gated on **every** station having all 3 calculations done (`doneCount === total`), per
  `project-overview.md`. This gate is specified — the plan keeps it and improves the
  experience around it rather than removing it.
- `bestValues()` marks longest runtime and shortest solar/AC with a green `.best-badge`.
- Table already uses `font-variant-numeric: tabular-nums` — good, keep.
- Below 768px the table becomes **one card per station**, which removes the ability to
  compare across stations entirely.

## Prioritised improvements

### P1 — Make the comparison answer questions

1. **Sortable columns.** Click Price / Capacity / Runtime / Solar / AC to sort; click again
   to reverse. Blank values ("—") always sort last in both directions. Set `aria-sort` on
   the active header and make headers real `<button>`s so they are keyboard reachable.
   *Rationale:* the single biggest convenience win. "Cheapest first" and "longest runtime
   first" are the actual buying questions and today both require manual scanning.

2. **Relative magnitude bars.** A thin track behind each Capacity / Runtime / Solar / AC
   cell, width proportional to that column's max. Renders as a subtle Mist/Ash track with
   the **electric-blue gradient** fill — the one accent `DESIGN.md` explicitly sanctions
   for "product UI project bars and chart accents". Hidden when fewer than 2 stations or
   when all values are equal (avoids a meaningless full-width bar).
   *Rationale:* "Best" tells you *who* won; the bar tells you *by how much*. Two stations
   at 8.7 h and 8.8 h currently look identical in weight; the bar separates them.

3. **Fix the "Best" badge rounding contradiction.** `bestValues()` compares raw floats
   while the table prints `fmt()`-rounded values. A station can therefore show "8.7"
   unbadged next to a badged "8.7". Decide the winner on the **displayed** value so the
   badge can never contradict the number beside it. Also make ties badge both rows
   (already the intent) and keep the `stations.length < 2` guard.

4. **Mobile: metric-first ranked comparison.** Replace one-card-per-station with a
   segmented control — **Ranked | All specs** — reusing the existing `.seg` component.
   *Ranked* shows a metric picker (Runtime / Solar / AC / Capacity / Price) and lists all
   stations ordered best-first with the P1.2 bars, so a phone can actually compare.
   *All specs* keeps today's per-station card layout for detail. Print keeps real tables.
   *Rationale:* the current mobile layout is a list of cards you must scroll between and
   remember — the opposite of comparison.

5. **Readable, trustworthy prices.**
   - Group thousands: `৳82,500` not `৳82500` (today `৳610490` is hard to scan). Add a
     dedicated `fmtPrice()`; leave `fmt()` alone so measured values keep their precision
     behaviour.
   - **Mixed-currency guard.** Station prices are stored as bare numbers, so switching the
     currency selector after adding stations silently relabels existing values (a BDT
     `82500` becomes `$82500`) and the comparison then compares nonsense. Store the
     currency code on the station at entry and, when stations disagree, label each price
     with its own currency and show one notice — rather than inventing exchange rates.

### P2 — Remove friction on the way to the comparison

6. **Informative locked state.** Replace the placeholder box with a per-station checklist
   naming the exact missing inputs ("SOLIX F3800 — needs solar input"), each a button that
   activates that station and scrolls to the offending field. *Rationale:* 24 of 81 catalog
   products have no published AC input and 18 no solar input, so this gate will be hit
   constantly.

7. **Honest nav CTA.** "Generate Comparison" neither generates nor is the primary user
   action. Make it `Compare (n)`, reflecting readiness, and have the incomplete-case toast
   point at the checklist from P2.6 instead of a generic message.

8. **Shortlist toggle.** An "Include in comparison" control on the station summary so a
   reference station can be kept without cluttering the table. Comparison renders only
   included stations; `stations.length` guards become "included count" guards.

9. **Station tab bar.** Tabs wrap to multiple rows as stations accumulate. Keep the active
   tab scrolled into view, and replace the `n/3` count pill with a warning affordance when
   a station still needs input (`n/3` stays for complete stations).

### P3 — Polish and beauty

10. **Sticky comparison header** so column names stay visible while scrolling a long table.
11. **Empty state** for the comparison section that explains the three-step flow instead of
    "Your comparison table will appear here."
12. **Motion and focus:** bars animate in with a transform/opacity transition guarded by
    `prefers-reduced-motion`; visible focus rings on sortable headers.
13. **Reconcile green with `DESIGN.md`** — the system says "do not use colour for status or
    state" and allows only the green logo mark and blue gradient outside product UI, yet
    green is used for the Best badge, the "Within continuous output" status and the picker's
    "Added" tag. Decide: keep green strictly for "Best" as the app's sanctioned single
    accent moment and document the exception, or move status to weight/fill/border.
    Recommendation: document the exception for "Best", remove green from the other two.

### Optional — needs approval (beyond the current spec)

14. **Derived comparison metrics.** Two additions that are the most decision-relevant
    numbers for a buyer and are cheap to compute from existing inputs:
    - *Daily-need coverage* — usable capacity (capacity × 0.85) ÷ daily Wh = how many days
      one charge buys.
    - *Price per Wh* — a standard battery value metric.

    `project-overview.md` says not to add features outside the spec, so these are **not**
    part of the plan unless approved.

## Implementation by subsystem

**`public/app.js`**
- Module state: `comparisonSort = { key: null, dir: 'desc' }`.
- `fmtPrice()` helper; `priceLabel()` delegates to it.
- `bestValues()` and `bestCell()` compare formatted values.
- New `sortStationsForComparison()`, `columnMax()`, `barHTML()`, `compareChecklistHTML()`,
  `rankedComparisonHTML()`.
- `comparisonTableHTML()` emits `<button class="compare-sort">` headers carrying `data-key`
  and `aria-sort`; one delegated click listener on the table rather than per-render binding.
- `renderComparison()` branches on a `compareView` mode for mobile; reuses the existing
  `.seg` button pattern and its event wiring conventions.
- `createStation()` gains `priceCurrency` and `included` (both defaulted).

**`public/index.html`** — sort-button markup is generated in JS; the comparison section gets
a view-mode segmented control and the checklist container. Guideline modal step 5 updated to
describe sorting and the mobile ranked view.

**`public/styles.css`** — new `.compare-sort`, `.compare-bar` (gradient track),
`.compare-check` and `.ranked-*` blocks; sticky `thead th`; mobile rules scoped inside
`@media screen and (max-width: 768px)` so **print keeps the real table** (the existing
convention — mobile transforms never apply to print). Reduced-motion guard.

## Data flow and schema

- **localStorage (`psc_data_v3`)**: two new optional station fields — `priceCurrency`
  (string) and `included` (boolean). Both read defensively: missing `included` means
  `true`; missing `priceCurrency` means "unknown", which suppresses the mismatch notice
  rather than inventing one. **No migration and no key bump needed** — existing saved data
  keeps working, matching the pattern already used for `catalogId`.
- **`public/catalog.js`**: unchanged. No catalog regeneration is required by this plan.
- **Sort/rank state** is session-only; not persisted, so a reload returns to a neutral view.
- `recomputeAll()` is untouched: the bars and ranking are presentation over existing
  `calcs`, so no calculation changes and no risk to the numbers themselves.

## Edge cases and failure modes

- Blank values ("—") sort last in **both** directions; they never produce a `NaN` comparator.
- One station: no Best badge (existing guard), no bars, ranked view still lists it.
- All values equal: bars suppressed rather than shown at 100% width.
- Zero / missing denominators in a bar: guard against divide-by-zero, render no fill.
- Two stations tying on a metric: both badged — and now badged on the **displayed** value,
  which is what makes ties visible and correct.
- Sorting with mixed currencies: price sort stays numeric, but the mismatch notice makes the
  comparison's invalidity explicit rather than silent.
- Deleting or excluding stations while a sort is active: list re-renders from the new set;
  the sort key persists and still resolves.
- Print: bars and the mobile ranked view must never leak into the PDF; assert real tables in
  print.
- `renderComparison()` runs on every device keystroke, so whatever is added must stay cheap
  (no per-render listener accumulation — bind once via delegation).

## Verification

Same approach as the previous rounds: a throwaway CDP harness driving the cached Chromium
headless shell with Node built-ins only (nothing installed), plus `node --check`.

- **Functional:** sort each column ascending/descending; blanks land last; `aria-sort`
  tracks the active column; Best badges match the printed numbers, including a
  constructed near-tie that displays identically; bars scale correctly and are absent for
  1 station / all-equal; price grouping renders; the mixed-currency notice appears only when
  currencies actually differ; the checklist names the right fields and jumps to them;
  shortlist exclusion removes a station from the table and from the Best comparison.
- **Layout:** desktop 1280, tablet 800, mobile 390/320 — no horizontal overflow, bars not
  clipped, mobile ranked view usable, sticky header correct.
- **Print:** real table, no bars, no segmented control, no checklist.
- **Regression:** the existing suite (data integrity, catalog picker, search ranking, custom
  mode, currency, escaping, PDF) must stay green — currently 162 checks.

## Assumptions

- The "all calculations complete" gate on generating the comparison **stays**, because
  `project-overview.md` specifies it. P2.6 improves the gate's experience, it does not
  remove the gate.
- `DESIGN.md` is a marketing-site style reference; the app is the product UI it describes,
  so the sanctioned blue gradient is available for comparison bars specifically.
- Only HTML, CSS and vanilla JS — no frameworks, no packages, no build step.
- Per `ai-interaction.md`, implementation works on a short-lived branch and does not commit
  without permission. (`git-conventions.md` and `ai-interaction.md` disagree on branch
  naming; `feature/...` from the latter is used.)

## Follow-up work, now done

Both items below were requested after the plan was implemented and are complete:

### Station editing

`Edit Specs` in a station's summary opens the **same modal the add action uses**, filled
in with that station's values and titled "Edit Power Station" with a "Save Changes" button.
Sharing one form means the two actions cannot drift apart. On save the station is updated
**in place** — its `id`, `catalogId`, `included` flag and position are preserved, and
`recomputeAll()` refreshes the results from the new specs.

The catalog picker is hidden while editing, because picking a model replaces every field and
would discard the station being edited. A saved price in a different currency is left blank
in the price field (with the reason stated in the subtitle) rather than copied across and
silently re-labelled; retyping it stamps the current currency.

### Ranked view on every screen size

The ranked comparison is no longer mobile-only. `Ranked | All Specs` now appears at every
width, and the default follows the screen until the user picks: a wide screen leads with the
table, a narrow one leads with the ranking, since a stack of station cards cannot be
compared. An explicit choice pins the view; while it is still automatic a debounced resize
listener re-resolves it when the breakpoint is crossed.

## Remaining gaps

- `git-conventions.md` still describes an Astro layout (`src/`, `package.json`,
  `phase-N-*` branches) that this project does not have, and disagrees with
  `ai-interaction.md` on branch naming.
