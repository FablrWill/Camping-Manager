# Coding Conventions

**Analysis Date:** 2026-03-30

## Naming Patterns

**Files:**
- Component files: PascalCase (e.g., `GearForm.tsx`, `PhotoUpload.tsx`, `SpotMap.tsx`)
- API routes: lowercase with hyphens (e.g., `packing-list`, `vehicle/[id]/mods`)
- Utility/library files: camelCase (e.g., `claude.ts`, `weather.ts`, `exif.ts`)
- UI component barrel file: `index.ts` (exports all UI components with `export { default as ComponentName }`)

**Functions:**
- Prefix helper functions with verb or descriptor (e.g., `getCategoryEmoji()`, `getCategoryLabel()`, `getConditionColor()`, `decodeWeatherCode()`, `celsiusToFahrenheit()`, `mmToInches()`)
- Handler functions: `handleEventName()` pattern (e.g., `handleSubmit()`, `handleEscape()`, `handleSave()`, `handleDelete()`, `handleFiles()`)
- Async functions: standard naming (e.g., `generatePackingList()`, `fetchLocations()`, `fetchVehicles()`)
- Utility functions: descriptive names without prefix (e.g., `createContext()`, `useTheme()`, `openEdit()`, `openAdd()`)

**Variables:**
- State variables: camelCase (e.g., `uploading`, `editingItem`, `showWishlist`, `deleteError`)
- Boolean state: prefixed with is/show/has pattern (e.g., `isWishlist`, `showForm`, `showWishlist`, `isDeleting`, `dragOver`)
- Constants: CONSTANT_CASE for readonly values (e.g., `CATEGORIES`, `CONDITIONS`, `CATEGORY_EMOJIS`, `WMO_CODES`)
- Props objects: verbose naming (e.g., `initialItems`, `onUploadComplete`, `onSave`)
- Derived/computed variables: descriptive names (e.g., `filtered`, `grouped`, `ownedCount`, `wishlistCount`)

**Types:**
- Interfaces for component props: `ComponentNameProps` (e.g., `GearFormProps`, `ModalProps`, `PhotoUploadProps`)
- Data model interfaces: PascalCase singular (e.g., `GearItem`, `Location`, `PackingListResult`, `WeatherForecast`)
- Context type: `ContextNameValue` (e.g., `ThemeContextValue`)

## Code Style

**Formatting:**
- No Prettier config file — ESLint extended config determines formatting
- Indentation: 2 spaces
- Line length: no hard limit enforced
- Quotes: single quotes for JS/TS, backticks for template literals
- Semicolons: always present

**Linting:**
- Tool: ESLint 9 with Next.js config extensions
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`
- ESLint disable comments: used for legitimate cases (e.g., `eslint-disable-next-line @typescript-eslint/no-explicit-any` in `SpotMap.tsx` for Leaflet type workaround)

## Import Organization

**Order:**
1. React/Next.js built-ins (`import { useState, useEffect } from 'react'`)
2. Third-party libraries (`import L from 'leaflet'`, `import Anthropic from '@anthropic-ai/sdk'`)
3. CSS/styles (`import 'leaflet/dist/leaflet.css'`)
4. Relative imports (`import { prisma } from '@/lib/db'`, `import GearForm from './GearForm'`)
5. Type imports (when used in parallel with value imports)

**Path Aliases:**
- `@/*` maps to root directory (configured in `tsconfig.json`)
- Used for: `@/lib/db`, `@/components/...`, `@/app/...`
- Relative imports still used for adjacent files (e.g., `import GearForm from './GearForm'`)

## Error Handling

**API Routes (server):**
- All routes wrapped in try-catch blocks
- Pattern: `try { ... } catch (error) { console.error('Action:', error); return NextResponse.json({ error: 'User-friendly message' }, { status: 500 }) }`
- Status codes used: 400 (validation), 404 (not found), 500 (server error), 201 (created)
- Validation: manual checks (e.g., `if (!body.name || !body.category) return ...`)
- Examples:
  - `app/api/gear/route.ts` (lines 34-37, 70-72)
  - `app/api/locations/[id]/route.ts` (lines 22-24, 87-89)

**Components (client):**
- State-based error messages (no `alert()`)
- Pattern: `setError(null)` on start, `setError('message')` on failure, render error state inline
- Async operations: use loading state (`setSaving`, `uploading`, `isDeleting`) + error state
- Examples:
  - `components/PhotoUpload.tsx` (lines 43-48) — fetch error caught and set in state
  - `components/GearForm.tsx` — follows same pattern with `setError()` state

**Promises:**
- `await` used consistently for async operations
- `Promise.all()` used for parallel operations (e.g., `app/page.tsx` lines 5-25)

## Logging

**Framework:** `console.error()` only (no logging library)

**Patterns:**
- Server-side: always log errors in catch blocks with action context
- Client-side: no logging output
- Format: `console.error('Action description:', error)` — string describes what failed, error object follows
- Examples: `'Failed to fetch gear:'`, `'Failed to create location:'`, `'Failed to update gear item:'`

## Comments

**When to Comment:**
- Explain non-obvious logic (e.g., `// Fix Leaflet default marker icon path issue with bundlers`)
- Document workarounds and their reasons
- JSDoc for utility functions (see `lib/weather.ts` line 1-5)

**JSDoc/TSDoc:**
- Used for public utility modules (e.g., `weather.ts` opens with block comment explaining API docs link)
- Not used on individual functions (self-explanatory names preferred)
- Not used on React components (props interfaces document intent)

## Function Design

**Size:** Prefer small, focused functions (most are 10-30 lines)

**Parameters:**
- Named parameters with type annotations
- Destructuring used for props: `({ initialItems }: { initialItems: GearItem[] })`
- Object params preferred over multiple args: `generatePackingList(params: { tripName, startDate, ... })`

**Return Values:**
- Explicit return types on all functions
- Async functions return Promises: `async function handler(): Promise<Type>`
- Handler functions often return `void` (state updates side effect)
- Null-coalescing common for serialization: `visitedAt?.toISOString() ?? null`

## Module Design

**Exports:**
- Default export for single component/function per file
- Named exports for utilities (e.g., `export interface DayForecast { ... }`, `export async function generatePackingList(...)`)
- Barrel files: `components/ui/index.ts` re-exports all UI components

**Barrel Files:**
- Used only in `components/ui/` for cohesive UI component library
- Not used elsewhere — components import directly from their files

## React Patterns

**Functional Components:**
- All components are functional with hooks
- Client components marked with `'use client'` directive

**Hooks:**
- `useState` for local component state
- `useCallback` for memoized event handlers and dependencies
- `useEffect` for side effects with explicit dependency arrays
- `useMemo` for expensive computations and filtered/grouped data
- `useContext` for context consumption
- `useRef` for DOM refs and imperative handles

**Dependency Arrays:**
- Always specified explicitly
- Minimal: only include values that effect depends on
- Example: `useCallback((e: KeyboardEvent) => { ... }, [onClose])` — depends on onClose callback

**State Updates:**
- Functional updates preferred when new state depends on old: handled through closures
- Props to state: pattern like `const [items, setItems] = useState<GearItem[]>(initialItems)`

## TypeScript

**Strictness:** `"strict": true` in tsconfig.json

**Types:**
- Inline prop types: `function Component({ prop }: { prop: Type })`
- Extracted interfaces for complex props or reused types
- Record<K, V> for object lookups (e.g., `WMO_CODES: Record<number, { ... }>`)
- Null handling: explicit `| null` in types (e.g., `brand: string | null`)

---

*Convention analysis: 2026-03-30*
