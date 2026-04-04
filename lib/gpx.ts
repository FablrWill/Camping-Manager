/**
 * GPX file parser — extracts waypoints and track points from GPX XML.
 * No external dependencies; uses regex parsing for the simple GPX schema.
 */

export interface GpxWaypoint {
  name: string | null
  description: string | null
  lat: number
  lon: number
  elevation: number | null
  time: string | null
}

export interface GpxTrackPoint {
  lat: number
  lon: number
  elevation: number | null
  time: string | null
}

export interface GpxTrack {
  name: string | null
  points: GpxTrackPoint[]
}

export interface GpxData {
  name: string | null
  waypoints: GpxWaypoint[]
  tracks: GpxTrack[]
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function extractAttr(xml: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`)
  const match = xml.match(regex)
  return match ? match[1] : null
}

function parsePoint(xml: string): { lat: number; lon: number; elevation: number | null; time: string | null; name: string | null; description: string | null } {
  const lat = parseFloat(extractAttr(xml, 'lat') ?? '')
  const lon = parseFloat(extractAttr(xml, 'lon') ?? '')
  const eleStr = extractTag(xml, 'ele')
  const elevation = eleStr ? parseFloat(eleStr) : null
  const time = extractTag(xml, 'time')
  const name = extractTag(xml, 'name')
  const description = extractTag(xml, 'desc') ?? extractTag(xml, 'cmt')

  return {
    lat: isNaN(lat) ? 0 : lat,
    lon: isNaN(lon) ? 0 : lon,
    elevation: elevation !== null && !isNaN(elevation) ? elevation : null,
    time,
    name,
    description,
  }
}

export function parseGpx(xml: string): GpxData {
  const gpxName = extractTag(xml, 'name')

  // Parse waypoints (<wpt>)
  const wptRegex = /<wpt\b[^>]*>[\s\S]*?<\/wpt>/g
  const waypoints: GpxWaypoint[] = []
  let wptMatch: RegExpExecArray | null
  while ((wptMatch = wptRegex.exec(xml)) !== null) {
    const p = parsePoint(wptMatch[0])
    waypoints.push({
      name: p.name,
      description: p.description,
      lat: p.lat,
      lon: p.lon,
      elevation: p.elevation,
      time: p.time,
    })
  }

  // Parse tracks (<trk> → <trkseg> → <trkpt>)
  const trkRegex = /<trk\b[^>]*>[\s\S]*?<\/trk>/g
  const tracks: GpxTrack[] = []
  let trkMatch: RegExpExecArray | null
  while ((trkMatch = trkRegex.exec(xml)) !== null) {
    const trkXml = trkMatch[0]
    const trackName = extractTag(trkXml, 'name')
    const points: GpxTrackPoint[] = []

    const trkptRegex = /<trkpt\b[^>]*>[\s\S]*?<\/trkpt>/g
    let ptMatch: RegExpExecArray | null
    while ((ptMatch = trkptRegex.exec(trkXml)) !== null) {
      const p = parsePoint(ptMatch[0])
      points.push({
        lat: p.lat,
        lon: p.lon,
        elevation: p.elevation,
        time: p.time,
      })
    }

    if (points.length > 0) {
      tracks.push({ name: trackName, points })
    }
  }

  // Also parse routes (<rte> → <rtept>) as tracks
  const rteRegex = /<rte\b[^>]*>[\s\S]*?<\/rte>/g
  let rteMatch: RegExpExecArray | null
  while ((rteMatch = rteRegex.exec(xml)) !== null) {
    const rteXml = rteMatch[0]
    const routeName = extractTag(rteXml, 'name')
    const points: GpxTrackPoint[] = []

    const rteptRegex = /<rtept\b[^>]*>[\s\S]*?<\/rtept>/g
    let ptMatch: RegExpExecArray | null
    while ((ptMatch = rteptRegex.exec(rteXml)) !== null) {
      const p = parsePoint(ptMatch[0])
      points.push({
        lat: p.lat,
        lon: p.lon,
        elevation: p.elevation,
        time: p.time,
      })
    }

    if (points.length > 0) {
      tracks.push({ name: routeName ?? 'Route', points })
    }
  }

  return { name: gpxName, waypoints, tracks }
}
