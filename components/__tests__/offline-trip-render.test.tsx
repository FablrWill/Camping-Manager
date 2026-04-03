/**
 * Offline trip render test scaffold.
 *
 * Tests 1-2 pass before Plan 10-03.
 * Tests 3-6 are expected to FAIL until Plan 10-03 Task 1 implements offlineData prop wiring
 * in TripPrepClient, PackingList, MealPlan, and WeatherCard.
 *
 * Validates Plan 10-03 Task 1 implementation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

vi.mock('@/lib/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('@/lib/offline-storage', () => ({
  getTripSnapshot: vi.fn(),
}))

// Mock child components to spy on props
vi.mock('@/components/PackingList', () => ({
  default: vi.fn(({ offlineData }: { offlineData?: unknown }) =>
    React.createElement('div', { 'data-testid': 'packing-list', 'data-offline': !!offlineData })
  ),
}))

vi.mock('@/components/MealPlan', () => ({
  default: vi.fn(({ offlineData }: { offlineData?: unknown }) =>
    React.createElement('div', { 'data-testid': 'meal-plan', 'data-offline': !!offlineData })
  ),
}))

vi.mock('@/components/WeatherCard', () => ({
  default: vi.fn(({ offlineData }: { offlineData?: unknown }) =>
    React.createElement('div', { 'data-testid': 'weather-card', 'data-offline': !!offlineData })
  ),
}))

import { useOnlineStatus } from '@/lib/use-online-status'
import { getTripSnapshot } from '@/lib/offline-storage'
import TripPrepClient from '../TripPrepClient'
import PackingList from '../PackingList'
import MealPlan from '../MealPlan'
import WeatherCard from '../WeatherCard'

const mockTrip = {
  id: 'trip-1',
  name: 'Test Trip',
  startDate: '2025-08-01',
  endDate: '2025-08-05',
  location: null,
  vehicle: null,
  permitUrl: null,
  permitNotes: null,
  fallbackFor: null,
  fallbackOrder: null,
}

const mockSnapshot = {
  tripId: 'trip-1',
  cachedAt: new Date().toISOString(),
  weather: { days: [], alerts: [] },
  packingList: { items: [] },
  mealPlan: { days: [] },
  departureChecklist: null,
  spots: [],
  emergencyInfo: { name: null, email: null },
  vehicleInfo: null,
}

const mockPrepState = {
  tripId: 'trip-1',
  tripName: 'Test Trip',
  startDate: '2025-08-01',
  endDate: '2025-08-05',
  overallReady: false,
  sections: [
    { key: 'weather', label: 'Weather', emoji: '🌤', status: 'not_started', summary: '', data: null },
    { key: 'packing', label: 'Packing List', emoji: '🎒', status: 'not_started', summary: '', data: null },
    { key: 'meals', label: 'Meal Plan', emoji: '🍳', status: 'not_started', summary: '', data: null },
    { key: 'power', label: 'Power Budget', emoji: '🔋', status: 'not_started', summary: '', data: null },
    { key: 'departure', label: 'Departure', emoji: '📋', status: 'not_started', summary: '', data: null },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Mock fetch to return proper PrepState for /api/trips/[id]/prep and empty for others
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/prep')) {
      return Promise.resolve({ ok: true, json: async () => mockPrepState })
    }
    return Promise.resolve({ ok: true, json: async () => ({}) })
  })
})

describe('TripPrepClient offline snapshot behavior', () => {
  it('when online, does not call getTripSnapshot', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 2000 })
    expect(getTripSnapshot).not.toHaveBeenCalled()
  })

  it('when offline, calls getTripSnapshot with trip.id', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getTripSnapshot).mockResolvedValue(mockSnapshot)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => {
      expect(getTripSnapshot).toHaveBeenCalledWith('trip-1')
    }, { timeout: 2000 })
  })

  // Validates Plan 10-03 Task 1 implementation
  it('when offline with snapshot, passes offlineData to PackingList', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getTripSnapshot).mockResolvedValue(mockSnapshot)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => {
      const packingListEl = screen.queryByTestId('packing-list')
      expect(packingListEl).not.toBeNull()
      expect(packingListEl?.getAttribute('data-offline')).toBe('true')
    }, { timeout: 2000 })
  })

  // Validates Plan 10-03 Task 1 implementation
  it('when offline with snapshot, passes offlineData to MealPlan', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getTripSnapshot).mockResolvedValue(mockSnapshot)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => {
      const mealPlanEl = screen.queryByTestId('meal-plan')
      expect(mealPlanEl).not.toBeNull()
      expect(mealPlanEl?.getAttribute('data-offline')).toBe('true')
    }, { timeout: 2000 })
  })

  // Validates Plan 10-03 Task 1 implementation
  it('when offline with snapshot, passes offlineData to WeatherCard', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getTripSnapshot).mockResolvedValue(mockSnapshot)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => {
      const weatherEl = screen.queryByTestId('weather-card')
      expect(weatherEl).not.toBeNull()
      expect(weatherEl?.getAttribute('data-offline')).toBe('true')
    }, { timeout: 2000 })
  })

  // Validates Plan 10-03 Task 1 implementation
  it('when offline with no snapshot, children receive undefined offlineData', async () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false)
    vi.mocked(getTripSnapshot).mockResolvedValue(undefined)
    render(<TripPrepClient trip={mockTrip} />)
    await waitFor(() => {
      expect(getTripSnapshot).toHaveBeenCalledWith('trip-1')
    }, { timeout: 2000 })
    // Without a snapshot, PackingList/MealPlan/WeatherCard should not have data-offline=true
    const packingListEl = screen.queryByTestId('packing-list')
    if (packingListEl) {
      expect(packingListEl.getAttribute('data-offline')).not.toBe('true')
    }
  })
})
