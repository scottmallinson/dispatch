import type { Channel, ChannelColumn, Post } from './types';

/**
 * Portrait layout: every post in one list, soonest first.
 * Posts without a due time sort after the timed ones, in their original order.
 */
export function consolidatedTimeline(posts: readonly Post[]): Post[] {
  return posts
    .map((post, index) => ({ post, index }))
    .sort((a, b) => {
      const aTime = a.post.dueAt === null ? null : Date.parse(a.post.dueAt);
      const bTime = b.post.dueAt === null ? null : Date.parse(b.post.dueAt);
      if (aTime === null && bTime === null) return a.index - b.index;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return aTime - bTime || a.index - b.index;
    })
    .map(({ post }) => post);
}

/**
 * Landscape layout: one column per channel, in the order the channels were given.
 * Every channel gets a column, even when it has no posts. Posts on a channel that
 * is not in the list get a column of their own, labelled with the channel id.
 */
export function columnsByChannel(
  channels: readonly Channel[],
  posts: readonly Post[],
): ChannelColumn[] {
  const known = new Set(channels.map((channel) => channel.id));
  const columns: ChannelColumn[] = channels.map((channel) => ({ channel, posts: [] }));
  const unknown = new Map<string, ChannelColumn>();

  for (const post of posts) {
    if (known.has(post.channelId)) {
      const column = columns.find((c) => c.channel.id === post.channelId);
      column?.posts.push(post);
      continue;
    }
    let column = unknown.get(post.channelId);
    if (!column) {
      column = {
        channel: { id: post.channelId, name: post.channelId, service: 'unknown' },
        posts: [],
      };
      unknown.set(post.channelId, column);
      columns.push(column);
    }
    column.posts.push(post);
  }

  return columns.map((column) => ({ ...column, posts: consolidatedTimeline(column.posts) }));
}
