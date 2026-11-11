import { describe, expect, it } from 'vitest';
import { channelLabels, platformFor } from './platforms';
import { describeStatus } from './status';

describe('platformFor', () => {
  it('uses the same marks and colour slots as Bureau', () => {
    expect(platformFor('bluesky')).toEqual({ label: 'Bluesky', short: 'BS', slot: 3 });
    expect(platformFor('mastodon')).toEqual({ label: 'Mastodon', short: 'MA', slot: 7 });
    expect(platformFor('LinkedIn')).toEqual({ label: 'LinkedIn', short: 'LI', slot: 2 });
  });

  it('puts services it does not know in slot 0 with a neutral mark', () => {
    expect(platformFor('youtube')).toEqual({ label: 'Youtube', short: '··', slot: 0 });
    expect(platformFor('unknown')).toEqual({ label: 'Other', short: '··', slot: 0 });
  });
});

describe('channelLabels', () => {
  it('names a channel by its platform, adding the account when a platform repeats', () => {
    const labels = channelLabels([
      { id: '1', name: 'bureau', service: 'bluesky' },
      { id: '2', name: 'Bureau', service: 'linkedin' },
      { id: '3', name: 'Scott', service: 'linkedin' },
    ]);
    expect([...labels.values()]).toEqual(['Bluesky', 'LinkedIn (Bureau)', 'LinkedIn (Scott)']);
  });
});

describe('describeStatus', () => {
  it('maps Buffer statuses to a word and a tone', () => {
    expect(describeStatus('scheduled')).toEqual({ label: 'Scheduled', tone: 'accent' });
    expect(describeStatus('sent')).toEqual({ label: 'Sent', tone: 'ok' });
    expect(describeStatus('error')).toEqual({ label: 'Failed', tone: 'danger' });
    expect(describeStatus('needs_approval')).toEqual({ label: 'Needs approval', tone: 'warn' });
  });

  it('shows an unfamiliar status as words, in a neutral tone', () => {
    expect(describeStatus('IN_REVIEW')).toEqual({ label: 'In review', tone: 'neutral' });
    expect(describeStatus('')).toEqual({ label: 'Unknown', tone: 'neutral' });
  });
});
