import OpenAI from 'openai'

export async function transcribeAudio(audioBlob: Blob, mimeType: string): Promise<string> {
  const ext = mimeType.includes('mp4') ? 'mp4'
            : mimeType.includes('ogg') ? 'ogg'
            : 'webm'

  const file = new File([audioBlob], `recording.${ext}`, { type: mimeType })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  })

  return result.text
}
