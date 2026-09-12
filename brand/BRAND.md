# Obsession — Brand & Style Guide

AI dating-conversation simulator/coach. Positioning: **"Stop practicing dates in your head."**
Visual direction: black background, huge serif wordmark, intimate low-light/abstract
silhouettes, tiny red/pink accents — fashion-editorial, not Tinder.

## Files in this kit

- `tokens.css` — drop-in CSS custom properties + utility classes for colors, type, and the
  recurring UI pieces (tag, pill, card, bubble). Import once, globally.
- `app-icon.svg` — the app icon mark (circular "O" with a heartbeat/pulse line through it —
  ties the mark itself to the physiological-signal concept). Use as-is for favicon/app icon,
  or drop into a `<svg>` inline if you need to recolor at runtime.

## Quick start

```html
<link rel="stylesheet" href="/tokens.css">
<body class="ob-theme">
```

Or in a bundler/React project, `import "./tokens.css"` once at the app root and add
`className="ob-theme"` to your root layout element.

## Color

| Token | Value | Use |
|---|---|---|
| `--ob-void` | `oklch(14% 0.012 30)` | primary background |
| `--ob-ink` | `oklch(9% 0.010 20)` | cards / panels on void |
| `--ob-bone` | `oklch(96% 0.008 75)` | primary text, reversed backgrounds |
| `--ob-muted` | `oklch(70% 0.010 60)` | secondary text, labels |
| `--ob-line` | `oklch(28% 0.010 30)` | hairlines / borders |
| `--ob-pulse` | `oklch(60% 0.180 25)` | red accent — alerts, key moments, "nerve hit" |
| `--ob-hush` | `oklch(60% 0.180 340)` | pink accent — secondary highlight, glows |

Keep accents rare and small — a chip, a hairline, a glow — never a fill. The brand reads as
restrained black-and-bone with the red/pink as a pulse, not a palette.

## Type

- **Bodoni Moda** (display, serif) — the wordmark, headlines, section titles (weight 700,
  tight tracking), and italic for the AI's spoken lines / tagline.
- **Manrope** (body/UI, sans) — body copy, buttons, nav, data readouts, labels (weights
  400–800).

Both load via Google Fonts in `tokens.css`. Fallback stacks are set for degraded rendering
(exports, print, offline).

## Components

### Wordmark

```html
<div class="ob-wordmark ob-wordmark--hero">OBSESSION</div>
<div class="ob-tagline">Stop practicing dates in your head.</div>
```

Use `ob-wordmark--lockup` (52px) for a compact logo lockup, `ob-wordmark--nav` (15px) for a
header/nav bar.

### Signature physiological tag

The recurring "brand moment" — call this out any time the app flags a live physiological
deviation:

```html
<div class="ob-tag">
  <span>OBSESSION</span>
  <span>—</span>
  <span class="ob-tag__delta">NERVES ↑</span>
</div>
```

### Result category pill

```html
<div class="ob-pill">Chemistry</div>
<div class="ob-pill">Conversation</div>
<div class="ob-pill">Composure</div>
<div class="ob-pill">Curiosity</div>
```

### Reaction-moment card (AI line + HR readout)

```html
<div class="ob-card" style="display:flex; justify-content:space-between; align-items:flex-start; gap:24px;">
  <div class="ob-bubble" style="max-width:70%;">"Oh, I definitely hit a nerve there."</div>
  <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
    <div class="ob-eyebrow" style="letter-spacing:0.15em;">Heart Rate</div>
    <div style="font-size:20px; font-weight:700;">71 → <span style="color:var(--ob-pulse);">89</span></div>
    <div style="font-size:11px; letter-spacing:0.1em; color:var(--ob-pulse); font-weight:700;">NERVES ↑</div>
  </div>
</div>
```

### App icon

```html
<img src="/app-icon.svg" width="48" height="48" alt="Obsession app icon" />
```

## Rules of thumb

- Backgrounds are `--ob-void`/`--ob-ink`, never pure `#000` — keeps a warm, filmic black.
- Reversed lockup (dark text on `--ob-bone`) is fine for light contexts (print, email) —
  don't invent a second light theme beyond that.
- No emoji, no rounded-card-with-left-border-accent clichés, no stock gradients — the accent
  glows in the mockups are soft radial blurs, not gradient fills on solid shapes.
- Hit targets ≥44px on any mobile screen; body copy never below 12pt-equivalent (~16px) for
  reading text.
