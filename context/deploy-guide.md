# Deploy Guide — Cloudflare Pages (Wrangler)

The app is a static site (HTML, CSS, Vanilla JS). No build step is required.

## Prerequisites

- A Cloudflare account
- Node.js 18+ installed locally
- Wrangler available via `npx` (no global install required)

## Deploy

From the project root:

```bash
npx wrangler login
npx wrangler pages deploy public --project-name power-station-calculator
```

The first command authenticates with Cloudflare. The second uploads the `public/` directory to Cloudflare Pages.

Wrangler prints the production URL (usually `https://power-station-calculator.pages.dev`) when the deploy finishes.

## Local preview

```bash
npx wrangler pages dev public
```

This serves the app locally and watches for changes.

## Project structure

- `public/index.html` — page markup
- `public/styles.css` — styles (design system from `DESIGN.md`)
- `public/app.js` — all application logic

Only the `public/` directory is deployed; the `context/` docs stay local.
