import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import TripPrepClient from '@/components/TripPrepClient'

export default async function TripPrepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      location: { select: { id: true, name: true, latitude: true, longitude: true } },
      vehicle: { select: { id: true, name: true } },
    },
  })

  if (!trip) notFound()

  return (
    <TripPrepClient
      trip={{
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate.toISOString(),
        location: trip.location,
        vehicle: trip.vehicle,
        permitUrl: trip.permitUrl ?? null,
        permitNotes: trip.permitNotes ?? null,
      }}
    />
  )
}
