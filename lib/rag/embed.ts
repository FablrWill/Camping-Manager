// VoyageAI client — dynamically imported to avoid ESM directory-import bug at build time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

async function getClient() {
  if (!client) {
    const apiKey = process.env.VOYAGE_API_KEY;
    if (!apiKey) throw new Error('VOYAGE_API_KEY environment variable is required');
    const { VoyageAIClient } = await import('voyageai');
    client = new VoyageAIClient({ apiKey });
  }
  return client;
}

/**
 * Embed an array of text strings using voyage-3-lite (512 dimensions).
 * Batches automatically — pass up to 25 texts at once.
 * Returns Float32Array[] in same order as input.
 * Retries on 429 rate limit errors with exponential backoff.
 */
export async function embedTexts(texts: string[]): Promise<Float32Array[]> {
  const c = await getClient();
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await c.embed({
        input: texts,
        model: 'voyage-3-lite',
      });
      // voyageai SDK v0.2.1 returns { data: [{ embedding: number[] }] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return result.data!.map((d: any) => new Float32Array(d.embedding!));
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errAny = err as any;
      const isRateLimit =
        (errAny?.statusCode === 429) ||
        (err instanceof Error &&
          (err.message.includes('429') || err.message.includes('Too Many Requests')));
      if (isRateLimit && attempt < MAX_RETRIES) {
        // Free tier: 3 RPM, 10K TPM — need generous delays
        const delay = 25000 * (attempt + 1); // 25s, 50s, 75s, 100s, 125s
        console.log(`  Rate limited, waiting ${delay / 1000}s before retry (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  // Should never reach here
  throw new Error('embedTexts: exhausted retries');
}
