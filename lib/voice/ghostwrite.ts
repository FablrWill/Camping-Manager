import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface JournalContext {
  tripName: string
  locationName: string | null
  dates: string
}

export async function ghostwriteJournal(
  transcription: string,
  context: JournalContext
): Promise<string> {
  const { tripName, locationName, dates } = context

  const locationLine = locationName ? ` at ${locationName}` : ''

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are a skilled travel writer ghostwriting a personal camping journal for Will Sink. Will is an outdoor enthusiast based in Asheville, NC who camps in a Santa Fe Hybrid camper.

Your job: take Will's raw voice memo and turn it into a polished, first-person narrative journal entry. Write in Will's voice — direct, honest, observational, not overly poetic. Past tense. 3–5 paragraphs.

Rules:
- Write as "I" — Will's first-person perspective
- Use sensory details from what he described (sounds, smells, sights, temperatures, textures)
- Keep his tone: casual and real, not flowery or travel-blog-precious
- Preserve the specific things he mentioned — don't invent details he didn't mention
- Organize naturally: arrival, the experience itself, highlights, reflection
- End with something honest — a takeaway, a feeling, or what he'd do differently
- Do not include a title or header — just the prose`,
    messages: [
      {
        role: 'user',
        content: `Trip: ${tripName}${locationLine}
Dates: ${dates}

Will's voice memo (raw transcription):
${transcription}

Write the journal entry.`,
      },
    ],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return textBlock.text.trim()
}
