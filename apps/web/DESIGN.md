# Design System: ADMS Enterprise

## 1. Visual Theme & Atmosphere
A highly dense, dark-mode cockpit interface for enterprise attendance management. The atmosphere is mechanical, precise, and high-tech—resembling a server control room. It employs heavy asymmetric bento-box layouts, severe contrasts, and zero-gravity glassmorphism surfaces suspended over a deep void.

## 2. Color Palette & Roles
- **Void Background** (`#09090b`) — The absolute background (Zinc 950)
- **Glass Surface** (`rgba(24, 24, 27, 0.5)`) — Card and container fill (Zinc 900 / 50% opacity)
- **Primary Ink** (`#fafafa`) — Primary text, display headings (Zinc 50)
- **Muted Steel** (`#a1a1aa`) — Secondary text, metadata, table headers (Zinc 400)
- **Whisper Border** (`rgba(255, 255, 255, 0.1)`) — Structural lines, card borders
- **Cyan Accent** (`#06b6d4`) — Primary CTA, active states, focus rings (Cyan 500)
- **Emerald Accent** (`#10b981`) — Success states, online indicators
- **Rose Alert** (`#f43f5e`) — Offline devices, late arrivals

*(No purple, no neon gradients, no pure black `#000000`)*

## 3. Typography Rules
- **Display:** `Outfit` — Track-tight, controlled scale, weight-driven hierarchy
- **Body:** `Inter` — Relaxed leading, neutral secondary color
- **Mono:** `JetBrains Mono` — For SNs, timestamps, raw ADMS payload logs, and high-density numbers

## 4. Component Stylings
* **Cards:** Glassmorphic (`backdrop-blur-xl`). 1px whisper border. Sharp hover transitions.
* **Badges (Pills):** Translucent background (`bg-[color]/10`) with sharp border (`border-[color]/20`).
* **Icons:** Material Symbols or Lucide icons, sharp and thin (`strokeWidth={1.5}`).

## 5. Layout Principles
Grid-first responsive architecture using Tailwind CSS grid.
Asymmetric Bento Box splits for the Dashboard.
Strict single-column collapse below `768px`.
No flexbox percentage math.

## 6. Motion & Interaction
Spring physics for interactive hover states (`framer-motion`).
Perpetual micro-loops on active dashboard components (e.g., pulsing green dot for online devices).

## 7. Anti-Patterns (Banned)
- No emojis
- No pure black (`#000000`)
- No neon/outer glow shadows
- No 3-column equal grids
- No generic placeholder names
- No overlapping elements
