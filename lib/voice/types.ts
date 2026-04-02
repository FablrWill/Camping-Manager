export interface InsightItem {
  text: string
}

export interface GearFeedbackItem {
  text: string
  gearName: string | null  // name of gear item if identifiable from debrief
}

export interface SpotRating {
  locationName: string | null
  rating: number | null  // 1-5, null if not mentioned
}

export interface InsightPayload {
  whatWorked: InsightItem[]
  whatDidnt: InsightItem[]
  gearFeedback: GearFeedbackItem[]
  spotRating: SpotRating
}

export interface ApplyInsightRequest {
  tripId: string
  voiceTranscript?: string  // Raw transcription text for TripFeedback storage
  insights: {
    whatWorked: string[]     // text items to append to trip notes
    whatDidnt: string[]      // text items to append to trip notes
    gearUpdates: { gearId: string; text: string }[]  // append to gear notes
    locationRating: { locationId: string; rating: number } | null  // replace rating
  }
}
