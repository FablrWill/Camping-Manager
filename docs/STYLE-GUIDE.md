# Camp Commander — Style Guide

## Design Philosophy

Camp Commander is a **personal tool used outdoors** — on a phone, at a campsite, sometimes at night, sometimes in bright sun. Every design decision flows from that context.

**Principles:**
- **Mobile-first, thumb-friendly** — primary use is phone in hand
- **Scannable** — Will has ADHD, so dense walls of text lose him. Use hierarchy, whitespace, and visual grouping.
- **Day & night ready** — full dark mode for campsite use after sunset
- **Earthy & warm** — stone, amber, forest — this is a camping app, not a corporate dashboard
- **Fast & functional** — no decorative bloat. Every element earns its space.

---

## Color System

### Light Mode Palette

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| `--bg-primary` | `stone-50` | `#fafaf9` | Page background |
| `--bg-surface` | `white` | `#ffffff` | Cards, modals, inputs |
| `--bg-surface-alt` | `stone-100` | `#f5f5f4` | Secondary surfaces, grouped sections |
| `--bg-nav` | `stone-800` | `#292524` | Bottom nav bar |
| `--text-primary` | `stone-900` | `#1c1917` | Headings, body text |
| `--text-secondary` | `stone-500` | `#78716c` | Supporting text, labels |
| `--text-tertiary` | `stone-400` | `#a8a29e` | Hints, placeholders, captions |
| `--text-inverse` | `stone-50` | `#fafaf9` | Text on dark backgrounds |
| `--accent` | `amber-600` | `#d97706` | Primary action buttons, links |
| `--accent-hover` | `amber-700` | `#b45309` | Button hover states |
| `--accent-soft` | `amber-50` | `#fffbeb` | Accent backgrounds (badges, highlights) |
| `--border` | `stone-200` | `#e7e5e4` | Card borders, dividers |
| `--border-focus` | `amber-400` | `#fbbf24` | Focus rings on inputs |
| `--danger` | `red-600` | `#dc2626` | Delete buttons, error states |
| `--success` | `emerald-600` | `#059669` | Success states, confirmations |

### Dark Mode Palette

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| `--bg-primary` | `stone-950` | `#0c0a09` | Page background |
| `--bg-surface` | `stone-900` | `#1c1917` | Cards, modals |
| `--bg-surface-alt` | `stone-800` | `#292524` | Secondary surfaces |
| `--bg-nav` | `stone-900` | `#1c1917` | Bottom nav bar |
| `--text-primary` | `stone-50` | `#fafaf9` | Headings, body text |
| `--text-secondary` | `stone-400` | `#a8a29e` | Supporting text |
| `--text-tertiary` | `stone-600` | `#57534e` | Hints, captions |
| `--accent` | `amber-500` | `#f59e0b` | Primary actions (brighter for contrast) |
| `--accent-hover` | `amber-400` | `#fbbf24` | Button hover |
| `--border` | `stone-700` | `#44403c` | Card borders, dividers |
| `--border-focus` | `amber-500` | `#f59e0b` | Focus rings |

### Semantic Colors (Condition Badges)

| Condition | Light BG | Light Text | Dark BG | Dark Text |
|-----------|----------|------------|---------|-----------|
| New | `emerald-50` | `emerald-700` | `emerald-900/50` | `emerald-400` |
| Good | `sky-50` | `sky-700` | `sky-900/50` | `sky-400` |
| Fair | `amber-50` | `amber-700` | `amber-900/50` | `amber-400` |
| Worn | `orange-50` | `orange-700` | `orange-900/50` | `orange-400` |
| Broken | `red-50` | `red-700` | `red-900/50` | `red-400` |

### Signal Strength Colors (for spot metadata)

| Level | Color | Usage |
|-------|-------|-------|
| Excellent | `emerald-500` | Full bars, strong signal |
| Good | `sky-500` | Moderate signal |
| Weak | `amber-500` | Usable but unreliable |
| None | `red-500` | No signal |

---

## Typography

**Font Stack:** System fonts for performance. No external font loads.

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Type Scale

| Role | Size | Weight | Class | Usage |
|------|------|--------|-------|-------|
| Page title | 24px / 1.5rem | Bold (700) | `text-2xl font-bold` | "My Gear", "Trips" |
| Section title | 18px / 1.125rem | Semibold (600) | `text-lg font-semibold` | Category headers, card titles |
| Body | 16px / 1rem | Regular (400) | `text-base` | Primary content |
| Supporting | 14px / 0.875rem | Regular/Medium | `text-sm` | Metadata, descriptions |
| Caption | 12px / 0.75rem | Medium (500) | `text-xs font-medium` | Badges, chips, timestamps |

### Rules
- **Headings:** `tracking-tight` for large text (24px+)
- **All-caps:** Only for small category labels (`text-xs uppercase tracking-wider`)
- **Line clamping:** Use `line-clamp-1` or `line-clamp-2` for card descriptions

---

## Spacing & Layout

### Grid: 4px base unit

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Between related items |
| `space-3` | 12px | Component internal padding |
| `space-4` | 16px | Card padding, section gaps |
| `space-6` | 24px | Between sections |
| `space-8` | 32px | Major section breaks |

### Content Container
```
max-w-lg mx-auto px-4    — for forms, modals
max-w-4xl mx-auto px-4   — for list pages, dashboard
```

### Touch Targets
- **Minimum tap target:** 44px × 44px (Apple HIG)
- **Buttons:** `py-2.5 px-4` minimum (gives ~44px height)
- **List items:** Full-width tap target with `p-4`
- **Bottom nav items:** `py-3` with icon + label

---

## Components

### Cards
The primary content container. Used for gear items, trip cards, vehicle stats, etc.

```
Outer: bg-white rounded-xl border border-stone-200 hover:border-amber-400 transition-colors
Padding: p-4
Dark: bg-stone-900 border-stone-700 hover:border-amber-500
```

### Buttons

**Primary (amber):**
```
bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg font-medium
Dark: bg-amber-500 hover:bg-amber-400 text-stone-900
```

**Secondary (outline):**
```
border border-stone-300 text-stone-700 px-4 py-2.5 rounded-lg font-medium hover:bg-stone-50
Dark: border-stone-600 text-stone-300 hover:bg-stone-800
```

**Destructive:**
```
bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium
```

**Ghost (text only):**
```
text-stone-500 hover:text-stone-700 px-3 py-2 rounded-lg hover:bg-stone-100
```

**Chip / Filter:**
```
Active: bg-stone-800 text-white px-3 py-1.5 rounded-full text-sm font-medium
Inactive: bg-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-stone-300
Dark Active: bg-stone-200 text-stone-900
Dark Inactive: bg-stone-700 text-stone-400 hover:bg-stone-600
```

### Inputs

```
w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900
placeholder:text-stone-400
focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
Dark: bg-stone-800 border-stone-600 text-stone-100 placeholder:text-stone-500 focus:ring-amber-500
```

### Modals / Bottom Sheets

Mobile: slide from bottom with `rounded-t-2xl`
Desktop: centered with `rounded-2xl`

```
Overlay: fixed inset-0 z-50 bg-black/50
Sheet: bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl
Dark: bg-stone-900
```

### Badges

```
Rounded pill: text-xs px-2 py-0.5 rounded-full font-medium
Colors: use semantic condition colors (see above)
```

### Empty States

```
Centered: text-center py-16
Emoji: text-4xl mb-3
Message: text-lg font-medium text-stone-400
CTA: text-amber-600 hover:text-amber-700 font-medium
```

---

## Navigation

### Bottom Tab Bar (Mobile)

5 tabs: Home, Gear, Vehicle, Spots, Trips

```
Position: fixed bottom-0 z-50
Background: bg-stone-800 (light) / bg-stone-900 (dark)
Items: flex-1 flex-col items-center py-3 gap-1
Active: text-amber-400
Inactive: text-stone-400
Label: text-[10px] font-medium
```

**Safe area:** `pb-[env(safe-area-inset-bottom)]` for iPhone notch

### Header
Minimal top bar with page title only (no nav links — those move to bottom bar)

```
sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-stone-200
Dark: bg-stone-950/80 border-stone-800
```

---

## Iconography

**Approach:** Emoji-first for categories and quick visual scanning. Lucide React icons for UI actions.

### Module Icons
| Module | Emoji | Usage |
|--------|-------|-------|
| Home | 🏠 | Bottom nav |
| Gear | 🎒 | Bottom nav, gear references |
| Vehicle | 🚙 | Bottom nav, vehicle references |
| Spots | 📍 | Bottom nav, location references |
| Trips | 🏕️ | Bottom nav, trip references |

### Category Icons
| Category | Emoji |
|----------|-------|
| Shelter | ⛺ |
| Sleep | 🛏️ |
| Cook | 🍳 |
| Power | 🔋 |
| Clothing | 🧥 |
| Tools | 🔧 |
| Vehicle | 🚙 |

### Action Icons (Lucide)
- Add: `Plus`
- Edit: `Pencil`
- Delete: `Trash2`
- Search: `Search`
- Filter: `SlidersHorizontal`
- Close: `X`
- Back: `ChevronLeft`
- Menu: `MoreVertical`
- Photo: `Camera`
- Map: `Map`
- Calendar: `Calendar`
- Star: `Star`
- Weight: `Scale`
- Link: `ExternalLink`

---

## Animations & Transitions

Keep it minimal. Motion should feel fast and purposeful.

- **Transitions:** `transition-colors` for hover/focus (150ms default)
- **Modals:** Slide up from bottom on mobile (CSS transform)
- **Page transitions:** None (keep it snappy)
- **Loading:** Simple text "Loading..." or skeleton pulse (`animate-pulse bg-stone-200 rounded`)

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile (default) | < 640px | Single column, bottom nav, full-width cards |
| Small tablet (`sm`) | 640px | 2-column grids, centered modals |
| Tablet (`md`) | 768px | Side-by-side layouts where useful |
| Desktop (`lg`) | 1024px | Max content width, more horizontal space |

---

## Dark Mode Implementation

**Strategy:** CSS custom properties + Tailwind `dark:` variant
**Toggle:** User preference stored in `localStorage`, respects `prefers-color-scheme` as default
**Class-based:** `<html class="dark">` applied via client script to avoid flash

---

## Accessibility

- **Focus rings:** Visible `ring-2 ring-amber-400` on all interactive elements
- **Touch targets:** Minimum 44×44px
- **Color contrast:** All text meets WCAG AA (4.5:1 for body, 3:1 for large text)
- **Semantic HTML:** Use `<button>`, `<nav>`, `<main>`, `<header>`, `<label>`
- **Screen reader text:** Use `sr-only` class for icon-only buttons
