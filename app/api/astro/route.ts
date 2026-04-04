import { NextRequest, NextResponse } from 'next/server'
import { getMoonPhase, getNightSkyInfo, estimateBortleClass } from '@/lib/astro'
import { fetchWeather } from '@/lib/weather'

/**
 * GET /api/astro?lat=35.5&lon=-82.5&startDate=2026-04-10&endDate=2026-04-12
 * Optional: type, notes, cellSignal (for Bortle estimation)
 *
 * Returns: moon phase per night, golden hour, stargazing quality, Bortle estimate
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') ?? '')
    const lon = parseFloat(searchParams.get('lon') ?? '')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (isNaN(lat) || isNaN(lon) || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Required: lat, lon, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Fetch weather for sunrise/sunset times
    const forecast = await fetchWeather(lat, lon, startDate, endDate)

    // Bortle estimate from optional location metadata
    const locationType = searchParams.get('type')
    const notes = searchParams.get('notes')
    const cellSignal = searchParams.get('cellSignal')
    const bortle = estimateBortleClass(locationType, notes, null, cellSignal)

    // Build per-night astro data
    const nights = forecast.days.map(day => {
      const nightDate = new Date(day.date + 'T22:00:00')
      const skyInfo = getNightSkyInfo(nightDate, day.sunrise, day.sunset)

      return {
        date: day.date,
        dayLabel: day.dayLabel,
        sunrise: day.sunrise,
        sunset: day.sunset,
        ...skyInfo,
      }
    })

    // Find the best stargazing night
    const bestNight = nights.length > 0
      ? nights.reduce((best, n) =>
          n.moonPhase.illumination < best.moonPhase.illumination ? n : best
        )
      : null

    return NextResponse.json({
      latitude: lat,
      longitude: lon,
      bortle,
      nights,
      bestNight: bestNight ? {
        date: bestNight.date,
        dayLabel: bestNight.dayLabel,
        quality: bestNight.stargazingQuality,
        label: bestNight.stargazingLabel,
      } : null,
    })
  } catch (error) {
    console.error('Failed to fetch astro data:', error)
    return NextResponse.json({ error: 'Failed to fetch astro data' }, { status: 500 })
  }
}

/**
 * POST /api/astro/moon — quick moon phase lookup for a single date
 * Body: { date: "2026-04-10" }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const dateStr = body.date

    if (!dateStr || typeof dateStr !== 'string') {
      return NextResponse.json({ error: 'date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    const date = new Date(dateStr + 'T22:00:00')
    const moonPhase = getMoonPhase(date)

    return NextResponse.json({ date: dateStr, moonPhase })
  } catch (error) {
    console.error('Failed to get moon phase:', error)
    return NextResponse.json({ error: 'Failed to get moon phase' }, { status: 500 })
  }
}
