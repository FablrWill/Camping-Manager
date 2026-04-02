import { saveTripSnapshot, type TripSnapshot } from './offline-storage'

export type CacheStep = 'weather' | 'packingList' | 'mealPlan' | 'checklist' | 'emergency' | 'spots' | 'vehicle'
export type StepStatus = 'pending' | 'loading' | 'done' | 'error'

export const CACHE_STEP_LABELS: Record<CacheStep, string> = {
  weather: 'Weather snapshot',
  packingList: 'Packing list',
  mealPlan: 'Meal plan',
  checklist: 'Departure checklist',
  emergency: 'Emergency info',
  spots: 'Saved spots',
  vehicle: 'Vehicle info',
}

export const CACHE_STEPS: CacheStep[] = [
  'weather',
  'packingList',
  'mealPlan',
  'checklist',
  'emergency',
  'spots',
  'vehicle',
]

async function fetchStepData(
  tripId: string,
  step: CacheStep,
  tripEmergency: { name: string | null; email: string | null }
): Promise<unknown> {
  switch (step) {
    case 'weather': {
      const res = await fetch(`/api/weather?tripId=${tripId}`)
      if (!res.ok) throw new Error(`Weather: ${res.status}`)
      return res.json()
    }
    case 'packingList': {
      const res = await fetch(`/api/packing-list?tripId=${tripId}`)
      if (!res.ok) throw new Error(`Packing list: ${res.status}`)
      return res.json()
    }
    case 'mealPlan': {
      const res = await fetch(`/api/meal-plan?tripId=${tripId}`)
      if (!res.ok) throw new Error(`Meal plan: ${res.status}`)
      return res.json()
    }
    case 'checklist': {
      const res = await fetch(`/api/departure-checklist?tripId=${tripId}`)
      if (!res.ok) throw new Error(`Checklist: ${res.status}`)
      return res.json()
    }
    case 'emergency': {
      if (tripEmergency.name && tripEmergency.email) {
        return tripEmergency
      }
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error(`Settings: ${res.status}`)
      const settings = await res.json()
      return {
        name: settings.emergencyContactName ?? null,
        email: settings.emergencyContactEmail ?? null,
      }
    }
    case 'spots': {
      const res = await fetch('/api/locations')
      if (!res.ok) throw new Error(`Locations: ${res.status}`)
      return res.json()
    }
    case 'vehicle': {
      const res = await fetch('/api/vehicle')
      if (!res.ok) throw new Error(`Vehicle: ${res.status}`)
      return res.json()
    }
  }
}

export async function cacheTripData(
  tripId: string,
  tripEmergency: { name: string | null; email: string | null },
  onStepUpdate: (step: CacheStep, status: StepStatus) => void
): Promise<void> {
  const snapshot: Record<string, unknown> = {
    tripId,
    cachedAt: new Date().toISOString(),
  }

  for (const step of CACHE_STEPS) {
    onStepUpdate(step, 'loading')
    try {
      const data = await fetchStepData(tripId, step, tripEmergency)
      snapshot[step] = data
      onStepUpdate(step, 'done')
    } catch {
      snapshot[step] = null
      onStepUpdate(step, 'error')
    }
  }

  await saveTripSnapshot(snapshot as unknown as TripSnapshot)
}
