export type PrepStatus = 'ready' | 'in_progress' | 'not_started'

export interface PrepSection {
  key: string              // extensible string, not union — per D-06
  label: string
  emoji: string
  status: PrepStatus
  summary: string          // collapsed one-liner e.g. "12/28 packed"
  data: unknown            // section-specific payload
}

export interface PrepState {
  tripId: string
  tripName: string
  startDate: string
  endDate: string
  sections: PrepSection[]
  overallReady: boolean
}

export interface SectionConfig {
  key: string
  label: string
  emoji: string
}

export const PREP_SECTIONS: SectionConfig[] = [
  { key: 'weather', label: 'Weather', emoji: '\u{1F324}' },
  { key: 'packing', label: 'Packing List', emoji: '\u{1F392}' },
  { key: 'meals', label: 'Meal Plan', emoji: '\u{1F373}' },
  { key: 'power', label: 'Power Budget', emoji: '\u{1F50B}' },
]
