# Power Station Calculator

A single-page web app that helps people decide which portable power station to buy (Anker, EcoFlow, Bluetti, EcoSONIC, and more).

It answers the four questions buyers most often ask: daily energy need, runtime, solar recharge time, and AC recharge time.

## Stack & Constraints

- **HTML + CSS + Vanilla JS** only — no frameworks, no external modules.
- Deploys on **Cloudflare via Wrangler**.
- Data persists in **localStorage/cookies** so users see their data when they return.
- Everything lives on **one page**; multiple power stations are shown via **tabs**.

## Core Features

- Shared inputs used across every power station:
  - **Daily Energy Consumption** — device list (`watts × hours = Wh`)
  - **Efficiency Factors** — solar and AC derate assumptions
- Add multiple power stations with name, brand, capacity, continuous AC output, AC input (wall charging), solar input, and price.
- Auto-calculated per station (no "Calculate" button):
  - **Runtime** — `capacity × 0.85 ÷ total load`
  - **Solar Recharge Time** — `capacity ÷ solar input × derate`
  - **AC Recharge Time** — `capacity ÷ AC input × derate`
- Generate a **comparison table** (unlocked once every station is complete) and download it as a colorful **PDF**.

## Design

Follows `DESIGN.md`: a bold "Construtivismo Dinâmico Tech" aesthetic with geometric, constructivist color and type.

- **Typography:** Oswald (JetBrains Mono for technical values).
- **Palette:** soothing teal (#2A9D8F), electric blue (#0074D9), yellow (#FFDC00), lime green (#2ECC40), red (#FF4136) for errors, near-black (#1a1a1a), and gray (#AAAAAA).
- **Layout:** compact single page with no hero; CSS Grid/Flexbox, geometric accents, and a colorful comparison table.
- **Responsive:** mobile layout required; columns collapse below 900px/768px.
