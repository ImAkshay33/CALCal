---
name: Botanical Ledger
colors:
  surface: '#fff8ef'
  surface-dim: '#e1d9c9'
  surface-bright: '#fff8ef'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf3e2'
  surface-container: '#f5eddd'
  surface-container-high: '#f0e7d7'
  surface-container-highest: '#eae2d2'
  on-surface: '#1f1b12'
  on-surface-variant: '#424843'
  inverse-surface: '#343025'
  inverse-on-surface: '#f8f0e0'
  outline: '#727973'
  outline-variant: '#c2c8c1'
  surface-tint: '#496553'
  primary: '#082417'
  on-primary: '#ffffff'
  primary-container: '#1f3a2b'
  on-primary-container: '#86a490'
  inverse-primary: '#afceb9'
  secondary: '#6000d9'
  on-secondary: '#ffffff'
  secondary-container: '#7b2cff'
  on-secondary-container: '#ebdfff'
  tertiary: '#0d2318'
  on-tertiary: '#ffffff'
  tertiary-container: '#23392c'
  on-tertiary-container: '#8aa392'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbead4'
  primary-fixed-dim: '#afceb9'
  on-primary-fixed: '#052013'
  on-primary-fixed-variant: '#314d3d'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d1bcff'
  on-secondary-fixed: '#24005b'
  on-secondary-fixed-variant: '#5800c8'
  tertiary-fixed: '#cfe9d6'
  tertiary-fixed-dim: '#b3cdbb'
  on-tertiary-fixed: '#092014'
  on-tertiary-fixed-variant: '#354c3e'
  background: '#fff8ef'
  on-background: '#1f1b12'
  surface-variant: '#eae2d2'
  forest-green: '#1f3a2b'
  deep-green: '#142a1e'
  linen-beige: '#e7dfcf'
  lighter-beige: '#f0eadc'
  ink: '#1a2620'
  electric-purple: '#7b2cff'
typography:
  display-numeral:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-numeral-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Bricolage Grotesque
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: -0.01em
  card-numeral:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Instrument Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Instrument Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Instrument Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Instrument Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Instrument Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Instrument Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is built for CALCal, a mobile-first (390px) calorie, macro, and micronutrient tracker with deep support for Indian home cooking and regional dishes. The personality is calm, confident, and food-first—replacing clinical diet-app anxiety with the grounded warmth of a personal kitchen ledger.

The visual language blends **Minimalism** with **Modern Editorial Data Design**:
- **Calm, grounded surfaces:** Warm linen and lighter beige cards sit on a quiet canvas, anchored by deep forest-green header panels and bottom navigation.
- **Numerals as focal points:** Large, expressive tabular-friendly numerals communicate daily energy, macro targets, and micronutrient progress at a glance without visual clutter.
- **Strict restraint:** No gradients, no stock food photography, no all-caps eyebrow labels, and minimal iconography. Labels are always sentence-case.
- **Surgical accenting:** Electric purple is reserved exclusively for the primary action button and data highlights (progress fills, ring gauges, and chart lines), ensuring every interactive focal point and metric reads immediately.

## Colors

The palette pairs organic, botanical greens and warm linen neutrals with a single high-energy electric purple accent.

- **Page & Card Surfaces:** `linen-beige` (`#e7dfcf`) serves as the primary page background. `lighter-beige` (`#f0eadc`) elevates content cards and data modules without relying on drop shadows.
- **Structural Anchors:** `forest-green` (`#1f3a2b`) grounds header panels and the bottom navigation bar, while `deep-green` (`#142a1e`) provides a darker tonal step for pressed states, active nav containers, or secondary dark surfaces.
- **Typography:** `ink` (`#1a2620`) is used for all primary text on light surfaces, maintaining crisp readability. On `forest-green` surfaces, text shifts to `lighter-beige` (`#f0eadc`).
- **Strict Purple Rule:** `electric-purple` (`#7b2cff`) must be used **only** for the main action button (e.g., logging a meal) and data highlights (progress bar fills, ring gauges, and chart lines). Never use it for decorative backgrounds, secondary links, or body text.
- **No Gradients:** All fills are flat, solid colors.

## Typography

The typographic hierarchy pairs **Bricolage Grotesque** (bold) for large numerals and headings with **Instrument Sans** for body copy, food names, and UI labels.

- **Numerals First:** `display-numeral` and `card-numeral` are the visual anchors of every screen, presenting daily calorie budgets, macro grams, and micronutrient percentages with immediate clarity.
- **Sentence-Case Discipline:** All headings, card titles, navigation items, and micro-labels must use **sentence case** (e.g., "Today's intake", "Protein target", "Dal tadka"). Never use all-caps eyebrow labels.
- **Mobile Scaling:** On the 390px mobile canvas, `display-numeral-mobile` (36px) replaces `display-numeral` (48px) when space is constrained, keeping hero summaries balanced without wrapping.

## Layout & Spacing

This design system uses a **4-column fluid grid** optimized for a **390px mobile-first viewport**, with `1rem` (16px) outer margins and `0.75rem` (12px) gutters between cards and data modules.

- **Mobile (390px default):** Single-column stacked cards for primary summaries (daily calories, meal log) and 2-column paired cards for macro/micronutrient breakdowns.
- **Tablet & Desktop Adaptation:** At `768px` and above, the layout expands to an 8-column or 12-column centered container (`max-width: 960px`) with `1.5rem` margins, allowing summary cards and trend charts to sit side by side.
- **Rhythm:** Card internal padding uses `space-md` (16px) to `space-lg` (20px) so dense nutritional data feels airy and scannable.

## Elevation & Depth

Hierarchy is achieved almost entirely through **tonal layers** rather than shadows or heavy borders.

- **Tonal Surface Stacking:** `lighter-beige` (`#f0eadc`) cards sit directly on the `linen-beige` (`#e7dfcf`) canvas, creating clear separation without visual noise.
- **Minimal Borders:** Where subtle containment is needed (such as empty progress tracks or input fields), use a low-opacity `ink` (`#1a2620`) border at 10–12% opacity.
- **Floating Action Shadows Only:** Drop shadows are strictly prohibited on cards, headers, and list items. Only floating buttons (such as a floating primary log action) may carry a soft, diffused shadow (`0 8px 20px rgba(20, 42, 30, 0.18)`).

## Shapes

The shape language is generous and tactile, with rounded corners ranging from **12px to 28px** across the interface:
- **Cards & Data Modules:** `20px` to `24px` (`1.25rem`–`1.5rem`) corner radius for a soft, approachable ledger feel.
- **Header Panels & Bottom Nav:** `24px` to `28px` (`1.5rem`–`1.75rem`) on floating or anchored container edges.
- **Inputs & List Rows:** `12px` to `16px` (`0.75rem`–`1rem`) for food search bars and interactive rows.
- **Buttons & Pills:** Full pill (`9999px`) for primary action buttons and compact filter chips.

## Components

- **Primary Action Button:** Pill-shaped (`9999px`), filled with `electric-purple` (`#7b2cff`), `lighter-beige` (`#f0eadc`) label in `label-lg` sentence case. Carries a soft shadow only when floating.
- **Secondary & Ghost Buttons:** Transparent or `deep-green` (`#142a1e`) tinted pills with `ink` or `lighter-beige` text. Never use `electric-purple` for secondary actions.
- **Data Cards:** `lighter-beige` (`#f0eadc`) background, `20px`–`24px` rounded corners, `16px`–`20px` padding, zero shadow. Feature a sentence-case title, a large `Bricolage Grotesque` numeral, and `electric-purple` progress bars or line charts.
- **Progress Bars & Ring Gauges:** Track in `ink` at 10% opacity; active fill in solid `electric-purple` (`#7b2cff`) with rounded caps.
- **Food Log List Items:** Clean rows with `12px`–`16px` radius on hover/tap, displaying the Indian dish name (e.g., "2 rotis, 1 katori dal"), serving size in `body-sm`, and calorie count right-aligned in `Bricolage Grotesque` bold. No stock food photos.
- **Chips:** `12px`–`9999px` rounded pills for meal filters (Breakfast, Lunch, Dinner, Chai & snacks) using `linen-beige` or `forest-green` active states.
- **Input Fields:** `12px`–`16px` rounded, `lighter-beige` fill with a subtle 10% `ink` border, `Instrument Sans` placeholder text in sentence case.
- **Checkboxes & Radio Buttons:** `6px` rounded square checkboxes and circular radios with `forest-green` (`#1f3a2b`) selected states.
- **Bottom Navigation:** Anchored `forest-green` (`#1f3a2b`) bar with four sentence-case destinations: **Today**, **Progress**, **Foods**, **Settings**, paired with minimal line icons.