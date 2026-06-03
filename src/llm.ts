// Free, no credit card. Get a key at aistudio.google.com. Rate limits: 30 RPM, 1000 RPD.
const INTENT_SYSTEM_PROMPT = `You turn wedding design search terms into precise Bing image search queries.

The user is searching for wedding inspiration images. Generate 2 or 3 queries that will return beautiful, visually rich results on Bing Images. The images will be used to generate a mood board.

Return only JSON with this shape:
{
  "interpretedIntent": "string",
  "queries": ["string"]
}

Rules:
- Always include "wedding" in each query.
- Use descriptive visual terms: colors, styles, textures, moods, aesthetics.
- Append words like "inspiration", "ideas", "decor", "aesthetic", or "photography" to improve image relevance.
- Keep queries concise (3-6 words).
- Prefer style-specific terms over generic ones.
- Do not use search operators like site:, after:, or OR.`;

function stripJsonFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
}

async function callGeminiJson<T>(apiKey: string, system: string, user: string): Promise<T> {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash-lite',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Gemini returned no content');
  }

  return JSON.parse(stripJsonFences(text)) as T;
}

export async function interpretTopic(
  topic: string,
  apiKey: string,
): Promise<{ interpretedIntent: string; queries: string[] }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = await callGeminiJson<{ interpretedIntent?: string; queries?: string[] }>(
      apiKey,
      INTENT_SYSTEM_PROMPT,
      `Search term: "${topic}". Generate 2 or 3 Bing image search queries for wedding inspiration.`
       // Current date: ${today}
    );

    const queries = Array.isArray(data.queries) ? data.queries.map((query) => String(query).trim()).filter(Boolean) : [];
    console.log('queries', queries);
    return {
      interpretedIntent: data.interpretedIntent || topic,
      queries: queries.length > 0 ? queries.slice(0, 3) : [topic],
    };
  } catch {
    return { interpretedIntent: topic, queries: [topic] };
  }
}
