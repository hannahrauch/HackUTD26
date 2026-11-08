import { NextResponse } from 'next/server';
import { parseIssue } from '@/lib/engine';
import { geminiReady, geminiText } from '@/lib/gemini';
import { REPAIRS } from '@/lib/issues';
import type { IssueItem } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Interprets a free-text vehicle problem the customer types in. Gemini picks a category from the
 * fixed catalog and reads any dollar amount. Cost ranges come from the catalog, never from the model.
 */
export async function POST(req: Request) {
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) return NextResponse.json({ issue: null, source: 'none' });

  if (!geminiReady()) {
    return NextResponse.json({ issue: parseIssue(text), source: 'rules' });
  }

  const names = REPAIRS.map(r => `- ${r.id}: ${r.name}`).join('\n');
  const prompt = `You classify a vehicle problem a Toyota owner describes.
Pick the single best id from this list, or "custom" if none fit, or null if the message is not about a vehicle problem or cost:
${names}

Also return "amount": the dollar figure the user mentioned as a repair cost (a number), or null.
Also return "safety_concern": true if the problem could affect brakes, steering, or driving safety, otherwise false.
Do NOT diagnose the problem or estimate costs. Return JSON only, shaped like:
{"category": "<list id, custom, or null>", "amount": <number or null>, "safety_concern": <true|false>, "reason": "<one short sentence>"}

User message: """${text.slice(0, 500)}"""`;

  try {
    const raw = await geminiText(prompt, { json: true });
    const parsed = JSON.parse(raw) as { category?: string | null; amount?: number | null; safety_concern?: boolean; reason?: string };
    const amount = typeof parsed.amount === 'number' && parsed.amount > 0 ? Math.round(parsed.amount) : null;
    const base = REPAIRS.find(r => r.id === parsed.category);

    let issue: IssueItem | null = null;
    if (base && amount) issue = { ...base, id: `custom-${base.id}-${amount}`, name: base.name, min: Math.round(amount * 0.7), exp: amount, max: Math.round(amount * 1.4) };
    else if (base) issue = base;
    else if (amount) issue = parseIssue(text);
    else if (parsed.category === 'custom') issue = parseIssue(text);

    const reason = [parsed.reason, parsed.safety_concern ? 'This may affect safety: get it inspected before you keep driving.' : '']
      .filter(Boolean).join(' ');
    return NextResponse.json({ issue, reason, source: 'gemini' });
  } catch (e) {
    console.error('[ai/issue] Gemini failed, using rules:', e);
    return NextResponse.json({ issue: parseIssue(text), source: 'rules', warning: 'Gemini was unavailable, so keyword matching was used.' });
  }
}
