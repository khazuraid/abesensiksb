---
name: Obsidian ADMS
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff7f8b'
  on-tertiary-container: '#7d0023'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
  surface-glass: rgba(30, 41, 59, 0.7)
  border-glass: rgba(255, 255, 255, 0.1)
  text-dim: '#94a3b8'
  glow-cyan: rgba(6, 182, 212, 0.15)
  glow-emerald: rgba(16, 185, 129, 0.15)
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  sidebar-width: 260px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for a high-stakes enterprise environment where reliability and real-time data clarity are paramount. The brand personality is **authoritative, futuristic, and precise**, evoking a sense of a high-tech "command center."

The chosen style is **Premium Glassmorphism mixed with Corporate Modernism**. It utilizes deep layers of charcoal to provide a sophisticated backdrop, allowing vibrant functional accents (Emerald, Cyan, Rose) to guide the user's eye toward critical status changes. UI elements feature semi-transparent surfaces with backdrop blurs, creating a sense of depth and hierarchy without the clutter of heavy solid blocks. Thin, low-opacity borders define structure, while soft glowing shadows emphasize active or elevated states, mimicking the aesthetic of modern high-end software tools.

## Colors

The palette is anchored by **Deep Charcoal (#0f172a)** for the primary background, ensuring maximum contrast for data visualization. 

- **Primary (Cyan - #06b6d4):** Used for primary actions, navigation highlights, and active selection states.
- **Secondary (Emerald - #10b981):** Reserved for "Success" states, "Online" status indicators, and positive attendance metrics.
- **Tertiary (Rose - #f43f5e):** Dedicated to "Error" states, "Offline" devices, and critical alerts.
- **Neutral:** A range of slates derived from the background color are used for secondary text and structural lines.

The design utilizes transparency extensively. Surfaces should use `surface-glass` with a `backdrop-filter: blur(12px)` to maintain legibility over background elements.

## Typography

This design system employs a dual-font strategy: **Outfit** for headlines to provide a modern, geometric character, and **Inter** for body and UI labels to ensure maximum legibility in data-heavy views.

- **Headlines:** Should use tighter letter-spacing and heavier weights to maintain a strong presence.
- **Body & Data:** Use Inter for all data tables and logs. 
- **Monospace:** For ADMS raw logs and technical device IDs, use a secondary monospaced font (JetBrains Mono) to ensure character alignment and technical clarity.
- **Mobile Scaling:** For mobile devices, `display-lg` should scale down to `32px` and `headline-lg` to `24px` to maintain screen integrity.

## Layout & Spacing

The layout follows a **Fixed-Fluid hybrid model**. The sidebar remains fixed at `260px`, while the main content area fluidly expands up to a `1440px` max-width.

- **Grid:** A 12-column grid is used for dashboard layouts. Data cards typically span 3 columns (desktop) or 6 columns (tablet).
- **Density:** High-density spacing is required for data tables. Row heights should be kept at a compact `40px` to `48px` to maximize information visibility without sacrificing touch targets.
- **Breakpoints:**
  - **Mobile:** < 768px (Single column, hidden sidebar via hamburger menu).
  - **Tablet:** 768px - 1024px (2-column card layouts, collapsed sidebar).
  - **Desktop:** > 1024px (Full layout).

## Elevation & Depth

Hierarchy is achieved through **Tonal Layering** and **Backdrop Blurs** rather than traditional heavy shadows.

1.  **Level 0 (Base):** Deep Charcoal (#0f172a).
2.  **Level 1 (Cards/Sidebar):** `surface-glass` with a 1px `border-glass` stroke. This creates the "frosted" look.
3.  **Level 2 (Popovers/Modals):** Darker semi-transparent fill with a subtle `glow-cyan` outer shadow (0px 4px 20px) to indicate high priority.

All glass elements must include `backdrop-filter: blur(12px)` to prevent text from clashing with background patterns or charts. Use "Ghost Borders" (1px white at 10% opacity) on all interactive containers.

## Shapes

The design system uses a **Rounded (0.5rem base)** shape language. This balances the professional enterprise feel with a modern, approachable aesthetic.

- **Buttons & Inputs:** `rounded` (8px).
- **Cards & Modals:** `rounded-lg` (16px).
- **Status Indicators:** Fully rounded (pill/circle) for pulsing dots and status chips.
- **Sidebar Items:** `rounded` (8px) with a 4px horizontal margin from the sidebar edge to create a floating effect.

## Components

### Sleek Data Cards
Cards should feature a subtle gradient background from top-left to bottom-right (e.g., Slate-900 to Slate-950). Include a small icon in the top right with a soft glow in the color of the metric's status (Cyan or Emerald).

### High-Density Data Tables
Inspired by shadcn/ui, use `Inter` at 14px for table cells. Headers should be `label-md` with `text-dim` color. Zebra striping is discouraged; use subtle 1px border-bottoms (`border-glass`) instead. On hover, rows should brighten slightly to `#1e293b`.

### Real-Time Status Indicators
Use a "Pulsing Dot" component for device status.
- **Online:** Emerald dot with a 2s infinite pulse animation (radial shadow expansion).
- **Offline:** Static Rose dot.
- **Processing:** Cyan dot with a rotating spinner border.

### Sidebar Navigation
The sidebar should be a semi-transparent blur layer. Nav items use `ghost` style by default, turning `Cyan` (background at 10% opacity) with a solid Cyan left-accent bar (3px) when active.

### Input Fields
Inputs should have a dark background (`#020617`), a 1px `border-glass` stroke, and a `Cyan` glow on focus. Labels should always be visible above the field in `label-md` style.

### Interactive Buttons
- **Primary:** Solid Cyan with white text.
- **Secondary:** Transparent with `border-glass` and a hover state that increases the backdrop-blur intensity.
- **Critical:** Outline Rose for "Delete" or "Clear Log" actions.