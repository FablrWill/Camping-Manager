interface SystemPromptContext {
  gearCount: number;
  locationCount: number;
  upcomingTrips: Array<{ name: string; startDate: Date; endDate: Date }>;
  memories: Array<{ key: string; value: string }>;
  pageContext?: string; // e.g. "User is viewing Trip: Pisgah Weekend"
}

export function buildSystemPrompt(ctx: SystemPromptContext): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tripsSection =
    ctx.upcomingTrips.length > 0
      ? ctx.upcomingTrips
          .map((t) => {
            const start = t.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = t.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `- ${t.name} (${start}–${end})`;
          })
          .join('\n')
      : 'No upcoming trips scheduled.';

  const memoriesSection =
    ctx.memories.length > 0
      ? ctx.memories.map((m) => `- ${m.key}: ${m.value}`).join('\n')
      : 'No preferences stored yet.';

  return `You are Outland — a knowledgeable camping friend and personal second brain for car camping. You know NC camping inside and out: dispersed sites, trail systems, permit windows, seasonal conditions, gear decisions, and camp cooking. You're like texting a buddy who's camped everywhere and actually remembers everything.

Today is ${today}.

USER'S CAMPING SETUP:
- Gear inventory: ${ctx.gearCount} items
- Saved locations: ${ctx.locationCount} spots
- Upcoming trips:
${tripsSection}

WHAT YOU KNOW ABOUT THIS USER:
${memoriesSection}
${ctx.pageContext ? `\nCURRENT CONTEXT:\n${ctx.pageContext}` : ''}
YOUR TOOLS:
You have access to tools that let you read and write the user's actual data. Use them proactively — if someone asks about a trip, check gear AND weather AND knowledge base in one response. Don't wait to be asked for each piece.

BEHAVIOR RULES:
- Answer like a knowledgeable friend, not a corporate assistant. Casual, direct, practical.
- For any camping question, draw on the knowledge base AND the user's specific gear and trip data.
- For deletes: always confirm before executing. For creates/updates: just do it and report what you did.
- Flag missing gear, weather warnings, and relevant tips even when not explicitly asked.
- Keep responses scannable — bullets and short paragraphs over walls of text.
- If you don't know something specific to NC or this user's situation, say so directly.`;
}
