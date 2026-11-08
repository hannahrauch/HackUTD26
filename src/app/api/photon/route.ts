import { NextResponse } from 'next/server';
import { Photon } from '@photon-ai/api';
import customers from '@/data/customers.json';
import { logMessage, readStore } from '@/lib/store';

type C = { id: string; consent: boolean; vuln: boolean };

/**
 * Sends a dealer-approved text through Photon. Only the dealership can send:
 * the customer view never calls this route, and the route refuses requests without the dealer role.
 */
export async function POST(req: Request) {
  const { customerId, text, template } = (await req.json()) as { customerId?: string; text?: string; template?: string };
  const role = req.headers.get('x-role');
  const c = (customers as C[]).find(x => x.id === customerId);

  if (role !== 'dealer') return NextResponse.json({ error: 'Only the dealership can send messages.' }, { status: 403 });
  if (!c || !text) return NextResponse.json({ error: 'Unknown customer or empty message.' }, { status: 400 });

  const record = (status: 'sent' | 'failed' | 'blocked', detail?: string) =>
    logMessage({ customerId: c.id, text, template: template ?? 'custom', status, detail });

  // Flags set by the dealership win over the data pack. A saved search with consent also counts.
  const rec = (await readStore()).customers[c.id];
  const consent = rec?.flags?.consent ?? c.consent;
  const hasConsent = consent;
  if (!hasConsent) {
    await record('blocked', 'No consent on file');
    return NextResponse.json({ error: 'Outreach blocked: no marketing consent on file.' }, { status: 403 });
  }

  const key = process.env.PHOTON_API_KEY;
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const myPhone = process.env.DEMO_PHONE;        // must be +17143980088 (the handle on the Photon page)
  const linePhone = process.env.PHOTON_LINE_PHONE ?? '+16282634622'; // the Photon shared line (the agent's number)

  if (!key || !projectId || !myPhone) {
    await record('failed', 'Missing Photon settings');
    return NextResponse.json({ error: 'Missing PHOTON_API_KEY, SPECTRUM_PROJECT_ID or DEMO_PHONE in .env.local.' }, { status: 501 });
  }

  const photon = new Photon({ headers: { Authorization: `Bearer ${key}` } });
  let step = 'start';

  try {
    // 1. Photon "users": the agent (the 628 line) and you (the 714 phone)
    step = 'createOrGetUser (agent line)';
    const agent: any = await photon.projects.createOrGetUser({
      path: { id: projectId },
      body: { handle: linePhone, platform: 'imessage' },
    });
    step = 'createOrGetUser (you)';
    const user: any = await photon.projects.createOrGetUser({
      path: { id: projectId },
      body: { handle: myPhone, platform: 'imessage' },
    });
    console.log('[photon] agent user:', agent?.id, 'your user:', user?.id);

    // 2. Open (or reuse) the conversation with that user
    step = 'createOrGetSpace';
    const space: any = await photon.projects.createOrGetSpace({
      path: { id: projectId },
      headers: { 'idempotency-key': `space-${myPhone}` },
      // iMessage spaces need at least 2 people: the agent first, then you
      body: { platform: 'imessage', participantIds: [agent.id, user.id] },
    });
    console.log('[photon] space:', space?.id);

    // 3. Send the text
    step = 'sendMessage';
    const sent: any = await photon.projects.sendMessage({
      path: { id: projectId },
      headers: { 'idempotency-key': `outreach-${customerId}-${Date.now()}` },
      body: {
        spaceId: space.id,
        senderId: agent.id,
        content: { type: 'text', format: 'plain', text },
      },
    });
    console.log('[photon] sent:', sent?.id);

    await record('sent', `Photon message ${sent?.id ?? ''}`.trim());
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // This is the important part: print WHY it failed
    console.error(`[photon] failed at step "${step}"`, { status: e?.status, code: e?.body?.code, body: e?.body, message: e?.message });
    const detail = `Failed at ${step}: ${e?.body?.code ?? ''} ${e?.body?.detail ?? e?.message ?? ''}`.trim();
    await record('failed', detail);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
