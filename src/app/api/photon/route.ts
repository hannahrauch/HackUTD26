import { NextResponse } from 'next/server';
import { Photon } from '@photon-ai/api';
import customers from '@/data/customers.json';

type C = { id: string; consent: boolean; vuln: boolean };

export async function POST(req: Request) {
  const { customerId, text } = (await req.json()) as { customerId?: string; text?: string };
  const c = (customers as C[]).find(x => x.id === customerId);

  if (!c || !text) return NextResponse.json({ error: 'Unknown customer or empty message.' }, { status: 400 });
  if (!c.consent || c.vuln) return NextResponse.json({ error: 'Outreach blocked: no consent or customer flagged for extra care.' }, { status: 403 });

  const key = process.env.PHOTON_API_KEY;
  const projectId = process.env.SPECTRUM_PROJECT_ID;
  const myPhone = process.env.DEMO_PHONE;        // must be +17143980088 (the handle on the Photon page)
  const linePhone = process.env.PHOTON_LINE_PHONE ?? '+16282634622'; // the Photon shared line (the agent's number)

  if (!key || !projectId || !myPhone) {
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // This is the important part: print WHY it failed
    console.error(`[photon] failed at step "${step}"`, { status: e?.status, code: e?.body?.code, body: e?.body, message: e?.message });
    return NextResponse.json(
      { error: `Failed at ${step}: ${e?.body?.code ?? ''} ${e?.body?.detail ?? e?.message ?? ''}`.trim() },
      { status: 502 },
    );
  }
}