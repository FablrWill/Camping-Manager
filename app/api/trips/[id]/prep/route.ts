import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchWeather } from '@/lib/weather'
import { getNightSkyInfo, estimateBortleClass } from '@/lib/astro'
import { PREP_SECTIONS, PrepState, PrepSection, PrepStatus } from '@/lib/prep-sections'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true, type: true, notes: true, description: true, cellSignal: true } },
        vehicle: { select: { id: true, name: true } },
        packingItems: { select: { packed: true } },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const sections: PrepSection[] = []

    for (const config of PREP_SECTIONS) {
      let status: PrepStatus = 'not_started'
      let summary = ''
      let data: unknown = null

      if (config.key === 'weather') {
        if (!trip.location || trip.location.latitude == null || trip.location.longitude == null) {
          status = 'not_started'
          summary = 'No location set'
        } else {
          try {
            const startDate = trip.startDate.toISOString().split('T')[0]
            const endDate = trip.endDate.toISOString().split('T')[0]
            const forecast = await fetchWeather(
              trip.location.latitude,
              trip.location.longitude,
              startDate,
              endDate
            )
            data = {
              days: forecast.days,
              alerts: forecast.alerts,
              elevation: forecast.elevation,
              locationName: trip.location.name,
            }
            const warningAlerts = forecast.alerts.filter(a => a.severity === 'warning')
            if (warningAlerts.length > 0) {
              status = 'in_progress'
              summary = `${warningAlerts.length} weather alert${warningAlerts.length > 1 ? 's' : ''}`
            } else {
              status = 'ready'
              const highs = forecast.days.map(d => d.highF)
              const lows = forecast.days.map(d => d.lowF)
              const highMax = Math.max(...highs)
              const lowMin = Math.min(...lows)
              summary = `${Math.round(lowMin)}–${Math.round(highMax)}°F`
            }
          } catch {
            status = 'not_started'
            summary = 'Weather unavailable'
          }
        }
      } else if (config.key === 'packing') {
        const total = trip.packingItems.length
        const packed = trip.packingItems.filter(i => i.packed).length
        if (total === 0) {
          status = 'not_started'
          summary = 'No packing list generated'
        } else if (packed === total) {
          status = 'ready'
          summary = `${packed}/${total} items packed`
        } else {
          status = 'in_progress'
          summary = `${packed}/${total} items packed`
        }
        data = { total, packed }
      } else if (config.key === 'meals') {
        if (trip.mealPlanGeneratedAt) {
          status = 'ready'
          const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
          const diffMs = trip.mealPlanGeneratedAt.getTime() - Date.now()
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
          summary = `Meal plan generated ${rel.format(diffDays, 'day')}`
        } else {
          status = 'not_started'
          summary = 'No meal plan yet'
        }
        data = { mealPlanGeneratedAt: trip.mealPlanGeneratedAt?.toISOString() ?? null }
      } else if (config.key === 'power') {
        const count = await prisma.gearItem.count({
          where: { isWishlist: false, wattage: { not: null } },
        })
        if (count > 0) {
          status = 'in_progress'
          summary = `${count} powered device${count > 1 ? 's' : ''} tracked`
        } else {
          status = 'not_started'
          summary = 'No powered gear in inventory'
        }
        data = { poweredDeviceCount: count }
      } else if (config.key === 'dark-sky') {
        if (!trip.location || trip.location.latitude == null || trip.location.longitude == null) {
          status = 'not_started'
          summary = 'No location set'
        } else {
          try {
            const startDate = trip.startDate.toISOString().split('T')[0]
            const endDate = trip.endDate.toISOString().split('T')[0]
            const forecast = await fetchWeather(
              trip.location.latitude,
              trip.location.longitude,
              startDate,
              endDate
            )

            const bortle = estimateBortleClass(
              trip.location.type,
              trip.location.notes,
              trip.location.description,
              trip.location.cellSignal
            )

            const nights = forecast.days.map(day => {
              const nightDate = new Date(day.date + 'T22:00:00')
              return {
                date: day.date,
                dayLabel: day.dayLabel,
                ...getNightSkyInfo(nightDate, day.sunrise, day.sunset),
              }
            })

            const bestNight = nights.reduce((best, n) =>
              n.moonPhase.illumination < best.moonPhase.illumination ? n : best
            )

            status = bestNight.stargazingQuality === 'excellent' || bestNight.stargazingQuality === 'good'
              ? 'ready'
              : 'in_progress'
            summary = `Bortle ${bortle.bortle} · ${bestNight.moonPhase.emoji} ${bestNight.moonPhase.name}`

            data = { bortle, nights }
          } catch {
            status = 'not_started'
            summary = 'Astro data unavailable'
          }
        }
      }

      sections.push({
        key: config.key,
        label: config.label,
        emoji: config.emoji,
        status,
        summary,
        data,
      })
    }

    const prepState: PrepState = {
      tripId: trip.id,
      tripName: trip.name,
      startDate: trip.startDate.toISOString(),
      endDate: trip.endDate.toISOString(),
      sections,
      overallReady: sections.every(s => s.status === 'ready'),
    }

    return NextResponse.json(prepState)
  } catch (error) {
    console.error('Failed to fetch prep state:', error)
    return NextResponse.json({ error: 'Failed to fetch prep state' }, { status: 500 })
  }
}
