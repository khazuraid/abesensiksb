---
name: Luminous Enterprise
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3e484d'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6e797e'
  outline-variant: '#bdc8ce'
  surface-tint: '#006780'
  primary: '#00647c'
  on-primary: '#ffffff'
  primary-container: '#007f9d'
  on-primary-container: '#fafdff'
  inverse-primary: '#6cd3f7'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#894e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a86516'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b7eaff'
  primary-fixed-dim: '#6cd3f7'
  on-primary-fixed: '#001f28'
  on-primary-fixed-variant: '#004e61'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdcbf'
  tertiary-fixed-dim: '#ffb873'
  on-tertiary-fixed: '#2d1600'
  on-tertiary-fixed-variant: '#6a3b00'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
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
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 40px
  margin-tablet: 24px
  margin-mobile: 16px
  max-width: 1440px
---

## Brand & Style

The design system is engineered for high-density enterprise environments where clarity, precision, and long-term legibility are paramount. This design system transitions from a purely digital-native look to a professional, "Paper-Tech" aesthetic—merging the tactile reliability of physical documents with the efficiency of modern SaaS.

The visual style is **Modern Corporate** with a sophisticated **Glassmorphic** overlay. It utilizes heavy whitespace to reduce cognitive load and subtle depth cues to guide the user's focus. The emotional response is one of calm authority and systematic organization. It is designed for users who spend hours in data-rich environments and require a UI that stays out of their way while remaining aesthetically refined.

## Colors

The palette is anchored by a high-contrast foundation to ensure WCAG AA compliance across all data visualizations and text hierarchies.

- **Primary (Cyan):** Used for primary actions, active states, and focus indicators. Optimized for a light background to maintain vibrance without causing eye strain.
- **Secondary (Emerald):** Reserved for success states, growth indicators, and positive data trends.
- **Neutral (Slate/Charcoal):** The backbone of the system. Used for text, iconography, and structural borders.
- **Background & Surface:** The base is a very light slate (#F8FAFC), providing a soft "cool" temperature that prevents the harshness of pure #FFFFFF white. Interactive surfaces are pure white to create a clear "lift" from the background.

## Typography

This design system uses **Outfit** exclusively to maintain a modern, geometric, yet highly readable atmosphere. 

- **Headlines:** Use a slightly tighter letter-spacing and heavier weights to command attention and create clear sections.
- **Body Text:** Optimized for long-form reading with generous line heights (1.5x) and a charcoal color (#1E293B) that reduces the "vibration" often seen with pure black text on white.
- **Labels:** Set in semi-bold with increased letter-spacing for metadata and micro-copy, ensuring they remain distinct from body content.

## Layout & Spacing

The layout follows a strict **8px grid system**, ensuring consistent alignment across all components.

- **Grid Model:** A 12-column fluid grid is used for desktop, scaling down to 8 columns for tablets and 4 columns for mobile.
- **Gutter & Margins:** Gutters are fixed at 24px to provide ample "air" between content blocks. External margins compress as the viewport shrinks to maximize screen real estate on mobile devices.
- **Content Density:** In enterprise views (tables/dashboards), a "Compact" spacing variant is permitted, reducing the base unit from 8px to 4px for internal padding, while maintaining the global 8px rhythm for external component positioning.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and tonal layering rather than heavy shadows.

- **Surface Layers:** Surfaces use a white background with a subtle backdrop blur (8px to 12px) and a very thin, low-opacity neutral border (1px, #E2E8F0).
- **Shadows:** Only used for floating elements like dropdowns or modals. These are "Ambient Shadows"—large blur radius (24px+), very low opacity (4-6%), and tinted with the Primary color to maintain a cohesive atmospheric light.
- **Active States:** Depth is often communicated through "inset" looks or a slight shift in background color to #F1F5F9, rather than raising the element.

## Shapes

The shape language is defined by the **"Round Eight"** philosophy, where the standard corner radius is 8px (0.5rem).

- **Standard (8px):** Buttons, Input Fields, and Cards. This creates a balance between the efficiency of a square and the friendliness of a circle.
- **Large (16px):** Used for large container elements and modals to emphasize a soft, modern enclosure.
- **Extra Large (24px):** Reserved for decorative elements or feature cards.
- **Sharp (0px):** Never used for UI containers; only used for data visualization bars or separators.

## Components

- **Buttons:** Primary buttons use a solid Cyan (#0891B2) fill with white text. Secondary buttons use a white background with a 1px Slate-200 border and Cyan text. All buttons feature a subtle transition on hover, deepening the hue slightly.
- **Input Fields:** Backgrounds are white with a 1px #E2E8F0 border. Upon focus, the border transitions to Primary Cyan with a 2px outer glow (ghost border).
- **Chips:** Highly rounded (pill-shaped) with a light tinted background (e.g., Primary at 10% opacity) and full-strength text color for high legibility.
- **Cards:** White surfaces, 8px corner radius, and a 1px #E2E8F0 border. No shadow is applied unless the card is "Interactive" or "Draggable," in which case a soft ambient shadow appears on hover.
- **Data Tables:** Alternate row striping is avoided in favor of thin #F1F5F9 horizontal dividers. Header rows are slightly darker (#F8FAFC) with uppercase label-sm typography.