import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get weather forecast for a camping location by coordinates. Returns daily forecast with temperature, precipitation, wind, and UV data.',
  input_schema: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude of the location' },
      longitude: { type: 'number', description: 'Longitude of the location' },
      days: { type: 'number', description: 'Number of forecast days (default 7, max 14)' },
    },
    required: ['latitude', 'longitude'],
  },
};

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    windspeed_10m_max: number[];
    uv_index_max: number[];
    weathercode: number[];
  };
}

export async function executeWeatherTool(input: { latitude: number; longitude: number; days?: number }) {
  const days = Math.min(input.days ?? 7, 14);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max,weathercode&forecast_days=${days}&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

  const data = await res.json() as OpenMeteoResponse;

  return {
    location: { latitude: input.latitude, longitude: input.longitude },
    forecast: data.daily.time.map((date, i) => ({
      date,
      highF: Math.round(data.daily.temperature_2m_max[i]),
      lowF: Math.round(data.daily.temperature_2m_min[i]),
      precipPct: data.daily.precipitation_probability_max[i],
      windMph: Math.round(data.daily.windspeed_10m_max[i]),
      uvIndex: data.daily.uv_index_max[i],
      weatherCode: data.daily.weathercode[i],
    })),
  };
}
