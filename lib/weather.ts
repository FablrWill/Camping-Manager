/**
 * Open-Meteo weather client for Outland OS
 * Free, no API key required. Returns camping-relevant forecast data.
 * Docs: https://open-meteo.com/en/docs
 */

export interface DayForecast {
  date: string // YYYY-MM-DD
  dayLabel: string // "Fri", "Sat", etc.
  highF: number
  lowF: number
  precipProbability: number // 0-100
  precipInches: number
  weatherCode: number // WMO weather code
  weatherLabel: string // human-readable
  weatherEmoji: string
  windMaxMph: number
  windGustMph: number
  uvIndexMax: number
  sunrise: string // "6:42 AM"
  sunset: string // "7:58 PM"
}

export interface WeatherForecast {
  latitude: number
  longitude: number
  elevation: number // meters
  days: DayForecast[]
  alerts: WeatherAlert[]
}

export interface WeatherAlert {
  type: 'rain' | 'cold' | 'heat' | 'wind' | 'uv'
  message: string
  severity: 'info' | 'warning'
}

// WMO Weather interpretation codes → human labels + emoji
const WMO_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: 'Clear sky', emoji: '☀️' },
  1: { label: 'Mainly clear', emoji: '🌤️' },
  2: { label: 'Partly cloudy', emoji: '⛅' },
  3: { label: 'Overcast', emoji: '☁️' },
  45: { label: 'Foggy', emoji: '🌫️' },
  48: { label: 'Rime fog', emoji: '🌫️' },
  51: { label: 'Light drizzle', emoji: '🌦️' },
  53: { label: 'Drizzle', emoji: '🌦️' },
  55: { label: 'Heavy drizzle', emoji: '🌧️' },
  56: { label: 'Freezing drizzle', emoji: '🌧️' },
  57: { label: 'Heavy freezing drizzle', emoji: '🌧️' },
  61: { label: 'Light rain', emoji: '🌦️' },
  63: { label: 'Rain', emoji: '🌧️' },
  65: { label: 'Heavy rain', emoji: '🌧️' },
  66: { label: 'Freezing rain', emoji: '🌧️' },
  67: { label: 'Heavy freezing rain', emoji: '🌧️' },
  71: { label: 'Light snow', emoji: '🌨️' },
  73: { label: 'Snow', emoji: '🌨️' },
  75: { label: 'Heavy snow', emoji: '❄️' },
  77: { label: 'Snow grains', emoji: '❄️' },
  80: { label: 'Light showers', emoji: '🌦️' },
  81: { label: 'Showers', emoji: '🌧️' },
  82: { label: 'Heavy showers', emoji: '🌧️' },
  85: { label: 'Light snow showers', emoji: '🌨️' },
  86: { label: 'Heavy snow showers', emoji: '❄️' },
  95: { label: 'Thunderstorm', emoji: '⛈️' },
  96: { label: 'Thunderstorm + hail', emoji: '⛈️' },
  99: { label: 'Thunderstorm + heavy hail', emoji: '⛈️' },
}

function decodeWeatherCode(code: number): { label: string; emoji: string } {
  return WMO_CODES[code] ?? { label: 'Unknown', emoji: '🌡️' }
}

function celsiusToFahrenheit(c: number): number {
  return Math.round(c * 9 / 5 + 32)
}

function mmToInches(mm: number): number {
  return Math.round(mm / 25.4 * 100) / 100
}

function kphToMph(kph: number): number {
  return Math.round(kph * 0.621371)
}

function formatTime12h(isoTime: string): string {
  const d = new Date(isoTime)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function generateAlerts(days: DayForecast[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = []

  // Rain alert: any day with >50% precipitation
  const rainyDays = days.filter(d => d.precipProbability >= 50)
  if (rainyDays.length > 0) {
    const worst = rainyDays.reduce((a, b) => a.precipProbability > b.precipProbability ? a : b)
    alerts.push({
      type: 'rain',
      severity: worst.precipProbability >= 70 ? 'warning' : 'info',
      message: rainyDays.length === 1
        ? `Pack the rain fly — ${worst.dayLabel} has a ${worst.precipProbability}% chance of rain`
        : `Rain expected ${rainyDays.length} days — pack rain gear and extra tarps`,
    })
  }

  // Cold alert: any night below 32°F
  const coldNights = days.filter(d => d.lowF <= 32)
  if (coldNights.length > 0) {
    const coldest = coldNights.reduce((a, b) => a.lowF < b.lowF ? a : b)
    alerts.push({
      type: 'cold',
      severity: coldest.lowF <= 20 ? 'warning' : 'info',
      message: `Freezing nights ahead — low of ${coldest.lowF}°F on ${coldest.dayLabel}. Bring your cold-weather bag.`,
    })
  }

  // Heat alert: any day above 95°F
  const hotDays = days.filter(d => d.highF >= 95)
  if (hotDays.length > 0) {
    const hottest = hotDays.reduce((a, b) => a.highF > b.highF ? a : b)
    alerts.push({
      type: 'heat',
      severity: hottest.highF >= 100 ? 'warning' : 'info',
      message: `High of ${hottest.highF}°F on ${hottest.dayLabel} — plan shade, extra water, and limit midday activity`,
    })
  }

  // Wind alert: gusts above 30 mph
  const windyDays = days.filter(d => d.windGustMph >= 30)
  if (windyDays.length > 0) {
    const gustiest = windyDays.reduce((a, b) => a.windGustMph > b.windGustMph ? a : b)
    alerts.push({
      type: 'wind',
      severity: gustiest.windGustMph >= 45 ? 'warning' : 'info',
      message: `Gusts up to ${gustiest.windGustMph} mph on ${gustiest.dayLabel} — stake everything down, consider wind break`,
    })
  }

  // UV alert: index above 8
  const uvDays = days.filter(d => d.uvIndexMax >= 8)
  if (uvDays.length > 0) {
    alerts.push({
      type: 'uv',
      severity: 'info',
      message: `High UV index (${uvDays[0].uvIndexMax}+) — sunscreen, hat, and shade are essential`,
    })
  }

  return alerts
}

/**
 * Fetch weather forecast for a location and date range from Open-Meteo.
 * Returns daily data for each day in the range.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'precipitation_sum',
      'weather_code',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'uv_index_max',
      'sunrise',
      'sunset',
    ].join(','),
    temperature_unit: 'celsius', // we convert to F ourselves for precision
    wind_speed_unit: 'kmh',
    precipitation_unit: 'mm',
    timezone: 'auto',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Open-Meteo API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  const daily = data.daily

  const days: DayForecast[] = daily.time.map((date: string, i: number) => {
    const { label, emoji } = decodeWeatherCode(daily.weather_code[i])
    return {
      date,
      dayLabel: getDayLabel(date),
      highF: celsiusToFahrenheit(daily.temperature_2m_max[i]),
      lowF: celsiusToFahrenheit(daily.temperature_2m_min[i]),
      precipProbability: daily.precipitation_probability_max[i] ?? 0,
      precipInches: mmToInches(daily.precipitation_sum[i] ?? 0),
      weatherCode: daily.weather_code[i],
      weatherLabel: label,
      weatherEmoji: emoji,
      windMaxMph: kphToMph(daily.wind_speed_10m_max[i] ?? 0),
      windGustMph: kphToMph(daily.wind_gusts_10m_max[i] ?? 0),
      uvIndexMax: Math.round(daily.uv_index_max[i] ?? 0),
      sunrise: formatTime12h(daily.sunrise[i]),
      sunset: formatTime12h(daily.sunset[i]),
    }
  })

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    elevation: data.elevation,
    days,
    alerts: generateAlerts(days),
  }
}
