# Testing Patterns

**Analysis Date:** 2026-03-30

## Test Framework

**Status:** No testing framework installed

**Current state:**
- No test files in codebase (0 `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx` files)
- No test runner: Jest, Vitest, or similar not in `package.json`
- No test configuration files: `jest.config.js`, `vitest.config.ts`, etc.
- No assertion library in dependencies

**Why this matters:**
- API routes and server functions lack automated verification
- React components have no unit test coverage
- No CI/CD validation gate for regressions
- Manual testing only for all features

## Recommended Testing Approach

**Framework candidate:** Vitest (lightweight, modern, great TypeScript support for Next.js)

**Test file locations (recommended pattern):**
- Server functions: co-located with source (e.g., `lib/weather.test.ts` next to `lib/weather.ts`)
- React components: co-located or separate `__tests__` folder (e.g., `components/__tests__/GearForm.test.tsx`)
- API routes: separate test folder (e.g., `app/api/__tests__/gear.test.ts`)

## Test Structure (Recommendation)

**Standard suite structure:**
```typescript
describe('ComponentName', () => {
  describe('Feature', () => {
    it('should do something when condition', () => {
      // Arrange
      const input = ...

      // Act
      const result = ...

      // Assert
      expect(result).toEqual(...)
    })
  })
})
```

**Async testing (recommended pattern):**
```typescript
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

## Current Testing Patterns (None)

**Manual approach currently used:**
- Browser testing during development
- No automated validation of business logic
- API testing via manual requests or browser dev tools
- Component behavior tested by hand

## Areas That Should Have Tests

**High-priority:**
- `lib/claude.ts` (`generatePackingList()`) — complex logic, used for core feature, AI-generated output
- `lib/weather.ts` (all functions) — data transformation, multiple unit conversions, WMO code mapping
- API routes (`app/api/*/route.ts`) — business logic, database operations, error cases

**Medium-priority:**
- Components with complex state: `GearClient.tsx`, `TripsClient.tsx`, `VehicleClient.tsx`
- Form components: `GearForm.tsx`, `LocationForm.tsx`
- Utility functions: `getCategoryEmoji()`, `getCategoryLabel()`, `getConditionColor()`

**Lower-priority:**
- UI components: `Button.tsx`, `Card.tsx`, `Modal.tsx` (mostly presentation)
- Simple components: `TopHeader.tsx`, `AppShell.tsx`

## Mocking Strategy (When Tests Exist)

**Database mocking:**
- Mock Prisma client with `vi.mock('@/lib/db')`
- Use factory functions to create test data
- Don't mock in integration tests — use test database if applicable

**API/HTTP mocking:**
- Mock `fetch()` calls in component tests
- Example: `global.fetch = vi.fn(() => Promise.resolve({ json: () => ({ ... }) }))`

**External services:**
- Mock Anthropic SDK: `vi.mock('@anthropic-ai/sdk')`
- Mock Open-Meteo API: mock fetch responses in weather utility tests

**What NOT to mock:**
- React hooks internals (`useState`, `useEffect`)
- React itself
- Type definitions

## Fixtures and Factories

**Current approach:** None

**Recommended pattern:**
```typescript
// lib/__tests__/fixtures.ts
export function createGearItem(overrides?: Partial<GearItem>): GearItem {
  return {
    id: 'test-id',
    name: 'Test Gear',
    category: 'shelter',
    isWishlist: false,
    ...overrides,
  }
}

export function createLocation(overrides?: Partial<Location>): Location {
  return {
    id: 'test-id',
    name: 'Test Location',
    latitude: 35.0,
    longitude: -84.0,
    ...overrides,
  }
}
```

**Where to place:**
- `lib/__tests__/fixtures.ts` for shared test utilities
- `app/api/__tests__/fixtures.ts` for API-specific factories

## Test Coverage Gaps

**Critical gaps:**
- `app/api/gear/route.ts` — POST/GET handlers untested
- `app/api/locations/[id]/route.ts` — PUT/DELETE handlers untested
- `lib/claude.ts` — `generatePackingList()` untested (complex AI prompt, formatters)
- `lib/weather.ts` — temperature conversion, code mapping untested

**Component gaps:**
- `components/GearClient.tsx` — filter/group logic, form submission untested
- `components/PhotoUpload.tsx` — file handling, drag-drop untested
- `components/SpotMap.tsx` — map initialization, marker interactions untested

**Error handling gaps:**
- No tests for error paths (validation failures, 404s, 500s)
- No tests for edge cases (null values, empty arrays, boundary conditions)

## Run Commands (When Implemented)

```bash
npm run test                # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

**Suggested configuration in package.json:**
```json
"scripts": {
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:coverage": "vitest --coverage"
}
```

---

*Testing analysis: 2026-03-30*
