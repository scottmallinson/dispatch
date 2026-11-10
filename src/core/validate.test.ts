import { describe, expect, it } from 'vitest';
import { validateNewPost } from './validate';

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe('validateNewPost', () => {
  it('accepts a queued post and trims the channel id', () => {
    expect(validateNewPost({ channelId: ' bsky ', text: 'Hello', dueAt: null })).toEqual({
      ok: true,
      value: { channelId: 'bsky', text: 'Hello', dueAt: null },
    });
  });

  it('normalises a future publish time to UTC ISO 8601', () => {
    const result = validateNewPost({ channelId: 'bsky', text: 'Hi', dueAt: future });
    expect(result).toEqual({
      ok: true,
      value: { channelId: 'bsky', text: 'Hi', dueAt: new Date(future).toISOString() },
    });
  });

  it('rejects a missing channel, empty text, bad dates and past times', () => {
    expect(validateNewPost({ channelId: '', text: 'x', dueAt: null })).toMatchObject({ ok: false });
    expect(validateNewPost({ channelId: 'bsky', text: '   ', dueAt: null })).toMatchObject({
      ok: false,
    });
    expect(validateNewPost({ channelId: 'bsky', text: 'x', dueAt: 'tomorrow' })).toMatchObject({
      ok: false,
    });
    expect(
      validateNewPost({ channelId: 'bsky', text: 'x', dueAt: '2020-01-01T00:00:00Z' }),
    ).toMatchObject({
      ok: false,
      error: 'The publish time must be in the future.',
    });
    expect(validateNewPost(null)).toMatchObject({ ok: false });
  });
});
