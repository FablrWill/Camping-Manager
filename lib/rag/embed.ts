import { VoyageAIClient } from 'voyageai';

let client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (!client) {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error('VOYAGE_API_KEY environment variable is required');
    client = new VoyageAIClient({ apiKey });
  }
  return client;
}

/**
 * Embed an array of text strings using voyage-3-lite (512 dimensions).
 * Batches automatically — pass up to 25 texts at once.
 * Returns Float32Array[] in same order as input.
 */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const c = getClient();
  const result = await c.embed({
    input: texts,
    model: 'voyage-3-lite',
  });
  // voyageai SDK v0.2.1 returns { data: [{ embedding: number[] }] }
  return result.data!.map((d) => new Float32Array(d.embedding!));
}
