import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import InstallBanner from '../InstallBanner'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // Default: not standalone, not iOS
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
  })
})

describe('InstallBanner', () => {
  it('renders nothing when in standalone mode', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
    const { container } = render(<InstallBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when dismissed via localStorage', () => {
    localStorage.setItem('outland_install_dismissed', 'true')
    const { container } = render(<InstallBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows iOS instructions on iOS devices', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    })
    render(<InstallBanner />)
    // iOS banner shows specific instructions
    expect(screen.getAllByText(/Add to Home Screen/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Tap the Share button/i)).toBeTruthy()
  })

  it('shows Install button on Android with beforeinstallprompt', async () => {
    render(<InstallBanner />)
    // The banner shows but no Install button until beforeinstallprompt fires
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' })
    const promptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    promptEvent.preventDefault = vi.fn()
    Object.assign(promptEvent, { prompt: mockPrompt, userChoice: mockUserChoice })

    await act(async () => {
      window.dispatchEvent(promptEvent)
    })

    expect(screen.getByText(/Install App/i)).toBeTruthy()
  })

  it('handleDismiss sets localStorage and hides banner', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    })
    render(<InstallBanner />)
    const dismissBtn = screen.getByLabelText(/dismiss install banner/i)
    fireEvent.click(dismissBtn)
    expect(localStorage.getItem('outland_install_dismissed')).toBe('true')
    expect(screen.queryByText(/Add to Home Screen/i)).toBeNull()
  })
})
