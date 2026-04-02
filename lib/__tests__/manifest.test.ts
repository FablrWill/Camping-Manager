import { describe, it, expect, beforeEach, vi } from 'vitest'
import manifest from '@/app/manifest'

beforeEach(() => vi.clearAllMocks())

describe('PWA Manifest', () => {
  it('exports a valid manifest with required PWA fields', () => {
    const m = manifest()
    expect(m.name).toBeTruthy()
    expect(typeof m.name).toBe('string')
    expect(m.start_url).toBe('/')
  })

  it('includes 192x192 and 512x512 icons', () => {
    const m = manifest()
    expect(Array.isArray(m.icons)).toBe(true)
    const sizes = (m.icons ?? []).map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    for (const icon of m.icons ?? []) {
      expect(icon.src).toBeTruthy()
      expect(icon.type).toBeTruthy()
    }
  })

  it('uses standalone display mode', () => {
    const m = manifest()
    expect(m.display).toBe('standalone')
  })

  it('has correct theme_color and background_color', () => {
    const m = manifest()
    expect(m.theme_color).toBeTruthy()
    expect(m.background_color).toBeTruthy()
  })
})
