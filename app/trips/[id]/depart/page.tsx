export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import DepartureChecklistClient from '@/components/DepartureChecklistClient'

export default async function DepartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      emergencyContactName: true,
      emergencyContactEmail: true,
      departureTime: true,
      location: { select: { latitude: true, longitude: true } },
    },
  })

  if (!trip) notFound()

  const tripCoords =
    trip.location?.latitude != null && trip.location?.longitude != null
      ? { lat: trip.location.latitude, lon: trip.location.longitude }
      : undefined

  return (
    <DepartureChecklistClient
      tripId={trip.id}
      tripName={trip.name}
      startDate={trip.startDate.toISOString()}
      endDate={trip.endDate.toISOString()}
      emergencyContactName={trip.emergencyContactName ?? null}
      emergencyContactEmail={trip.emergencyContactEmail ?? null}
      departureTime={trip.departureTime?.toISOString() ?? null}
      tripCoords={tripCoords}
    />
  )
}
