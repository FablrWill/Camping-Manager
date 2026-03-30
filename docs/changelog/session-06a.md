## 2026-03-30 — Session 6a: Frontend Design System & Page Build-Out

### Created (parallel session)
- **Style Guide** (`docs/STYLE-GUIDE.md`) — comprehensive design system: color tokens (light + dark), typography scale, spacing grid, component specs, navigation patterns, accessibility guidelines
- **CSS Design Tokens** (`globals.css`) — CSS custom properties for all colors/shadows/radii, `.dark` class overrides, animations (slide-up, fade-in), skeleton loading, safe area support
- **UI Component Library** (`components/ui/`): Button, Card, Badge, Input, Textarea, Select, Modal, ConfirmDialog, Chip, ChipRow, EmptyState, PageHeader, StatCard
- **ThemeProvider** — React context for dark mode with system preference detection
- **Bottom Navigation** + **Top Header** + **AppShell** — mobile navigation shell
- **Dashboard** — live stats grid, wishlist callout, recent gear, quick actions
- **Vehicle Page** — hero card, specs, expandable cargo, mods CRUD with cost tracking
- **Trips Page** — trip creation form, upcoming/past sections, countdown timer, active trip ribbon
- **Vehicle API** — GET/POST vehicles, GET/PUT single vehicle, POST mods

### Design Decisions
- **Bottom nav over top nav** — standard mobile pattern, thumb-friendly
- **Stone/amber palette** — earthy, warm, outdoor-appropriate
- **Dark mode from day one** — camping at night means red-shifted UI matters
- **System fonts** — no external font loads. Performance > aesthetics.
