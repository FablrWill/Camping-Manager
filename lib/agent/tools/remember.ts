import { prisma } from '@/lib/db';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const rememberTool: Tool = {
  name: 'remember',
  description:
    "Explicitly store a user preference or fact for future conversations. Use this when the user states a clear preference, constraint, or fact about themselves that should persist (e.g., 'I don't eat fish', 'I prefer car camping over backpacking', 'my dog's name is Biscuit'). Key should always be 'explicit_preferences'. New value is appended to existing preferences — nothing is deleted.",
  input_schema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: "Memory key — always use 'explicit_preferences' for user-stated preferences.",
      },
      value: {
        type: 'string',
        description: 'The preference or fact to remember, as a concise plain-text statement.',
      },
    },
    required: ['key', 'value'],
  },
};

export async function executeRemember(input: {
  key: string;
  value: string;
}): Promise<string> {
  try {
    const { key, value } = input;

    if (!key?.trim() || !value?.trim()) {
      return 'Error: Both key and value are required to remember something.';
    }

    // Append-only: fetch existing value and concatenate
    const existing = await prisma.agentMemory.findUnique({ where: { key } });

    let newValue: string;
    if (existing?.value) {
      newValue = `${existing.value}; ${value.trim()}`;
    } else {
      newValue = value.trim();
    }

    await prisma.agentMemory.upsert({
      where: { key },
      update: { value: newValue },
      create: { key, value: newValue },
    });

    return `Remembered: ${value.trim()}`;
  } catch (error) {
    return `Error: Failed to save memory — ${(error as Error).message}`;
  }
}
