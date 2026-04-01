import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import DepartureChecklistClient from '@/components/DepartureChecklistClient'

export default async function DepartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, name: true, startDate: true, endDate: true },
  })

  if (!trip) notFound()

  return (
    <DepartureChecklistClient
      tripId={trip.id}
      tripName={trip.name}
      startDate={trip.startDate.toISOString()}
      endDate={trip.endDate.toISOString()}
    />
  )
}
