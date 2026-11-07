import type { Customer } from './types';
export type MsgType = 'sms' | 'email' | 'dealer';
export type Tone = 'friendly' | 'professional' | 'concise';

export function buildMessage(c: Customer, type: MsgType, tone: Tone) {
  const { v } = c;
  if (type === 'dealer')
    return `Hello, my name is ${c.first} from ${c.city}, TX. I drive a ${v.model_year} Toyota ${v.model} ${v.trim} with about ${v.odometer_now.toLocaleString()} miles. I'd like a trade-in estimate and a look at monthly payments on a newer Toyota. When could we talk?`;
  const open = { friendly: `Hi ${c.first}! `, professional: `Hello ${c.first}, `, concise: `${c.first}: ` }[tone];
  const body = tone === 'concise' ? c.best.msg.split('. ')[0].replace(/\.$/, '') + '.' : c.best.msg;
  const close = { friendly: ' Want to take a look?', professional: ' Please let us know if you would like to review your options.', concise: '' }[tone];
  return type === 'email' ? `Subject: Your Toyota ${v.model}: a next step worth a look\n\n${open}${body}${close}\n\nToyota Financial Services` : open + body + close;
}
