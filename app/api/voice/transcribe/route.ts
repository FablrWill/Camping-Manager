import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/voice/transcribe'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Voice transcription requires an OpenAI API key. Add OPENAI_API_KEY to your .env file.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const audioBlob = formData.get('audio') as Blob | null
    const mimeType = (formData.get('mimeType') as string) || 'audio/webm'

    if (!audioBlob) {
      return NextResponse.json({ error: 'audio file is required' }, { status: 400 })
    }

    const transcription = await transcribeAudio(audioBlob, mimeType)
    return NextResponse.json({ transcription })
  } catch (error) {
    console.error('Failed to transcribe audio:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
