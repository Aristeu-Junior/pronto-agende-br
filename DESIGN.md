---
tokens:
  palette:
    bg: "#F9F8F6"
    surface: "#FFFFFF"
    surface-subtle: "#F3F1ED"
    text-primary: "#141413"
    text-secondary: "#57554F"
    text-muted: "#7D7A72"
    accent: "#0F6E61"
    accent-hover: "#0B5349"
    accent-soft: "#E7F3F1"
    brass: "#B45309"
    brass-soft: "#FEF3C7"
    danger: "#B91C1C"
    danger-soft: "#FEE2E2"
    border: "#E6E3DC"
  fonts:
    display: "Plus Jakarta Sans"
    sans: "Plus Jakarta Sans"
    mono: "JetBrains Mono"
---

# ProntoAgende BR — Design System

## 1. Visual Theme & Atmosphere

ProntoAgende BR adopts an **Atmospheric Minimalism & High-Craft Light UI** posture blended with **choreographed responsiveness** and **tactile operational clarity** for Brazilian barbershops, beauty studios, and aesthetic clinics.

Rather than dark neon dashboards that fatigue operators under bright ring-lights and salon mirrors, the interface rests on a warm alabaster canvas (`#F9F8F6`) paired with crisp white workplanes (`#FFFFFF`), warm stone hairline borders (`#E6E3DC`), deep obsidian ink (`#141413`), and a high-trust emerald-teal operational accent (`#0F6E61`).

## 2. Color Palette & Roles

| Token | Value | Role |
|---|---|---|
| `bg` | `#F9F8F6` | Warm alabaster viewport background |
| `surface` | `#FFFFFF` | Primary operational workspace & dialog surface |
| `surface-subtle` | `#F3F1ED` | Recessed controls, secondary chips, and time badges |
| `text-primary` | `#141413` | Deep obsidian ink for headlines, client names, and totals |
| `text-secondary` | `#57554F` | Supporting service descriptions and labels |
| `text-muted` | `#7D7A72` | Metadata, channel tags, and subtle hints |
| `accent` | `#0F6E61` | Emerald-teal primary action, active chair filter, and POS settlement |
| `accent-hover` | `#0B5349` | Hover/active state for emerald-teal CTAs |
| `accent-soft` | `#E7F3F1` | Active navigation pill and "Na Cadeira" status tint |
| `brass` | `#B45309` | Warm amber-brass for awaiting deposit / walk-in highlights |
| `danger` | `#B91C1C` | Destructive action, no-show counter alert, and CPF validation error |
| `border` | `#E6E3DC` | 1px hairline structural dividers |

## 3. Typography Rules

- **Primary UI & Display (`Plus Jakarta Sans`):** High x-height geometric humanist sans-serif for rapid scanning of client names, service titles, and section headers (`tracking-tight` on headings).
- **Numeric & Fiscal (`JetBrains Mono` + `font-variant-numeric: tabular-nums`):** Strictly enforced across all timestamps (`13:00`), durations (`40 min`), Brazilian currency (`R$ 133,00`), CPF documents, WhatsApp numbers, and Salão Parceiro percentage splits (`55%`).

## 4. Component Stylings

- **Buttons & Controls:** Tactile `rounded-lg` (`8px` radius) buttons with `active:scale-[0.98]` feedback. Primary operational actions use `#0F6E61` or `#141413` (for 2-tap Walk-in).
- **Native Light-Dismiss Dialogs (`LightDismissDialog`):** Built on native `<dialog closedby="any">` opened via `.showModal()` with a Safari coordinate-check backdrop click fallback.
- **Responsive Container-Query Tables (`.table-wrapper`):** Scrollable keyboard-accessible regions (`tabIndex={0}`, `role="region"`) using `container-type: inline-size` that transform into stacked mobile cards below `600px` with `var(--label-N)` pseudo-element headers.

## 5. Layout, Spatial Architecture & Focal Point

- **Desktop (`>=1024px`):** Asymmetric 12-column operational split (`8 columns` main timeline/POS list + `4 columns` sticky contextual inspector or Salão Parceiro live calculation receipt) inside a `1360px` max-width container, keeping >=22% open alabaster canvas around the frame.
- **Mobile (`<768px`):** Single-column flow with a sticky top header and a fixed 6-item bottom thumb bar (`pb-24` clearance), using `min-h-[100dvh]` for mobile browser chrome resilience.

## 6. Motion & Interaction Choreography

- Fast, functional micro-transitions (`150ms–200ms cubic-bezier(0.22, 1, 0.36, 1)`).
- Instant live recalculation in the POS Salão Parceiro split engine without layout shift (`tabular-nums`).

## 7. Anti-Patterns & Guardrails

- **Zero emojis** in UI markup; all indicators use crisp `1.75px`-stroke `lucide-react` vector icons.
- **No `100vh` / `h-screen`**; always use `100dvh`.
- **No multi-axis card proliferation**; KPI cards are capped at 3 data points per card, and detailed records live in structured rows or `@container` tables.

## 8. Responsive & Per-Surface Deviations

- **Surface `src/App.tsx` (Active Brief `934aec2e`):** Combines an asymmetric 2-column operational split on desktop (`Agenda` + `Chair Inspector`, `POS` + `Salão Parceiro Split Receipt`) with a bottom thumb-bar navigation on mobile viewports.
