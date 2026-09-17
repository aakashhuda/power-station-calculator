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

Follows `DESIGN.md`: the "Hellotime" monochrome editorial system — flat surfaces, hairline borders, and one electric-blue gradient accent.

- **Typography:** Inter (SF Pro substitute) with strong weight contrast.
- **Palette:** near-monochrome — Ink (#151619), Smoke (#7f8491), Fog/Ash/Mist neutrals, Charcoal (#25272d) CTAs, Signal Green (#059669) brand mark, and an electric-blue gradient reserved for headline keywords.
- **Layout:** flat, shadow-free single page with no hero; 16px-radius cards, generous whitespace, and a dark-header comparison table.
- **Responsive:** mobile layout required; columns collapse below 900px/768px.
