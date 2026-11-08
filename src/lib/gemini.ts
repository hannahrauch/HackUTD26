// Server-side only. Reads GEMINI_API_KEY from .env.local; the key never reaches the browser.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';

export const geminiReady = () => Boolean(process.env.GEMINI_API_KEY);

/** Calls the Gemini generateContent REST endpoint and returns the text of the first candidate. */
export async function geminiText(prompt: string, opts: { json?: boolean } = {}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1024,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  });

  // Gemini returns 429 or 503 under load; retry briefly before giving up.
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
    });
    if (res.ok || (res.status !== 429 && res.status !== 503)) break;
    await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
  }

  if (!res || !res.ok) throw new Error(`Gemini returned ${res?.status}: ${(await res?.text())?.slice(0, 200)}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
}
