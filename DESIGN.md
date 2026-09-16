---
version: "alpha"
name: "Estilo de Litografia de Precisão"
description: "Precise and industrial landing page for EUV technology. Ideal for landing pages, modern websites. AI-ready template."
colors:
  primary: "#003366"
  secondary: "#C0C0C0"
  tertiary: "#FFFFFF"
  neutral: "#36454F"
  surface: "#00BFFF"
  accent: "#00FF00"
typography:
  h1:
    fontFamily: Source Sans Pro
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: Source Sans Pro
    fontSize: 1rem
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    padding: 12px
---

## Overview

Precise and industrial landing page for EUV technology. Ideal for landing pages, modern websites. AI-ready template. There's something almost spiritual about EUV lithography. You're projecting light at 13.5 nanometers — a wavelength so short it gets absorbed by air itself — onto silicon wafers to etch patterns smaller than a virus. The entire process happens in a vacuum, bouncing off multilayer mirrors with tolerances measured in atoms. That's not engineering. That's obsession made physical.

The visual language born from this world is unmistakable. Stacked translucent layers. Repeating geometric patterns at impossible density. Color palettes pulled from thin-film interference — those iridescent blues and violets you see when light diffracts off a wafer's surface. Everything is grid-locked, everything registers perfectly to what came before it.

Designers working in deep tech have been borrowing this vocabulary for years, but rarely with the rigor it deserves. The best implementations treat the screen like a reticle — every element placed with nanometer intent, every layer serving a structural purpose. No decoration. Pure function rendered beautiful through sheer precision.

- Density: 3/10 — Airy
- Variance: 2/10 — Structured
- Motion: 4/10 — Subtle

- **Style:** Industrial, Scientific, Precise
- **Keywords:** lithography, EUV, semiconductors, nanotechnology, precision, scientific, industrial, advanced, cleanroom, structured
- **Era:** 2026+ Microchip Revolution
- **Light/Dark:** ✓ Full / ✗ No

## Colors

- **Azul Científico** (#003366) — Accent highlight, links and focus states
- **Prata** (#C0C0C0) — Secondary surface or text color
- **Branco** (#FFFFFF) — Light surface, card backgrounds
- **Cinza Escuro** (#36454F) — Dark surface, primary background
- **Azul Elétrico** (#00BFFF) — Secondary accent
- **Verde** (#00FF00) — Success states, positive indicators
- **Laranja** (#FFA500) — Warm accent, call-to-action secondary
- **Cinza Claro** (#D3D3D3) — Secondary text, borders, muted elements

## Typography

- **Display / Hero:** Source Sans Pro — Weight 700, tight tracking, used for headline impact
- **Body:** Source Sans Pro — Weight 400, 16px/1.6 line-height, max 72ch per line
- **UI Labels / Captions:** Source Sans Pro — 0.875rem, weight 500, slight letter-spacing
- **Monospace:** JetBrains Mono — Used for code, metadata, and technical values

Scale:

- Hero: clamp(2.5rem, 5vw, 4rem)
- H1: 2.25rem
- H2: 1.5rem
- Body: 1rem / 1.6
- Small: 0.875rem

## Layout

- **Grid:** CSS Grid primary. Max-width containment: 1280px centered with 1.5rem side padding.
- **Spacing rhythm:** Balanced. Base unit: 0.5rem (8px).
- **Section vertical gaps:** clamp(4rem, 8vw, 8rem).
- **Hero layout:** Split-screen (text left, visual right).
- **Feature sections:** Zig-zag alternating text+image rows. No 3-equal-columns.
- **Mobile collapse:** All multi-column layouts collapse below 768px. No horizontal overflow.
- **z-index contract:** base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).

## Elevation & Depth

Visualizações de feixes de luz (EUV), diagramas de máquinas complexas, brilhos sutis em componentes de alta tecnologia, tipografia técnica e limpa, micro-interações de dados, elementos modulares, animações de processo de fabricação.

- **Physics:** Ease-out curves, 200-300ms duration. Smooth and predictable.
- **Entry animations:** Fade + translate-Y (16px → 0) over 420ms ease-out. Staggered cascades for lists: 80ms between items.
- **Hover states:** Subtle color shift + shadow adjustment over 200ms.
- **Page transitions:** Fade only (200ms).
- **Performance:** Only transform and opacity animated. No layout-triggering properties.

## Shapes

Base corner radius: 8px. See rounded tokens in front matter for the full scale.

## Components

- **Primary Button:** Subtly rounded (0.5rem) shape. Accent color fill. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.
- **Secondary / Ghost Button:** Outline variant. 1.5px border in muted color. Text in primary color. Hover: subtle background fill.
- **Cards:** Subtly rounded (0.5rem) corners. Surface background. Subtle shadow (0 2px 12px rgba(0,0,0,0.06)). 1px border stroke.
- **Inputs:** Label above input. 1px border stroke. Focus ring: 2px accent color offset 2px. Error text below in semantic red. No floating labels.
- **Navigation:** Primary surface background. Active item: accent color indicator. Font weight 500 when active.
- **Skeletons:** Shimmer animation matching component dimensions. No circular spinners.
- **Empty States:** Icon-based composition with descriptive text and action button.

## Do's and Don'ts

- No emojis in UI — use icon system only (Lucide, Heroicons)
- No pure black (#000000) — use off-black or charcoal variants
- No oversaturated accent colors (saturation cap: 80%)
- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid
- No `h-screen` — use `min-h-[100dvh]`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken external image links — use picsum.photos or inline SVG
- No generic lorem ipsum in demos

- Do Visualizações de feixes EUV
- Do Diagramas de máquinas
- Do Brilhos em componentes
- Do Tipografia técnica
- Do Micro-interações de dados
- Do Animações de processo.

## Use Case

Landing pages, Modern websites
