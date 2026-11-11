import { describe, expect, it } from 'vitest';
import { columnsByChannel, consolidatedTimeline } from './timeline';
import { orientationFor } from './layout';
import type { Channel, Post } from './types';

const post = (id: string, channelId: string, dueAt: string | null): Post => ({
  id,
  channelId,
  text: id,
  dueAt,
  status: 'scheduled',
});

const channels: Channel[] = [
  { id: 'bsky', name: 'Bluesky', service: 'bluesky' },
  { id: 'masto', name: 'Mastodon', service: 'mastodon' },
  { id: 'empty', name: 'Empty', service: 'linkedin' },
];

describe('consolidatedTimeline', () => {
  it('puts the newest post first, with posts queued without a time above them all', () => {
    const posts = [
      post('late', 'masto', '2026-11-12T09:00:00.000Z'),
      post('queued', 'bsky', null),
      post('early', 'bsky', '2026-11-10T09:00:00.000Z'),
    ];
    expect(consolidatedTimeline(posts).map((p) => p.id)).toEqual(['queued', 'late', 'early']);
  });

  it('keeps the original order for unscheduled posts and for posts due at the same time', () => {
    const posts = [
      post('a', 'bsky', null),
      post('b', 'masto', null),
      post('c', 'bsky', '2026-11-10T09:00:00.000Z'),
      post('d', 'masto', '2026-11-10T09:00:00.000Z'),
    ];
    expect(consolidatedTimeline(posts).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not mutate its input', () => {
    const posts = [
      post('late', 'masto', '2026-11-12T09:00:00.000Z'),
      post('early', 'bsky', '2026-11-10T09:00:00.000Z'),
    ];
    consolidatedTimeline(posts);
    expect(posts.map((p) => p.id)).toEqual(['late', 'early']);
  });
});

describe('columnsByChannel', () => {
  it('gives every channel a column in the order channels were listed, even when empty', () => {
    const columns = columnsByChannel(channels, [post('m', 'masto', '2026-11-10T09:00:00.000Z')]);
    expect(columns.map((c) => c.channel.id)).toEqual(['bsky', 'masto', 'empty']);
    expect(columns[0].posts).toEqual([]);
    expect(columns[1].posts.map((p) => p.id)).toEqual(['m']);
    expect(columns[2].posts).toEqual([]);
  });

  it('sorts posts within each column newest first', () => {
    const columns = columnsByChannel(channels, [
      post('sooner', 'bsky', '2026-11-10T09:00:00.000Z'),
      post('later', 'bsky', '2026-11-12T09:00:00.000Z'),
    ]);
    expect(columns[0].posts.map((p) => p.id)).toEqual(['later', 'sooner']);
  });

  it('adds a column for posts on a channel it does not know', () => {
    const columns = columnsByChannel(channels, [post('x', 'ghost-channel', null)]);
    const last = columns[columns.length - 1];
    expect(last.channel).toEqual({
      id: 'ghost-channel',
      name: 'ghost-channel',
      service: 'unknown',
    });
    expect(last.posts.map((p) => p.id)).toEqual(['x']);
  });
});

describe('orientationFor', () => {
  it('is portrait only when the window is taller than it is wide', () => {
    expect(orientationFor(400, 800)).toBe('portrait');
    expect(orientationFor(800, 400)).toBe('landscape');
    expect(orientationFor(600, 600)).toBe('landscape');
  });
});
