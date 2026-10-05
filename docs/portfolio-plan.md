# Plan: Glawen LaFleur portfolio (v1)

## Context

Glawen LaFleur is a product designer (UX/UI, plus web design and front-end development) building a professional portfolio. **Its job is to get hired.** The audience is recruiters, interviewers and hiring managers, and they should leave remembering **versatility and creativity**. Glawen cares a lot about accessibility, so the site itself is part of the portfolio. It has to be clearly excellent at accessibility, not just compliant.

The repo is empty: `README.md`, the installed `.claude/skills/frontend-design/` skill, and an empty `external-assets/` folder. There is no code to reuse. This plan is the design plan the client approved, written as a hand-off to the implementing agent. **Load the `frontend-design` skill before building.** Its principles apply throughout.

**Decisions already made with the client (do not revisit):**
| Axis | Decision |
|---|---|
| Mood | Monochrome and Apple-like: clean, strong, smooth rounded corners, even spacing, clean motion |
| Typeface | **Hanken Grotesk** only (variable, self-hosted) |
| Title / tagline | **Product designer** / "I design interfaces and build them, with accessibility from the first sketch." |
| Accent | **Iris violet**, the only color in the UI chrome |
| Theme | Follows the OS/browser light/dark setting by default, with a manual override (Auto / Light / Dark) |
| Stack | Plain HTML, CSS and JS. No framework, no build step. Ask the client before adding any other technology |
| Content | Bio, projects and contact links are lorem ipsum / placeholder for now |
| Layout | Two columns from the client's Figma wireframe: profile on the left, project grid on the right. Clicking a project opens it in a modal |

**Standing instruction from the client:** if you hit any hurdle or open question while building, stop and ask. Don't guess.

---

## 1. Design tokens

### Color (monochrome frame plus one accent)
Every token is defined once with `light-dark()`. The root sets `color-scheme: light dark`. `[data-theme="light"]` / `[data-theme="dark"]` on `<html>` override it by setting `color-scheme`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` | `#F4F4F6` | `#000000` | Page background (true black in dark mode, like Apple's OLED pages, not a tinted near-black) |
| `--surface` | `#FFFFFF` | `#1C1C1F` | Profile panel, tiles, modal |
| `--ink` | `#1B1B1F` | `#F5F5F7` | Primary text and headings |
| `--graphite` | `#4E4E56` | `#A8A8B3` | Secondary text (tagline, meta, captions) |
| `--hairline` | `#DCDCE1` | `#2E2E33` | Dividers and control borders, used sparingly |
| `--iris` | `#4336C4` | `#A9A2FF` | Links, focus ring, selected theme segment. **The only hue in the chrome** |

Contrast targets: **AAA (7:1) for all body and secondary text** on both `--canvas` and `--surface` in both themes, and ≥3:1 for focus rings and control boundaries. The values above were picked to hit that (for example, iris is darker than `#4B3FD1` so it clears 7:1 on `--canvas`). **Check every pair with a contrast checker during the build and adjust if any pair misses.**

Color in project covers comes only from the project imagery. Placeholder covers are neutral greys that look right in both themes.

### Type: Hanken Grotesk (variable 100–900)
- Self-host one latin variable woff2: `https://cdn.jsdelivr.net/fontsource/fonts/hanken-grotesk:vf@latest/latin-wght-normal.woff2` → `assets/fonts/hanken-grotesk-latin-wght.woff2`. Add `OFL.txt`. Use `<link rel="preload">` for the font and `font-display: swap`. Fallback stack: `system-ui, -apple-system, "Segoe UI", sans-serif`.
- **Never set `html { font-size }` in px.** 1rem stays the user's browser setting, so text scales with it. All type and spacing is in rem or em, and line lengths are in ch.
- Scale (major third, ×1.25):
  | Role | Size | Weight | Tracking | Line-height |
  |---|---|---|---|---|
  | Name (h1) | `clamp(2.25rem, 1.6rem + 2vw, 3.25rem)`. The rem term keeps it zoomable | 700 | −0.025em | 1.05 |
  | Title "Product designer" | 1.33rem | 500 | −0.01em | 1.2 |
  | Tagline | 1.0625rem | 400, `--graphite` | 0 | 1.5 |
  | Modal title (h2) | 2.07rem | 700 | −0.02em | 1.1 |
  | Tile title (h3) | 1.0625rem | 600 | −0.005em | 1.25 |
  | Body | 1.0625rem (Apple's 17px at the default size) | 400 | 0 | 1.55 |
  | Small / meta | 0.875rem | 500 | 0.005em | 1.4 |
- The name is the single typographic moment: large, heavy and tightly tracked. Set the type and leave it; no accents on single words.
- Line lengths: bio ≤ 34ch, modal article ≤ 64ch.
- Banned (from the skill): ALL-CAPS labels, eyebrow labels above headings, single-word color or italic accents, monospace labels, `→` on links, `A · B · C` meta strings.

### Space and shape
- One spacing scale in rem: `0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6`.
- **Even spacing is a principle.** One `--gap: clamp(1rem, 0.6rem + 1.2vw, 1.5rem)` is used for the page gutter, the space between sidebar and grid, *and* the gap between tiles, so every gutter on the page matches.
- Radius hierarchy (not one radius on everything): `--r-panel: 1.75rem` (profile panel, modal), `--r-tile: 1.25rem` (tiles), `--r-inner: calc(outer − inset)` for anything nested (cover image inside the modal), `999px` for pills (theme control), and `50%` for the avatar and close button.
- Progressive enhancement: `@supports (corner-shape: squircle) { … }` for Apple-style continuous corners on panels and tiles. Bump the radius slightly so it reads the same, and verify visually.
- Elevation: **tiles have no resting shadow** and are separated from `--canvas` by `--surface`. Only the modal gets a single real shadow, because only the modal is truly elevated. No gradients anywhere.

### Motion
- Easing `--ease-out: cubic-bezier(0.32, 0.72, 0, 1)`. Durations `--t-hover: 240ms`, `--t-open: 450ms`, `--t-close: 350ms`, `--t-theme: 250ms`.
- **Nothing moves on page load.** All motion answers a user action: hover or focus, open, close, theme change.
- `prefers-reduced-motion: reduce`: no transforms, no morph, no scaling. At most a 120ms opacity crossfade.

---

## 2. Layout

Left-aligned throughout. **This departs from the centered wireframe on purpose:** centered multi-line bio text hurts readability, and Apple left-aligns its body copy. The wireframe's order and structure are otherwise kept.

```
Desktop ≥ 64em
┌─────────────────────────────────────────────────────────────────┐
│ gap                                                             │
│ ┌──────────────┐ gap ┌───────────┐ gap ┌───────────┐ gap ┌──────┐│
│ │ (  GL  )     │     │           │     │           │     │      ││
│ │              │     │  cover    │     │  cover    │     │ …    ││
│ │ Glawen       │     │           │     │           │     │      ││
│ │ LaFleur      │     │┌─────────┐│     │           │     │      ││
│ │ Product      │     ││ Title   ││ ←── caption slides up on    ││
│ │ designer     │     ││ tagline ││     hover / focus-visible    ││
│ │ tagline…     │     │└─────────┘│     │           │     │      ││
│ │              │     └───────────┘     └───────────┘     └──────┘│
│ │ bio (≤34ch)  │                                                 │
│ │              │   grid: repeat(auto-fit, minmax(min(100%,18rem),1fr))
│ │ Email        │   square tiles (aspect-ratio: 1)                │
│ │ LinkedIn     │   3 projects fill one row; more wrap naturally  │
│ │ GitHub       │                                                 │
│ │ Résumé (PDF) │                                                 │
│ │              │                                                 │
│ │ Appearance   │                                                 │
│ │ [Auto|Light|Dark]                                              │
│ └──────────────┘ sticky, height ≤ 100dvh − 2·gap, scrolls inside │
└─────────────────────────────────────────────────────────────────┘
```

- **Profile panel** (`<header class="profile">`, `--surface`, `--r-panel`): width `clamp(17rem, 24vw, 22rem)`, sticky at `top: var(--gap)`. It scrolls internally if it's taller than the viewport. Stickiness is **off** under `(max-height: 40em)` so zoomed users never lose content. Contents in order: avatar (8rem circle; placeholder is a "GL" monogram on `--canvas` with `--ink` text, replaceable with an `<img>`), name (h1), title, tagline, bio, contact list, appearance control pinned to the panel bottom with `margin-top: auto`.
- **Project grid** (`<main id="projects">`, with a visually hidden h2 "Projects"): `auto-fit` (not `auto-fill`), so 3 projects stretch to fill a row instead of leaving a gap like the 4-column wireframe would.
- **Tablet, 40–64em:** the profile becomes a full-width, non-sticky intro panel above the grid, with the avatar beside the text. The grid has 2 columns.
- **Mobile, < 40em:** everything stacks into a single column of tiles. Mobile isn't the priority, but it must be clean and fully functional.
- Breakpoints are in **em** so they respond to text zoom. At 400% zoom on a 1280px window (320 CSS px), the page reflows with no horizontal scroll (WCAG 1.4.10).

### Project tile
- Markup: `<a class="tile" href="#slug">` contains the `<img>` cover and a `<div class="tile__caption">` with `<h3>` title and tagline. The link's accessible name is the title, so the hover-only visual still has a full name for assistive tech.
- On hover and `:focus-visible`, the cover scales to 1.04 (clipped by the tile radius), and the caption fades in and translates up from about 0.75rem below over `--t-hover`.
- The caption is frosted: `--surface` at about 88% opacity plus `backdrop-filter: blur(20px)`. It becomes **solid `--surface`** under `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`. Check caption text contrast against the busiest cover.
- **The caption is always visible** under `(hover: none)` (touch), `prefers-contrast: more`, and the no-JS fallback. Keyboard users see it on focus.

### Project modal
```
┌────────────────────────────────────────────── (×) ┐  ← 44px circular close button,
│ ┌──────────────────────────────────────────────┐ │    sticky top-right
│ │            cover (r-inner)                   │ │
│ └──────────────────────────────────────────────┘ │
│ Project title (h2)                               │
│ Project tagline (graphite)                       │
│                                                  │
│ Role       Lorem ipsum        ← <dl>, 2-col grid  │
│ Timeline   Lorem ipsum          (not dot-joined)  │
│ Tools      Lorem, ipsum                          │
│                                                  │
│ Article body ≤ 64ch: h3s, paragraphs, figures…   │
└──────────────────────────────────────────────────┘
```
- Uses one native `<dialog id="project-dialog" aria-labelledby="dialog-title">` opened with `showModal()`. That gives you top layer, inert background, and Esc to close.
- Size `width: min(64rem, 100% − 2·gap)` and `max-height: calc(100dvh − 2·gap)`, with internal scrolling and `--r-panel` corners.
- Below 40em it becomes a full-height sheet: top corners rounded only, and it slides up from the bottom.
- `::backdrop`: `--canvas` at about 60% opacity with `blur(12px)`, solid under reduced transparency.
- Scroll lock: `html:has(dialog[open]) { overflow: hidden; }` together with `scrollbar-gutter: stable` on `html` so the layout doesn't shift.

---

## 3. Motion: the one bold moment (tile → modal)

The memorable moment is the tile growing into the modal. Spend effort here and keep everything else quiet.

- **Open:** if `document.startViewTransition` exists and reduced motion is not set, give the clicked tile's cover and title `view-transition-name: project-cover` / `project-title`, then start the transition. In the update callback, move the details into the dialog, call `showModal()`, remove the names from the tile and put them on the dialog's cover and title. The browser then morphs the tile's cover and title into the modal's, and the backdrop fades in. Style `::view-transition-group(project-cover)` etc. with `--t-open` and `--ease-out`. Clear the names afterward, because they must be unique.
- **Close:** the same thing in reverse, with `--t-close`, landing back on the tile.
- **Fallback (no View Transitions API):** the dialog fades and scales from 0.96 to 1 using `@starting-style` plus `transition-behavior: allow-discrete` on `display`/`overlay`.
- **Reduced motion:** no view transition. The dialog does a 120ms opacity crossfade or appears instantly.
- **Theme change:** a root view-transition crossfade over `--t-theme`, skipped under reduced motion.

---

## 4. Content and copy

- **Name:** Glawen LaFleur. **Title:** Product designer. **Tagline:** "I design interfaces and build them, with accessibility from the first sketch."
- **Bio:** two short lorem ipsum paragraphs, each ≤ 34ch wide.
- **Contact** (an `<address>` holding a `<ul>` of text links, not icon-only): Email (`mailto:`), LinkedIn, GitHub, Résumé (PDF). Use `href="#"` placeholders and mark each one with an HTML comment `<!-- TODO: real URL -->`. The links open in the same tab. If a link is ever changed to `target="_blank"`, it must say "(opens in new tab)" visibly or in its accessible name.
- **Projects:** three placeholders. Each has a lorem title (e.g. "Lorem Ipsum", "Dolor Sit", "Amet Elit"), a one-line lorem tagline, `<dl>` meta for Role, Timeline and Tools, and a lorem article of 3–4 paragraphs with one `<h3>` subsection and one `<figure>` with a `<figcaption>`.
- **Alt text:** decorative or placeholder covers get `alt=""`, because the title already names the link. Real case-study figures need descriptive alt text; leave a TODO comment.
- `<title>` "Glawen LaFleur, product designer". Add a meta description, `<meta name="color-scheme" content="light dark">`, two `theme-color` metas (one per scheme), an SVG favicon (a "GL" monogram in iris), and Open Graph tags with placeholder image.
- Copy voice: sentence case, plain verbs. Controls say exactly what they do ("Close project", "Appearance").

---

## 5. Theme control (system default + override)

- A segmented control at the bottom of the profile: `<fieldset>` with a visible small `<legend>` "Appearance" and three radio inputs: Auto, Light, Dark. Use native radios so arrow keys work for free, styled as a pill-shaped segmented control with the selected segment in iris.
- **Auto is the default** and follows `prefers-color-scheme` live. Nothing is stored for Auto.
- **Light** or **Dark** sets `data-theme` on `<html>` and stores it in `localStorage`. Wrap every read and write in `try/catch`, and fall back to Auto if storage fails.
- A tiny **inline script in `<head>`**, before any CSS, reads the stored value and sets `data-theme` so there's no flash of the wrong theme.
- CSS: `:root { color-scheme: light dark }`, `:root[data-theme=light] { color-scheme: light }`, `:root[data-theme=dark] { color-scheme: dark }`. All tokens use `light-dark()`, so no media-query duplication is needed.

---

## 6. Accessibility requirements (target: WCAG 2.2 AA, AAA where marked)

- **Structure:** `lang="en"`; a "Skip to projects" link that is the first focusable element and becomes visible on focus; landmarks `header.profile`, `main#projects`, `address`; headings h1 (name), h2 (Projects, visually hidden), h3 (tile titles), h2 (dialog title).
- **Text resizing:** everything in rem, em or ch. Must work at browser default font size "Very large" and at 200% and 400% zoom with no clipping or overlap (1.4.4, 1.4.10). No fixed heights on text containers; tiles use `aspect-ratio` but the caption can grow (text spacing, 1.4.12).
- **Contrast:** text AAA (7:1) as specified in §1. Focus ring and control boundaries ≥ 3:1 (1.4.11).
- **Focus:** `:focus-visible { outline: 3px solid var(--iris); outline-offset: 3px; }`. It follows the border-radius and is never removed (2.4.7, 2.4.11/2.4.13).
- **Targets:** ≥ 44×44px for the close button and theme segments, ≥ 24px for everything else (2.5.8).
- **Dialog:**
  - Focus moves to the dialog's h2 (`tabindex="-1"`) on open, so screen readers announce the title.
  - Focus returns to the originating tile on close.
  - Esc, the close button, and a backdrop click (`event.target === dialog`) all close it.
  - `document.title` becomes "{Project}, Glawen LaFleur" while it's open.
- **Deep links and history:** opening pushes `#slug`. Back, Esc and the close button all close it consistently: close via `history.back()` when we pushed the entry, otherwise `replaceState` to clear the hash. Loading the page with `#slug` opens that project without animation. `popstate` keeps the dialog in sync with the URL.
- **Motion:** honor `prefers-reduced-motion` everywhere (§1, §3).
- **Transparency:** `prefers-reduced-transparency` removes blur and translucency.
- **Contrast preference:** `prefers-contrast: more` shows captions solid and always visible, adds `--hairline` borders on tiles, and makes `--graphite` darker.
- **Forced colors** (`forced-colors: active`): tiles and the dialog get `1px solid CanvasText` borders, focus uses `Highlight`, and the theme control's selected state uses `Highlight` + `HighlightText`. Test it in DevTools emulation.
- **No JS:** `<html class="no-js">` is swapped to `js` by the head script. Without JS, each project's details render inline under its tile in a single column, captions are always visible, and the theme follows the system.
- Images have `width`/`height` attributes to prevent layout shift, plus `loading="lazy"` and `decoding="async"`.

---

## 7. Files to create

```
index.html                     Single page; the source of truth for all content
css/
  layers.css                   Declares @layer order: tokens, base, layout, components, states
  tokens.css   @layer tokens   Color (light-dark()), type, space, radius, motion
  base.css     @layer base     Reset, @font-face, typography, links, focus, skip link, .visually-hidden
  layout.css   @layer layout   Page shell, profile panel, grid, breakpoints
  components.css @layer components  Tile, caption, dialog, close button, theme control, dl meta
  states.css   @layer states   Reduced motion/transparency, contrast more, forced colors, no-js
js/
  main.js                      Classic script with `defer` (NOT a module, so file:// still works):
                               theme control, project dialog, view transitions, history/hash sync
assets/
  fonts/hanken-grotesk-latin-wght.woff2, OFL.txt
  img/favicon.svg
  projects/<slug>/cover.svg    Neutral grey placeholder (simple device outline), 1:1
README.md                      Run locally, add a project, swap placeholders, deploy
```
- **Cascade layers** prevent the specificity clashes the skill warns about. Keep selectors as single classes (BEM-ish `.tile__caption`) and never use IDs for styling.
- Give `<link>` tags in `index.html` in layer order. Inline only the theme and no-js head script.

### Project modularity: adding a project = copy one block
Every project lives in `index.html` as one `<li>` in `<ul class="project-grid">`, following this pattern. Put the pattern in an HTML comment at the top of the list so it can be copied:
```html
<li class="project" id="lorem-ipsum">
  <a class="tile" href="#lorem-ipsum">
    <img class="tile__cover" src="assets/projects/lorem-ipsum/cover.svg" alt="" width="800" height="800" loading="lazy" decoding="async">
    <div class="tile__caption">
      <h3 class="tile__title">Lorem Ipsum</h3>
      <p class="tile__tagline">One-line tagline.</p>
    </div>
  </a>
  <div class="project__details">  <!-- moved into the dialog by JS; shown inline without JS -->
    <p class="project__tagline">…</p>
    <dl class="project__meta">…</dl>
    <div class="project__body">…article…</div>
  </div>
</li>
```
- `main.js` reads everything from the DOM. **No JS changes are needed to add a project.**
- The dialog's title and cover are filled from the tile's `.tile__title` and `.tile__cover`.
- Details are **moved, not cloned**, into the dialog and put back on close, so IDs inside articles are never duplicated.
- Document this in README with steps: 1) copy block, 2) set slug in `id`/`href`, 3) add `assets/projects/<slug>/cover.*`, 4) fill content.
- *Tech note for later, not now:* if the case studies grow past about 10, or need their own URLs for SEO, a static site generator like Eleventy would help. **Raise it with the client; don't adopt it.**

---

## 8. Plan reviewed against the brief: defaults avoided

| First instinct / default | Revised to | Why |
|---|---|---|
| Dark `#222` sidebar with acid yellow-green headline (from the reference) | Monochrome, true-black dark mode, iris as the only accent | It's a stock AI-portfolio look, and the client chose monochrome |
| Inter | Hanken Grotesk | The client's choice; crisp like SF without being the default |
| Centered sidebar (wireframe) | Left-aligned | Readability for bio paragraphs, and it matches the Apple reference |
| Fixed 4-column grid | `auto-fit` grid | 3 projects would leave a hole in a 4-column row |
| Identical rounded cards with soft shadows | Radius hierarchy, no resting shadows, elevation only on the modal | Rounded corners are honored without turning into the SaaS-card kit |
| Fade-up entrance on every section | No load animation; one bold morph (tile → modal) | Motion answers actions; boldness is spent in one place |
| Icon-only social links (reference) | Text links including Résumé (PDF) | Clearer for recruiters and screen readers |

---

## 9. Build order

1. Scaffold the files, font and favicon. Write `tokens.css` and `base.css`. Add the head script for theme and no-js.
2. Static HTML: profile, 3 placeholder projects, empty dialog. `layout.css` for all three breakpoints.
3. Tile and caption styles, plus the hover and focus motion.
4. `main.js`: dialog open and close, focus management, hash and history sync, then view transitions, then the fallback.
5. Theme control.
6. `states.css`: reduced motion, transparency, contrast, forced colors, no-js.
7. README.
8. Verification and critique (below). Then do the "remove one accessory" pass: cut one decorative thing that doesn't earn its place.
9. Report to the client with screenshots. **Do not commit unless asked.**

---

## 10. Verification

- **Serve locally:** `python3 -m http.server 8000` from the project root (no install needed).
- **Screenshots and self-critique:** the client asked for this. Use Playwright for headless screenshots, but **ask the client before installing it** (`npx playwright install chromium` downloads a browser). Capture:
  - 1920, 1440, 1024, 768 and 390px wide, in light and dark mode
  - hover and focus state on a tile
  - the modal open on desktop and on mobile
  - 200% zoom
  - forced-colors emulation

  Review each image against this plan and fix issues before reporting.
- **Automated accessibility:** run axe-core (`@axe-core/playwright` or `npx @axe-core/cli`; ask before installing) on the page, with the dialog both closed and open. Expect zero violations. Run Lighthouse accessibility in Chrome DevTools; target 100.
- **Manual checks:**
  - Keyboard only: skip link → tiles → open → Esc → focus returns → theme radios with arrow keys.
  - A quick VoiceOver pass (Cmd+F5): the dialog title is announced and tile names are read.
  - Chrome font size set to "Very large", plus 200% and 400% zoom: no overlap and no horizontal scroll.
  - DevTools rendering emulation for `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` and `forced-colors`.
  - Change the OS appearance while Auto is selected: the page switches live.
  - Choose Dark, reload: no flash of the wrong theme.
  - Load `index.html#dolor-sit` directly: that modal opens. The Back button closes it.
  - Disable JS: content is readable inline.
- **Contrast:** verify every token pair in §1 with a checker, and record the actual ratios in the final report.
