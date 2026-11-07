'use client';
import { useEffect, useState } from 'react';
import { buildMessage, type MsgType, type Tone } from '@/lib/messages';
import type { Customer } from '@/lib/types';

export default function Messages({ c }: { c: Customer }) {
  const [type, setType] = useState<MsgType>('sms');
  const [tone, setTone] = useState<Tone>('friendly');
  const [text, setText] = useState('');
  const [ok, setOk] = useState(false);
  const [status, setStatus] = useState<{ good: boolean; msg: string } | null>(null);
  const blocked = !c.consent || c.vuln;

  useEffect(() => { setText(buildMessage(c, type, tone)); setOk(false); setStatus(null); }, [c, type, tone]);

  async function send() {
    setStatus({ good: true, msg: 'Sending...' });
    try {
      const res = await fetch('/api/photon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: c.id, text }) });
      const j = await res.json();
      setStatus({ good: res.ok, msg: res.ok ? 'Sent through Photon.' : j.error ?? `Photon returned status ${j.status}.` });
    } catch { setStatus({ good: false, msg: 'Could not reach the server.' }); }
  }

  const sel = 'ml-2 rounded border border-neutral-400 px-3 py-2';
  return (
    <section id="messages" className="mt-8 rounded-xl border border-neutral-200 p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight">Your Toyota, always one step ahead</h2>
      <p className="mt-1 text-sm text-neutral-600">Review and edit before anything goes out. Nothing is sent without consent and your approval.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label>Type<select className={sel} value={type} onChange={e => setType(e.target.value as MsgType)}><option value="sms">Text message</option><option value="email">Email</option><option value="dealer">Dealership inquiry</option></select></label>
        <label>Tone<select className={sel} value={tone} onChange={e => setTone(e.target.value as Tone)}><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="concise">Concise</option></select></label>
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={8} className="mt-3 w-full rounded border border-neutral-400 p-3" />
      <p className={`mt-3 border-l-4 p-3 text-sm ${blocked ? 'border-warn bg-amber-50' : 'border-pos bg-emerald-50'}`}>
        {blocked ? `Outreach is off for ${c.first}: ${!c.consent ? 'no marketing consent on file' : 'flagged for extra care'}. This is a draft for a human specialist, not an automatic message.` : `${c.first} has given marketing consent. Edit the text, tick the box, then send.`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I reviewed this message</label>
        <button onClick={() => navigator.clipboard.writeText(text)} className="rounded-full border-2 border-black px-6 py-2 font-semibold hover:bg-mist">Copy</button>
        <button disabled={blocked || !ok} onClick={send} className="rounded-full border-2 border-toyota bg-toyota px-6 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-300">Approve and send</button>
      </div>
      {status && <p className={`mt-3 text-sm ${status.good ? 'text-pos' : 'text-toyota'}`}>{status.msg}</p>}
    </section>
  );
}
