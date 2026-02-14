# UI/UX Improvement Audit Report

**Project:** Memory Driver Launch  
**Audit date:** 2026-02-14  
**Scope:** All user-facing pages (Home, Registration, Ambassador flow, Success, 404, global layout)

---

## 1. UI System Overview

### Framework & styling approach

- **No Tailwind or component library.** Styling is plain **global CSS** with a small set of route-scoped files.
- **CSS files:**
  - **`src/routes/index.css`** – Design system (CSS custom properties), home layout, header, footer, promo sections, CTA buttons, skip link, responsive and reduced-motion rules. **Imported by:** `index.tsx`, `registration.tsx`, `ambassador.register.tsx`, `ambassador.success.tsx`, `success.tsx`.
  - **`src/routes/registration.css`** – Form and registration-specific styles (fields, labels, errors, validation popup, success block, back link). **Imported by:** `registration.tsx`, `ambassador.register.tsx`, `ambassador.success.tsx`, `success.tsx`.
  - **`src/routes/App.css`** – **Not imported by any route.** Leftover Vite/React boilerplate (#root, .logo, .card, logo-spin). Safe to remove or ignore.
- **Root layout:** `src/routes/__root.tsx` – Renders `<html>`, `<body>`, `<Outlet />`, and Scripts. No shared header/footer; each page implements its own layout using the same class names (`home-page`, `home-header`, `home-footer`, etc.).

### Design tokens (from `index.css`)

```css
:root {
  --evon-navy: #091F38;
  --evon-accent: #D4480D;
  --evon-button: #2563eb;
  --evon-button-hover: #1d4ed8;
  --evon-bg: #ffffff;
  --evon-text: #091F38;
  --evon-text-muted: #3d5a6c;
  --evon-border: #e8eef2;
  --evon-focus-ring: #D4480D;  /* defined but never used in forms */
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
}
```

### Key UI components and where they live

| Component / area        | Location | Notes |
|-------------------------|----------|--------|
| Global layout shell     | Each page (index, registration, ambassador.register, success, ambassador.success) | Same structure: `.home-page` > skip link, `.home-header`, `main`, `.home-footer`. Header = logo only; no nav links. |
| Header / nav            | Inline in each route | Logo only; no nav bar or active-state. |
| Footer                  | Inline in each route | Single link “Memory Driver” to evonmedics.com. |
| Home promo sections     | `index.tsx` + `index.css` | Two sections: Premier (text card + CTA), Ambassador (image card + CTA). |
| CTA buttons             | `index.css` (`.cta-button`) | Blue primary; hover/active/focus-visible. |
| Forms                   | `registration.tsx`, `ambassador.register.tsx` + `registration.css` | Shared `.registration-form`, `.field`, `.field-error`, `.registration-form-error`. |
| Success content         | `success.tsx`, `ambassador.success.tsx` | Same `.registration-success` block; copy differs. |
| 404                     | `__root.tsx` | Inline styles only; does not use design tokens or shared CSS. |

### Typography

- **Font:** `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` (no custom font).
- **Sizes:** 16px body; headings 1.25rem–1.5rem; labels/CTAs 1rem–1.125rem.
- **Line height:** 1.5 global; 1.3 for headings; 1.6 for paragraphs.

### Spacing and containers

- **Main content:** `max-width: 1200px`, `margin: 0 auto`, `padding: 0 1.5rem 3rem` (home main).
- **Form container:** `max-width: 560px`, `margin: 0 auto`, `padding: 2rem 0` (`.registration-inner`).
- **Promo cards:** `flex: 1 1 280px`, `max-width: 480px`; gap `2rem` between sections.

### Responsiveness

- Single breakpoint: `@media (max-width: 640px)` in `index.css` – promo sections stack, padding reduced. Form and registration layout are fluid (no additional breakpoints).

### Animation / transitions

- Skip link: `transition: top 0.2s`.
- CTA: `transition: background-color 0.2s, transform 0.1s`; active `transform: scale(0.98)`.
- `@media (prefers-reduced-motion: reduce)` disables CTA transition.

### Accessibility (current)

- Skip link present; `focus` moves it into view; `focus-visible` on logo, CTAs, footer link, back link.
- Form: `aria-required`, `aria-invalid`, `aria-describedby` (registration.tsx; ambassador step 1 missing `aria-describedby` for some fields), `role="alert"` on errors and submit error.
- Validation popup: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` / `aria-describedby`; OK button has `autoFocus`. No focus trap or return-to-trigger documented in code.

---

## 2. Top Issues Found

### 2.1 Broken or missing asset (Home)

- **Where:** `src/routes/index.tsx` line 48: `src={...'ambassador_card_image.png'}`.
- **Evidence:** Repo has `public/ambassador_card _image.png` (space before `_image`). Code expects `ambassador_card_image.png`. Result: 404 and broken image on the Ambassador promo card unless deployment renames the file or the code is updated.
- **Ref:** `sst.config.ts` references `ambassador_card_image.png` (no space).

### 2.2 Form inputs: no visible keyboard focus indicator

- **Where:** `src/routes/registration.css` lines 84–88.
- **Code:** `outline: none` and only `border-color: var(--evon-accent)` on `:focus`. There is no `:focus-visible` rule for inputs/select/textarea.
- **Why it matters:** Keyboard users need a clear focus ring; border-only change can be weak or missed, and `--evon-focus-ring` is never used.

### 2.3 Registration and Ambassador flows: no page title or context heading

- **Where:** `registration.tsx`, `ambassador.register.tsx`.
- **Evidence:** `.registration-title`, `.registration-event-details`, `.registration-instructions` exist in `registration.css` but are **not used** in any route. The registration form and ambassador steps render with no H1 or introductory text (e.g. “Register for Memory Driver Premier”, “Ambassador sign-up – Step 1 of 2”). This hurts hierarchy and screen-reader navigation.

### 2.4 Ambassador flow: no step indicator

- **Where:** `ambassador.register.tsx` (step 1 and step 2).
- **Evidence:** Step is driven by URL (`?step=1` / `?step=2`) but there is no visible “Step 1 of 2” / “Step 2 of 2” or progress indicator. Users may not understand they are in a multi-step flow.

### 2.5 Success pages: identical layout, no distinct success treatment

- **Where:** `success.tsx`, `ambassador.success.tsx`.
- **Evidence:** Both use the same `.registration-success` block (heading + paragraph + link). No icon, no visual distinction from a generic content block; success state is conveyed only by copy.

### 2.6 404 page: outside design system

- **Where:** `src/routes/__root.tsx` (NotFoundComponent).
- **Evidence:** Inline styles and no use of `--evon-*` or shared CSS. Inconsistent look and no reuse of focus/skip patterns.

### 2.7 Unused / dead CSS

- **Where:** `src/routes/App.css` (entire file); `--evon-focus-ring` in `index.css`; `.registration-title`, `.registration-event-details`, `.registration-instructions` in `registration.css` (defined but unused in JSX).

### 2.8 Secondary CTA styling

- **Where:** `registration.css` lines 134–140.
- **Evidence:** `.cta-button-secondary` is styled the same as primary (blue background). Used for “Back” on ambassador step 2; “Back” is secondary and could be visually de-emphasized (e.g. outline or muted fill).

### 2.9 Validation popup: focus trap and Escape

- **Where:** `ambassador.register.tsx` (validation overlay).
- **Evidence:** Dialog has correct ARIA and autoFocus on OK. No focus trap (tab could leave dialog) and no Escape-to-close. Standard modal behavior is incomplete.

---

## 3. Phase 2 – UI/UX Assessment (Evidence-based)

### A) Visual hierarchy and layout

- **Headers/sections:** Home has clear section headings (h3) and `aria-labelledby`. Registration and Ambassador have no page-level heading; form is the first content.
- **Containers:** Main 1200px and form 560px are consistent; alignment is centered and predictable.
- **Whitespace:** Section padding (e.g. 3rem) and form gap (1.25rem) are adequate; no obvious cramping.
- **CTAs:** Single primary CTA per section; size and contrast (blue on white) make them prominent. Not overwhelming.

**Verdict:** Good on home; weak on form pages due to missing titles.

### B) Navigation and footer

- **Nav:** Logo-only header, no nav links. No active state (N/A).
- **Footer:** Same single link on all pages; aligned and minimal. No layout issues.

**Verdict:** Simple and consistent; no navigation confusion.

### C) Forms (most important)

- **Labels:** Present and associated with inputs; required marked with `(*)` and `aria-hidden="true"`. Optional “at least one” for social URLs is text-only (`.registration-label`).
- **Errors:** Inline `.field-error` and top-level `.registration-form-error`; both `role="alert"`. Error color `#c53030`; border on invalid fields. Clear.
- **Grouping:** Ambassador step 2 groups social URLs under one label; optional fields are grouped logically.
- **Validation:** Inline (on change/blur) plus on submit; step 1 blocks “NEXT” with validation popup. Good.
- **Success:** Success pages are clear but generic (no icon, no strong visual confirmation).
- **Loading:** Submit button shows “Registering…” and `aria-busy`; disabled state styled (opacity 0.7). Good.

**Verdict:** Forms are usable and accessible except for input focus indicator and missing page/step context.

### D) Consistency

- **Buttons:** `.cta-button` used site-wide; primary style consistent. Secondary is same as primary (see 2.8).
- **Inputs:** Same field height (48px), border, radius, error style across registration and ambassador.
- **Icons:** None used (no icon library).
- **Cards:** Home promo cards and validation popup use same border/radius/shadow language; consistent.

**Verdict:** Mostly consistent; secondary button and unused class names are the main gaps.

### E) Mobile and responsiveness

- **Overflow:** No horizontal scroll observed from CSS; containers are fluid.
- **Tap targets:** CTA min-height 48px, inputs min-height 48px – good.
- **Images:** Logo and ambassador image use max-width/max-height and object-fit; no obvious scaling issues. Ambassador image 404 is a content/deploy issue, not a layout one.

**Verdict:** Adequate for mobile; no critical layout or tap issues found in code.

### F) Accessibility improvements

- **Keyboard/focus:** Skip link, logo, CTAs, footer link, back link have `focus-visible`. Form inputs have **no** `focus-visible` ring (only border change and `outline: none`). Checkbox uses browser default + accent-color.
- **Contrast:** Not measured with a tool. `--evon-text` and `--evon-navy` on white should be strong; `--evon-text-muted` (#3d5a6c) and `--evon-accent` (#D4480D) on white should be checked (WCAG AA 4.5:1 for normal text).
- **ARIA:** Labels, required, invalid, describedby used in registration; ambassador step 1 missing some `aria-describedby` for error IDs. Error messages are announced via role="alert".
- **Dialog:** Focus trap and Escape key not implemented for validation popup.

**Verdict:** Good baseline; input focus and dialog behavior are the main a11y gaps.

### G) Trust and polish

- **Microcopy:** Tone is consistent and professional (“Registration Successful!”, “Please fix the following”).
- **Motion:** Only CTA transition and skip-link; reduced-motion respected. No loading skeletons or success animation.
- **Hover:** Buttons and footer link have hover states; inputs do not (border-only on focus).
- **Empty/edge:** No explicit empty states; 404 is minimal. Submit error is a single block of text.

**Verdict:** Adequate; room for light polish (e.g. success icon, secondary button style).

---

## 4. Prioritized Recommendations

### Priority 0 (Must fix)

| # | What to change | Why | Where | Effort | Risk |
|---|----------------|-----|--------|--------|------|
| P0-1 | Fix ambassador card image: either rename asset to `ambassador_card_image.png` or update code to match actual filename (e.g. `ambassador_card _image.png`). | Prevents broken image on home. | `public/` asset name and/or `src/routes/index.tsx` (and any deploy config that references the file). | S | Low |
| P0-2 | Add visible keyboard focus for form controls: use `:focus-visible` with `outline` (e.g. 2px solid `var(--evon-focus-ring)` + offset) and keep or soften `:focus` border so keyboard users always see a clear ring. Remove or override `outline: none` only for focus-visible if needed. | Required for WCAG 2.4.7 (Focus Visible) and keyboard usability. | `src/routes/registration.css` (input/select/textarea focus rules). | S | Low |

### Priority 1 (High value / low effort)

| # | What to change | Why | Where | Effort | Risk |
|---|----------------|-----|--------|--------|------|
| P1-1 | Add a page title (e.g. H1) and optional short intro to registration: “Register for Memory Driver Premier” and one line of instructions. Use existing `.registration-title` / `.registration-instructions`. | Clear hierarchy and context; better a11y and SEO. | `src/routes/registration.tsx` (above form). | S | Low |
| P1-2 | Add step indicator to ambassador flow: e.g. “Step 1 of 2” / “Step 2 of 2” or a simple progress indicator above the form. | Reduces confusion in multi-step flow. | `src/routes/ambassador.register.tsx` (top of form area). | S | Low |
| P1-3 | Style secondary button (Back) differently: outline or muted background so it’s clearly secondary to “Register”. | Clearer primary vs secondary action. | `src/routes/registration.css` (`.cta-button-secondary`). | S | Low |
| P1-4 | Add an H1 to ambassador step 1 and step 2 (e.g. “Ambassador sign-up” + step text). | Same as P1-1 for ambassador. | `src/routes/ambassador.register.tsx`. | S | Low |
| P1-5 | Add `aria-describedby` on ambassador step 1 inputs to point to each field’s error `id` when present (match pattern used in registration.tsx). | Aligns a11y with registration form. | `src/routes/ambassador.register.tsx` (input elements and error span ids). | S | Low |
| P1-6 | Run contrast check on `--evon-text-muted` and `--evon-accent` (and error red) on white; adjust if below WCAG AA. | Ensures readability and compliance. | `src/routes/index.css` / `registration.css` (tokens and error colors). | S | Low |

### Priority 2 (Polish)

| # | What to change | Why | Where | Effort | Risk |
|---|----------------|-----|--------|--------|------|
| P2-1 | Style 404 page with design tokens and shared layout (e.g. same header/footer or minimal shell) and remove inline styles. | Consistency and maintainability. | `src/routes/__root.tsx` (NotFoundComponent); optionally import `index.css`. | S | Low |
| P2-2 | Add a success icon or short visual (e.g. checkmark) to success pages. | Stronger confirmation and trust. | `success.tsx`, `ambassador.success.tsx`; add an inline SVG or small image and style in `registration.css`. | S | Low |
| P2-3 | Validation dialog: trap focus inside until “OK” and close on Escape. | Standard modal behavior and a11y. | `src/routes/ambassador.register.tsx` (useEffect + keydown + refs, or a small helper). | M | Low |
| P2-4 | Add subtle transition to form error appearance (e.g. opacity or max-height). | Softer feedback. | `src/routes/registration.css` (`.field-error`, `.registration-form-error`). | S | Low |
| P2-5 | Remove or repurpose dead CSS: delete `App.css` if unused; use or remove `.registration-title` / `.registration-event-details` / `.registration-instructions`; consider using `--evon-focus-ring` for input focus. | Less dead code, clearer intent. | `App.css`, `registration.css`, `index.css`. | S | Low |

---

## 5. Quick Wins Checklist (10–15 items)

- [ ] **P0-1** Fix ambassador card image filename (code vs asset).
- [ ] **P0-2** Add `:focus-visible` outline for all form inputs/select/textarea.
- [ ] **P1-1** Add registration page title (H1) and optional instructions.
- [ ] **P1-2** Add “Step 1 of 2” / “Step 2 of 2” (or progress) to ambassador flow.
- [ ] **P1-3** Restyle “Back” button as secondary (outline or muted).
- [ ] **P1-4** Add H1 to ambassador step 1 and step 2.
- [ ] **P1-5** Add `aria-describedby` for ambassador step 1 field errors.
- [ ] **P1-6** Verify and fix contrast for muted text and accent (and errors) on white.
- [ ] **P2-1** Style 404 with design system (no inline styles).
- [ ] **P2-2** Add success icon or visual to success pages.
- [ ] **P2-3** Trap focus and Escape-to-close in validation popup.
- [ ] **P2-4** Optional: subtle transition for error messages.
- [ ] **P2-5** Remove or use dead CSS (App.css, unused registration classes, --evon-focus-ring).

---

## 6. Local validation note

- **Dev server:** `npm run dev` was run successfully. App is available at **http://localhost:3001/mdlaunch/** (base path `/mdlaunch/`).
- **Screens validated in this audit:** Code and CSS only. No live browser or device testing was performed for this report. Recommended: manually check home, `/registration`, `/ambassador/register?step=1`, `/ambassador/register?step=2`, `/success`, `/ambassador/success`, and 404 at desktop and mobile widths (e.g. 375px) to confirm layout, focus order, and image loading.

---

*End of report. No design system or framework was assumed; findings are based on the current codebase and styles.*
