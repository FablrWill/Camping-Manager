import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

// GET /api/weather?lat=35.87&lon=-81.90&start=2026-04-05&end=2026-04-07
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!lat || !lon || !start || !end) {
      return NextResponse.json(
        { error: 'Required params: lat, lon, start (YYYY-MM-DD), end (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lon)

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'lat and lon must be valid numbers' },
        { status: 400 }
      )
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }

    const forecast = await fetchWeather(latitude, longitude, start, end)

    return NextResponse.json(forecast, {
      headers: {
        // Cache for 1 hour — weather doesn't change that fast
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
      },
    })
  } catch (error) {
    console.error('Weather API error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch weather'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
