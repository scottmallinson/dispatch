import { describe, expect, it, vi } from 'vitest';
import { describeOutcome, joinNames, scheduleEach } from './schedule';
import type { NewPost } from './types';

const post = (channelId: string): NewPost => ({ channelId, text: 'Hi', dueAt: null });
const labels: Record<string, string> = { bsky: 'Bluesky', masto: 'Mastodon', li: 'LinkedIn' };
const labelFor = (id: string) => labels[id] ?? id;

describe('scheduleEach', () => {
  it('sends one post at a time, in order, and keeps going after a failure', async () => {
    const calls: string[] = [];
    const schedule = vi.fn(async (p: NewPost) => {
      calls.push(p.channelId);
      if (p.channelId === 'masto') throw new Error('Text is too long.');
    });
    const outcome = await scheduleEach([post('bsky'), post('masto'), post('li')], schedule);
    expect(calls).toEqual(['bsky', 'masto', 'li']);
    expect(outcome).toEqual({
      scheduled: ['bsky', 'li'],
      failed: [{ channelId: 'masto', error: 'Text is too long.' }],
    });
  });

  it('never runs two requests at once', async () => {
    let running = 0;
    let peak = 0;
    const schedule = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
    };
    await scheduleEach([post('a'), post('b'), post('c')], schedule);
    expect(peak).toBe(1);
  });

  it('names a failure that carries no message', async () => {
    const outcome = await scheduleEach([post('a')], () => Promise.reject('nope'));
    expect(outcome.failed).toEqual([{ channelId: 'a', error: 'Buffer refused the post.' }]);
  });
});

describe('joinNames', () => {
  it('joins names the way a sentence does', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['A'])).toBe('A');
    expect(joinNames(['A', 'B'])).toBe('A and B');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
  });
});

describe('describeOutcome', () => {
  it('names every channel and the time when all succeed', () => {
    expect(
      describeOutcome({ scheduled: ['bsky', 'masto', 'li'], failed: [] }, labelFor, 'Thu 09:00'),
    ).toEqual({ ok: true, message: 'Scheduled on Bluesky, Mastodon and LinkedIn for Thu 09:00.' });
  });

  it('says what went through, what Buffer refused, and what to do next', () => {
    expect(
      describeOutcome(
        { scheduled: ['bsky'], failed: [{ channelId: 'masto', error: 'Text is too long.' }] },
        labelFor,
        'the next free slot',
      ),
    ).toEqual({
      ok: false,
      message:
        'Scheduled on Bluesky. Buffer refused the post on Mastodon: Text is too long. ' +
        'The post is still here with that channel selected, so you can try again.',
    });
  });

  it('lists each refusal when several channels fail', () => {
    const { ok, message } = describeOutcome(
      {
        scheduled: [],
        failed: [
          { channelId: 'masto', error: 'Too long' },
          { channelId: 'li', error: 'Expired token.' },
        ],
      },
      labelFor,
      'the next free slot',
    );
    expect(ok).toBe(false);
    expect(message).toBe(
      'Buffer refused the post on Mastodon (Too long) and LinkedIn (Expired token). ' +
        'The post is still here with those channels selected, so you can try again.',
    );
  });
});
