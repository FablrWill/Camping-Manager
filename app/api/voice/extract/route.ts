import { NextRequest, NextResponse } from 'next/server'
import { extractInsights } from '@/lib/voice/extract'

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json()

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json({ error: 'transcription text is required' }, { status: 400 })
    }

    const insights = await extractInsights(transcription)
    return NextResponse.json(insights)
  } catch (error) {
    console.error('Failed to extract insights:', error)
    return NextResponse.json({ error: 'Insight extraction failed' }, { status: 500 })
  }
}
