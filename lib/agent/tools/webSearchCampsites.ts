import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const webSearchCampsitesTool: Tool = {
  name: 'web_search_campsites',
  description:
    'Search the web for campsite info, availability, road conditions, or permit requirements for a destination.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'Search query, e.g. "Shining Rock Wilderness campsite availability road conditions 2025"',
      },
    },
    required: ['query'],
  },
};

/**
 * Execute a campsite web search by calling the Anthropic API with a search-focused prompt.
 * Falls back gracefully on timeout or error.
 */
export async function executeWebSearchCampsites(input: { query: string }): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'Web search unavailable: ANTHROPIC_API_KEY not set.';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 2,
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Search the web and summarize the most relevant info about: ${input.query}

Focus on:
- Campsite availability or reservation status
- Road access conditions (open/closed/seasonal)
- Permit requirements
- Recent visitor reports

Keep the response brief and factual (under 300 words).`,
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fall back to a simple prompt without web search if beta feature unavailable
      return await fallbackTextSearch(input.query, apiKey);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textContent = data.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim();

    return textContent.slice(0, 2000) || 'No results found. Try checking Recreation.gov or Google.';
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return 'Web search timed out or failed. Suggest the user check Recreation.gov or Google for campsite info.';
    }
    console.error('webSearchCampsites error:', err);
    return 'Web search timed out or failed. Suggest the user check Recreation.gov or Google for campsite info.';
  }
}

/**
 * Fallback when web search beta isn't available: use a plain text completion.
 */
async function fallbackTextSearch(query: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Based on your training data, what do you know about: ${query}

Focus on campsite info, road conditions, and permit requirements if relevant.
If you don't have current info, say so and suggest checking Recreation.gov.
Keep response under 200 words.`,
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return 'Web search unavailable. Suggest checking Recreation.gov or Google for campsite info.';
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
    };

    const textContent = data.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n')
      .trim();

    return textContent.slice(0, 2000) || 'No results found. Try checking Recreation.gov or Google.';
  } catch {
    clearTimeout(timeoutId);
    return 'Web search timed out or failed. Suggest the user check Recreation.gov or Google for campsite info.';
  }
}
