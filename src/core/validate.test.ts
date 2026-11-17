import { describe, expect, it } from 'vitest';
import { validateNewPost, validatePostDraft } from './validate';

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe('validateNewPost', () => {
  it('accepts a queued post and trims the channel id', () => {
    expect(validateNewPost({ channelId: ' bsky ', text: 'Hello', dueAt: null })).toEqual({
      ok: true,
      value: { channelId: 'bsky', text: 'Hello', dueAt: null, publishNow: false },
    });
  });

  it('normalises a future publish time to UTC ISO 8601', () => {
    const result = validateNewPost({ channelId: 'bsky', text: 'Hi', dueAt: future });
    expect(result).toEqual({
      ok: true,
      value: {
        channelId: 'bsky',
        text: 'Hi',
        dueAt: new Date(future).toISOString(),
        publishNow: false,
      },
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

describe('validateNewPost with publish now', () => {
  it('accepts a post to publish straight away, with no time', () => {
    expect(validateNewPost({ channelId: 'bsky', text: 'Now', publishNow: true })).toEqual({
      ok: true,
      value: { channelId: 'bsky', text: 'Now', dueAt: null, publishNow: true },
    });
  });

  it('rejects a publish-now post that also names a time', () => {
    expect(
      validateNewPost({ channelId: 'bsky', text: 'Now', dueAt: future, publishNow: true }),
    ).toEqual({ ok: false, error: 'Publish now cannot also have a time.' });
  });
});

describe('validatePostDraft', () => {
  it('splits a draft into one post per channel, dropping duplicates and blanks', () => {
    expect(
      validatePostDraft({ channelIds: ['bsky', ' masto ', 'bsky', ''], text: 'Hi', dueAt: null }),
    ).toEqual({
      ok: true,
      value: [
        { channelId: 'bsky', text: 'Hi', dueAt: null, publishNow: false },
        { channelId: 'masto', text: 'Hi', dueAt: null, publishNow: false },
      ],
    });
  });

  it('gives every post the same normalised publish time', () => {
    const result = validatePostDraft({ channelIds: ['a', 'b'], text: 'Hi', dueAt: future });
    expect(result.ok && result.value.map((p) => p.dueAt)).toEqual([
      new Date(future).toISOString(),
      new Date(future).toISOString(),
    ]);
  });

  it('asks for a channel when none is chosen', () => {
    const error = { ok: false, error: 'Choose at least one channel.' };
    expect(validatePostDraft({ channelIds: [], text: 'Hi', dueAt: null })).toEqual(error);
    expect(validatePostDraft({ channelIds: ['  '], text: 'Hi', dueAt: null })).toEqual(error);
    expect(validatePostDraft({ channelIds: 'bsky', text: 'Hi', dueAt: null })).toEqual(error);
  });

  it('publishes every channel of a publish-now draft straight away', () => {
    expect(
      validatePostDraft({ channelIds: ['a', 'b'], text: 'Hi', dueAt: null, publishNow: true }),
    ).toEqual({
      ok: true,
      value: [
        { channelId: 'a', text: 'Hi', dueAt: null, publishNow: true },
        { channelId: 'b', text: 'Hi', dueAt: null, publishNow: true },
      ],
    });
  });

  it('passes on the first problem with the post itself', () => {
    expect(validatePostDraft({ channelIds: ['a', 'b'], text: ' ', dueAt: null })).toEqual({
      ok: false,
      error: 'Write something to post.',
    });
    expect(validatePostDraft(null)).toMatchObject({ ok: false });
  });
});
