/** The design system's state tones. Colour never carries the meaning alone: the label does. */
export type StatusTone = 'accent' | 'ok' | 'warn' | 'danger' | 'neutral';

export interface StatusView {
  label: string;
  tone: StatusTone;
}

const KNOWN: Record<string, StatusView> = {
  scheduled: { label: 'Scheduled', tone: 'accent' },
  sending: { label: 'Sending', tone: 'accent' },
  sent: { label: 'Sent', tone: 'ok' },
  error: { label: 'Failed', tone: 'danger' },
  needs_approval: { label: 'Needs approval', tone: 'warn' },
  draft: { label: 'Draft', tone: 'neutral' },
};

/** Turns a Buffer post status into the word and tone the UI shows. */
export function describeStatus(status: string): StatusView {
  const known = KNOWN[status.toLowerCase()];
  if (known) return known;
  const words = status.replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (words === '') return { label: 'Unknown', tone: 'neutral' };
  return { label: words.charAt(0).toUpperCase() + words.slice(1), tone: 'neutral' };
}
