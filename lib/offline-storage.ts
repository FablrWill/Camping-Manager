import { get, set, del, keys, createStore } from 'idb-keyval'

// Explicit store to avoid conflicts with other IndexedDB usage
const tripStore = createStore('outland-trips', 'snapshots')

export interface TripSnapshot {
  tripId: string
  cachedAt: string // ISO timestamp
  weather: unknown
  packingList: unknown
  mealPlan: unknown
  departureChecklist: unknown
  spots: unknown[]
  emergencyInfo: { name: string | null; email: string | null }
  vehicleInfo: unknown
}

export async function saveTripSnapshot(snapshot: TripSnapshot): Promise<void> {
  await set(`trip:${snapshot.tripId}`, snapshot, tripStore)
}

export async function getTripSnapshot(tripId: string): Promise<TripSnapshot | undefined> {
  return get(`trip:${tripId}`, tripStore)
}

export async function deleteTripSnapshot(tripId: string): Promise<void> {
  await del(`trip:${tripId}`, tripStore)
}

export async function getCachedTripIds(): Promise<string[]> {
  const allKeys = await keys(tripStore)
  return (allKeys as string[])
    .filter((k) => k.startsWith('trip:'))
    .map((k) => k.replace('trip:', ''))
}

export function getSnapshotAge(cachedAt: string): string {
  const diff = Date.now() - new Date(cachedAt).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
