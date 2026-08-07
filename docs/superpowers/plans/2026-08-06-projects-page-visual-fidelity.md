# Fidelidade Visual ao Mockup — "Meus Projetos" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduce the HTML mockup's visual identity (full color palette, JetBrains Mono/Inter, honeycomb background, component styling) on the already-implemented "Meus Projetos" page, by overriding Bootstrap's default visual classes via SCSS — without touching any `.tsx` file.

**Architecture:** Two new SCSS partials (`_background.scss` for global body styling, `_bootstrap-overrides.scss` for component-class overrides) plus rewrites of the three existing style partials to use the mockup's full token set instead of the reduced 4-color palette used in the first pass. `index.html` gains a Google Fonts `<link>`. `main.scss` wires in the two new partials. No React component files are created, modified, or deleted.

**Tech Stack:** SCSS (already configured via `sass`), targeting Bootstrap 5's own generated class names (`.btn`, `.card`, `.nav-pills`, `.form-control`, `.table`, `.badge`, `.progress`, `.modal-content`) and react-bootstrap's actual rendered output (verified against the installed `node_modules/react-bootstrap` source: `Badge` renders `bg-${bg}` e.g. `bg-info`/`bg-warning`; `Nav variant="pills"` renders `nav nav-pills`; `NavLink` renders `nav-link` + `active`; `ProgressBar`'s inner bar renders `progress-bar bg-${variant}`).

**No automated tests** — same as the original spec for this page; verification is `npm run build`/`npx tsc -b` (should be unaffected, this is CSS-only) plus a manual visual comparison against the mockup in the browser.

---

## File Structure Overview

```
index.html                              # modified — Google Fonts <link>
src/styles/_colors.scss                 # rewritten — full token palette (was 4 status colors)
src/styles/_ui-extras.scss              # modified — reference new token names, avatar sizing to match mockup
src/styles/_footer-widget.scss          # modified — reference new token names
src/styles/_background.scss             # new — honeycomb background + global body typography
src/styles/_bootstrap-overrides.scss    # new — Bootstrap component class overrides
src/styles/main.scss                    # modified — @use the two new partials
```

No files outside `src/styles/` and `index.html` are touched. No `.tsx` files change.

---

### Task 1: Google Fonts in index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the Google Fonts link**

Current `index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>hive-front</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Replace with:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <title>hive-front</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

(Only the two `<link>` lines are added, right after the viewport `<meta>`; nothing else changes.)

- [ ] **Step 2: Verify the dev server still starts**

Run: `npm run build`
Expected: succeeds with no errors (this is a static HTML change, won't affect the TS/JS build, but confirms nothing is broken).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "style: load JetBrains Mono and Inter from Google Fonts"
```

---

### Task 2: Full color palette in `_colors.scss`

**Files:**
- Modify: `src/styles/_colors.scss`

- [ ] **Step 1: Replace the file's content**

Current `src/styles/_colors.scss`:
```scss
$color-success: #2f8f5b;
$color-warning: #8a6d00;
$color-danger: #c6373f;
$color-info: #3b5fc4;
```

Replace with:
```scss
// Neutros
$bg: #f2f2f0;
$bg-alt: #fafaf9;
$surface: #ffffff;
$surface-2: #eaeae7;
$border: #dadbd7;
$border-strong: #b9bcc1;
$text: #1f2024;
$text-dim: #5a5d63;
$text-faint: #8e9096;

// Acento de marca
$yellow: #ffe36e;
$yellow-strong: #ffd23f;
$yellow-deep: #8a6d00;
$yellow-soft: rgba(255, 227, 110, 0.4);

// Status
$red: #c6373f;
$red-soft: rgba(198, 55, 63, 0.1);
$orange: #c9722e;
$orange-soft: rgba(201, 114, 46, 0.12);
$green: #2f8f5b;
$green-soft: rgba(47, 143, 91, 0.1);
$blue: #3b5fc4;
$blue-soft: rgba(59, 95, 196, 0.1);

$radius: 10px;
$font-mono: "JetBrains Mono", monospace;
$font-sans: "Inter", sans-serif;
```

Note: this file is a leaf partial (only `@use`d by others, doesn't `@use` anything itself), so this replacement can't break a Sass compile on its own — but Task 3 and Task 4 (next) MUST be done in the same session before building, because they still reference the old variable names (`c.$color-success` etc.) which no longer exist after this change. Don't run a build between Task 2 and Task 4 — do Tasks 2, 3, and 4 back-to-back, then build once at the end of Task 4.

- [ ] **Step 2: Commit**

```bash
git add src/styles/_colors.scss
git commit -m "style: replace reduced color palette with mockup's full token set"
```

(Don't type-check/build yet — `_ui-extras.scss` and `_footer-widget.scss` still reference the old variable names until Tasks 3–4 are done. This is expected; move directly to Task 3.)

---

### Task 3: Update `_ui-extras.scss` to the new tokens

**Files:**
- Modify: `src/styles/_ui-extras.scss`

- [ ] **Step 1: Replace the file's content**

Current `src/styles/_ui-extras.scss`:
```scss
@use "colors" as c;

.accent-bar {
  width: 4px;
  border-radius: 3px;
  align-self: stretch;
  flex-shrink: 0;
}
.accent-bar-success { background-color: c.$color-success; }
.accent-bar-danger { background-color: c.$color-danger; }
.accent-bar-info { background-color: c.$color-info; }

.spi-value {
  font-family: var(--bs-font-monospace);
  font-weight: 700;
}
.spi-value-good { color: c.$color-success; }
.spi-value-warn { color: c.$color-warning; }
.spi-value-bad { color: c.$color-danger; }

.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--bs-secondary-bg);
  border: 2px solid var(--bs-body-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  margin-left: -8px;
  flex-shrink: 0;
}
.avatar-circle:first-child {
  margin-left: 0;
}

.project-search-input {
  max-width: 260px;
}

.empty-state-description {
  max-width: 320px;
}

.level-index {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
}

.role-select {
  width: 180px;
  flex-shrink: 0;
}

.progress-cell {
  min-width: 170px;
}

.col-project-name {
  width: 30%;
}

.projects-page {
  padding-top: 6rem;
}
```

Replace with:
```scss
@use "colors" as c;

.accent-bar {
  width: 4px;
  border-radius: 3px;
  align-self: stretch;
  flex-shrink: 0;
}
.accent-bar-success { background-color: c.$green; }
.accent-bar-danger { background-color: c.$red; }
.accent-bar-info { background-color: c.$blue; }

.spi-value {
  font-family: c.$font-mono;
  font-weight: 700;
  font-size: 14px;
}
.spi-value-good { color: c.$green; }
.spi-value-warn { color: c.$yellow-deep; }
.spi-value-bad { color: c.$red; }

.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: c.$surface-2;
  border: 2px solid c.$surface;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: c.$font-mono;
  font-size: 9px;
  font-weight: 700;
  color: c.$text-dim;
  margin-left: -8px;
  flex-shrink: 0;
}
.avatar-circle:first-child {
  margin-left: 0;
}

.project-search-input {
  max-width: 260px;
  background-color: c.$surface;
}

.empty-state-description {
  max-width: 320px;
}

.level-index {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
  color: c.$text-faint;
}

.role-select {
  width: 180px;
  flex-shrink: 0;
}

.progress-cell {
  min-width: 170px;
}

.col-project-name {
  width: 30%;
}

.projects-page {
  padding-top: 6rem;
}
```

Changes from the previous version: all color references now use the mockup's actual token names (`c.$green`/`c.$red`/`c.$blue`/`c.$yellow-deep`) instead of the old `c.$color-*` aliases and instead of `var(--bs-*)` Bootstrap CSS variables; `.avatar-circle` sizing/typography now matches the mockup exactly (24px, `font-mono`, 9px, `text-dim`/`surface`/`surface-2`); `.spi-value` now sets `font-size: 14px` explicitly and uses `c.$font-mono` instead of the Bootstrap monospace variable; `.level-index` gets `c.$text-faint` color; `.project-search-input` gets an explicit white surface background (was inheriting Bootstrap's default `.form-control` background before).

- [ ] **Step 2: Commit**

```bash
git add src/styles/_ui-extras.scss
git commit -m "style: point ui-extras classes at the mockup's full token palette"
```

(Still don't build yet — `_footer-widget.scss` still references the old variable name. Move directly to Task 4.)

---

### Task 4: Update `_footer-widget.scss` to the new tokens

**Files:**
- Modify: `src/styles/_footer-widget.scss`

- [ ] **Step 1: Replace the file's content**

Current `src/styles/_footer-widget.scss`:
```scss
@use "colors" as c;

.footer-widget {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 20;
  width: 520px;
  max-width: calc(100% - 32px);
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  padding: 10px 12px 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 6px 20px rgba(31, 32, 36, 0.1);
}

.footer-widget-divider {
  width: 1px;
  height: 26px;
  background-color: var(--bs-border-color);
}

.footer-widget-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 227, 110, 0.4);
  border: 1px solid rgba(255, 227, 110, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--bs-font-monospace);
  font-weight: 700;
  font-size: 0.72rem;
  color: c.$color-warning;
}
```

Replace with:
```scss
@use "colors" as c;

.footer-widget {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 20;
  width: 520px;
  max-width: calc(100% - 32px);
  background-color: c.$surface;
  border: 1px solid c.$border;
  border-radius: 999px;
  padding: 10px 12px 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 6px 20px rgba(31, 32, 36, 0.1);
}

.footer-widget-divider {
  width: 1px;
  height: 26px;
  background-color: c.$border;
}

.footer-widget-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: c.$yellow-soft;
  border: 1px solid rgba(255, 227, 110, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: c.$font-mono;
  font-weight: 700;
  font-size: 0.72rem;
  color: c.$yellow-deep;
}
```

- [ ] **Step 2: Type-check and build (first checkpoint since Task 2)**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors — this confirms `_colors.scss`, `_ui-extras.scss`, and `_footer-widget.scss` are all consistent with each other again (no leftover references to the old `c.$color-*` names).

- [ ] **Step 3: Commit**

```bash
git add src/styles/_footer-widget.scss
git commit -m "style: point footer-widget classes at the mockup's full token palette"
```

---

### Task 5: Global background and typography

**Files:**
- Create: `src/styles/_background.scss`

- [ ] **Step 1: Create the file**

`src/styles/_background.scss`:
```scss
@use "colors" as c;

body {
  background-color: c.$bg;
  color: c.$text;
  font-family: c.$font-sans;
  font-size: 14px;
  line-height: 1.45;
  position: relative;
}

body::before {
  content: "";
  position: fixed;
  inset: -40px;
  z-index: -1;
  pointer-events: none;
  background-color: c.$bg;
  background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27260%27%20height%3D%27260%27%20viewBox%3D%270%200%20260%20260%27%3E%3Cpolygon%20points%3D%2252.00%2C40.00%2041.00%2C59.05%2019.00%2C59.05%208.00%2C40.00%2019.00%2C20.95%2041.00%2C20.95%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.062%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%22166.00%2C20.00%20158.00%2C33.86%20142.00%2C33.86%20134.00%2C20.00%20142.00%2C6.14%20158.00%2C6.14%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.050%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%22246.00%2C90.00%20233.00%2C112.52%20207.00%2C112.52%20194.00%2C90.00%20207.00%2C67.48%20233.00%2C67.48%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.062%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%2288.00%2C150.00%2079.00%2C165.59%2061.00%2C165.59%2052.00%2C150.00%2061.00%2C134.41%2079.00%2C134.41%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.050%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%22210.00%2C190.00%20200.00%2C207.32%20180.00%2C207.32%20170.00%2C190.00%20180.00%2C172.68%20200.00%2C172.68%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.062%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%2234.00%2C230.00%2027.00%2C242.12%2013.00%2C242.12%206.00%2C230.00%2013.00%2C217.88%2027.00%2C217.88%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.050%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%22142.00%2C110.00%20136.00%2C120.39%20124.00%2C120.39%20118.00%2C110.00%20124.00%2C99.61%20136.00%2C99.61%22%20fill%3D%22none%22%20stroke%3D%22%231F2024%22%20stroke-opacity%3D%220.062%22%20stroke-width%3D%221%22%2F%3E%3Cpolygon%20points%3D%22129.05%2C145.81%20128.28%2C147.14%20126.74%2C147.14%20125.97%2C145.81%20126.74%2C144.47%20128.28%2C144.47%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.040%22%2F%3E%3Cpolygon%20points%3D%22116.73%2C131.66%20115.98%2C132.95%20114.49%2C132.95%20113.74%2C131.66%20114.49%2C130.37%20115.98%2C130.37%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.053%22%2F%3E%3Cpolygon%20points%3D%22154.99%2C106.81%20154.12%2C108.32%20152.38%2C108.32%20151.51%2C106.81%20152.38%2C105.31%20154.12%2C105.31%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.051%22%2F%3E%3Cpolygon%20points%3D%22172.93%2C19.91%20171.93%2C21.64%20169.94%2C21.64%20168.94%2C19.91%20169.94%2C18.18%20171.93%2C18.18%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.040%22%2F%3E%3Cpolygon%20points%3D%22176.78%2C41.07%20175.75%2C42.87%20173.67%2C42.87%20172.64%2C41.07%20173.67%2C39.28%20175.75%2C39.28%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.045%22%2F%3E%3Cpolygon%20points%3D%2248.34%2C13.02%2047.08%2C15.21%2044.55%2C15.21%2043.29%2C13.02%2044.55%2C10.83%2047.08%2C10.83%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.054%22%2F%3E%3Cpolygon%20points%3D%2233.95%2C115.50%2032.67%2C117.70%2030.13%2C117.70%2028.85%2C115.50%2030.13%2C113.29%2032.67%2C113.29%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.039%22%2F%3E%3Cpolygon%20points%3D%22111.21%2C143.08%20110.11%2C144.99%20107.90%2C144.99%20106.80%2C143.08%20107.90%2C141.17%20110.11%2C141.17%22%20fill%3D%22%231F2024%22%20fill-opacity%3D%220.041%22%2F%3E%3C%2Fsvg%3E%0A");
  background-repeat: repeat;
  background-size: 260px 260px;
  filter: blur(1.5px);
}
```

This is the exact honeycomb pattern (data-URI SVG) and background rule from the original mockup's `body::before`, copied verbatim — do not alter the encoded SVG string, it must match character-for-character.

This file isn't wired into `main.scss` yet — that's Task 7. Creating it now, standalone, is fine (it won't be compiled/used until `@use`d).

- [ ] **Step 2: Commit**

```bash
git add src/styles/_background.scss
git commit -m "style: add honeycomb background and global body typography partial"
```

---

### Task 6: Bootstrap component overrides

**Files:**
- Create: `src/styles/_bootstrap-overrides.scss`

- [ ] **Step 1: Create the file**

`src/styles/_bootstrap-overrides.scss`:
```scss
@use "colors" as c;

// Botões
.btn {
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
.btn-primary {
  background-color: c.$yellow;
  border-color: c.$yellow;
  color: c.$text;
}
.btn-primary:hover,
.btn-primary:focus {
  background-color: c.$yellow-strong;
  border-color: c.$yellow-strong;
  color: c.$text;
}
.btn-outline-secondary {
  border-color: c.$border-strong;
  color: c.$text;
}
.btn-outline-secondary:hover {
  border-color: c.$text-dim;
  background-color: c.$bg-alt;
  color: c.$text;
}

// Cards
.card {
  background-color: c.$surface;
  border: 1px solid c.$border;
  border-radius: c.$radius;
}

// Abas (Nav pills)
.nav-pills {
  background-color: c.$surface-2;
  padding: 3px;
  border-radius: 9px;
  border: 1px solid c.$border;
}
.nav-pills .nav-link {
  border-radius: 7px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: c.$text-dim;
  background-color: transparent;
}
.nav-pills .nav-link.active {
  background-color: c.$surface;
  color: c.$text;
  box-shadow: 0 1px 2px rgba(31, 32, 36, 0.08);
}

// Inputs e selects
.form-control,
.form-select {
  background-color: c.$bg-alt;
  border: 1px solid c.$border-strong;
  border-radius: 8px;
  font-size: 12.5px;
  color: c.$text;
}
.form-control:focus,
.form-select:focus {
  background-color: c.$surface;
  border-color: c.$text-dim;
  box-shadow: none;
}

// Tabela
.table thead th {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: c.$text-faint;
  background-color: c.$bg-alt;
  border-bottom: 1px solid c.$border;
  font-weight: 700;
}
.table tbody td {
  font-size: 13px;
  border-bottom-color: c.$border;
}
.table-hover tbody tr:hover {
  background-color: c.$bg-alt;
}

// Badges (mode tags: UAT / Cutover)
.badge {
  font-family: c.$font-mono;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 7px;
  border-radius: 5px;
}
.badge.bg-info {
  background-color: c.$blue-soft;
  color: c.$blue;
}
.badge.bg-warning {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
}

// Barra de progresso
.progress {
  height: 6px;
  border-radius: 4px;
  background-color: c.$surface-2;
}
.progress-bar {
  border-radius: 4px;
}
.progress-bar.bg-info {
  background-color: c.$blue;
}
.progress-bar.bg-danger {
  background-color: c.$red;
}
.progress-bar.bg-success {
  background-color: c.$green;
}

// Modais
.modal-content {
  border-radius: 12px;
  border: none;
  box-shadow: 0 24px 60px rgba(31, 32, 36, 0.28);
}
.modal-header,
.modal-footer {
  border-color: c.$border;
}

// Toggle de modo (UAT / Cutover) no modal "Novo projeto".
// Depende da ordem fixa dos botões no JSX (UAT é sempre o primeiro,
// Cutover é sempre o segundo, dentro do único .btn-group daquele modal) —
// não há classe própria por modo nos componentes, então usamos
// :first-child/:last-child para diferenciar a cor de cada um quando
// selecionado (variant="primary"), como o mockup faz.
.modal-content .btn-group[role="group"] .btn {
  border-radius: 8px;
  font-weight: 700;
}
.modal-content .btn-group[role="group"] .btn:first-child.btn-primary {
  background-color: c.$blue-soft;
  border-color: c.$blue;
  color: c.$blue;
}
.modal-content .btn-group[role="group"] .btn:last-child.btn-primary {
  background-color: c.$yellow-soft;
  border-color: c.$yellow-deep;
  color: c.$yellow-deep;
}
.modal-content .btn-group[role="group"] .btn-outline-secondary {
  background-color: c.$surface;
  border-color: c.$border-strong;
  color: c.$text-dim;
}
```

This file isn't wired into `main.scss` yet — that's Task 7.

- [ ] **Step 2: Commit**

```bash
git add src/styles/_bootstrap-overrides.scss
git commit -m "style: add Bootstrap component overrides matching the mockup's visual design"
```

---

### Task 7: Wire the new partials into `main.scss`

**Files:**
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Add the two new `@use` statements**

Current `src/styles/main.scss`:
```scss
@use "ui-extras";
@use "footer-widget";
```

Replace with:
```scss
@use "background";
@use "bootstrap-overrides";
@use "ui-extras";
@use "footer-widget";
```

Order matters here: `background` and `bootstrap-overrides` come first (global/base styles), then `ui-extras`/`footer-widget` (more specific component classes) — later rules in the same specificity tier win ties in the cascade, and the more specific selectors in `ui-extras`/`footer-widget` should take precedence over the broader `.card`/`.btn` etc. rules in `bootstrap-overrides` where they overlap (they mostly don't overlap by selector, but this ordering is the safer default).

- [ ] **Step 2: Full build and type-check**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors — this is the first time all 6 style files compile together.

- [ ] **Step 3: Commit**

```bash
git add src/styles/main.scss
git commit -m "style: wire background and bootstrap-overrides partials into the global stylesheet"
```

---

### Task 8: Manual visual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: prints a local URL.

- [ ] **Step 2: Visual comparison checklist against the mockup**

Open the app in the browser and compare against `HIVE - Tela Inicial - Projetos.html` (open that file directly in a second browser tab, or reference the earlier-read content), confirming:
- [ ] Body background is the warm off-white (`#F2F2F0`), with the subtle honeycomb pattern visible behind the content.
- [ ] Page text renders in Inter; numeric/mono values (stat card values, SPI, avatars, updated time, level index numbers) render in JetBrains Mono.
- [ ] "Novo projeto" button is yellow (`btn-primary`), not Bootstrap's default blue.
- [ ] Stat cards: white background, thin border, label uppercase small, value large in mono.
- [ ] Tabs: gray rounded track, active tab is white with a subtle shadow (not a solid color fill).
- [ ] Search input: white background, gray border, rounded.
- [ ] Table: uppercase header on a slightly off-white background, row hover highlights in off-white.
- [ ] Mode badges: UAT is a small blue pill, Cutover is a small dark-yellow pill — both in mono, uppercase, not Bootstrap's default badge look.
- [ ] Progress bars: thin (6px), rounded, blue/red/green matching the mockup's tones (not Bootstrap's cyan/red/green defaults).
- [ ] SPI values: colored text (green/dark-yellow/red) in mono.
- [ ] Team avatars: small overlapping circles, mono initials.
- [ ] Footer widget: still a floating white pill at the top with the brand and user info, now in the correct border/shadow tones.
- [ ] Team modal and "Novo projeto" modal: rounded corners (12px), pronounced shadow, inputs with the off-white/bordered look.
- [ ] "Novo projeto" modal's UAT/Cutover toggle: selected UAT is blue-tinted, selected Cutover is yellow-tinted (not both the same generic "primary" blue).
- [ ] Empty state (search for something that doesn't exist): renders with the softened, muted look.
- [ ] No layout breakage — nothing overlapping, nothing cut off, responsive behavior (resize the window) still reasonable.
- [ ] No console errors.

- [ ] **Step 3: Re-run the full functional checklist from the original plan's Task 14**

Since this pass touches only CSS, functional behavior shouldn't have changed — but confirm quickly: tabs filter, search filters, row click navigates, team modal opens/closes, "Novo projeto" modal creates a project correctly. This should all still work exactly as before; it's a sanity check, not expected to surface issues.

- [ ] **Step 4: Stop the dev server**

Stop the process (Ctrl+C in the terminal running `npm run dev`).

- [ ] **Step 5: Fix any visual issues found, then commit if changes were made**

If Step 2 revealed a mismatch, adjust the relevant SCSS file(s) (only `.scss` files should need changes), re-run Steps 1–2, then:
```bash
git add -A
git commit -m "fix: address visual mismatches found comparing against the mockup"
```
If everything matches, no commit is needed for this task.
