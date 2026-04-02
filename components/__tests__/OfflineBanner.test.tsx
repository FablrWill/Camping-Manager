import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import OfflineBanner from '../OfflineBanner'

vi.mock('@/lib/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('@/lib/offline-storage', () => ({
  getCachedTripIds: vi.fn(() => Promise.resolve([])),
  getTripSnapshot: vi.fn(() => Promise.resolve(undefined)),
  getSnapshotAge: vi.fn(() => '2h ago'),
}))

import { useOnlineStatus } from '@/lib/use-online-status'
import { getCachedTripIds, getTripSnapshot, getSnapshotAge } from '@/lib/offline-storage'

beforeEach(() => vi.clearAllMocks())

describe('OfflineBanner', () => {
  it('renders nothing when online', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    const { container } = render(<OfflineBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders offline indicator when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeTruthy()
  })

  it('shows WifiOff icon', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    const { container } = render(<OfflineBanner />)
    // Lucide renders as SVG
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('shows snapshot age when cached data exists', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getCachedTripIds).mockResolvedValue(['trip-1'])
    vi.mocked(getTripSnapshot).mockResolvedValue({
      tripId: 'trip-1',
      cachedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      weather: null,
      packingList: null,
      mealPlan: null,
      departureChecklist: null,
      spots: [],
      emergencyInfo: { name: null, email: null },
      vehicleInfo: null,
    })
    vi.mocked(getSnapshotAge).mockReturnValue('2h ago')

    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByText(/2h ago/)).toBeTruthy()
    })
  })

  it('shows staleness warning after 24 hours', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getCachedTripIds).mockResolvedValue(['trip-1'])
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    vi.mocked(getTripSnapshot).mockResolvedValue({
      tripId: 'trip-1',
      cachedAt: staleDate,
      weather: null,
      packingList: null,
      mealPlan: null,
      departureChecklist: null,
      spots: [],
      emergencyInfo: { name: null, email: null },
      vehicleInfo: null,
    })
    vi.mocked(getSnapshotAge).mockReturnValue('1 day ago')

    render(<OfflineBanner />)
    await waitFor(() => {
      expect(screen.getByText(/weather may have changed/i)).toBeTruthy()
    })
  })
})
