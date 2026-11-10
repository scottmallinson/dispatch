import type { Channel, Post } from '../core/types';
import { consolidatedTimeline } from '../core/timeline';
import { formatDue } from './format';

/** Portrait layout: all posts in one list, ordered by publish time. */
export function Timeline({ posts, channels }: { posts: Post[]; channels: Channel[] }) {
  const names = new Map(channels.map((c) => [c.id, c]));
  const items = consolidatedTimeline(posts);
  if (items.length === 0) return <p className="empty">No scheduled posts.</p>;

  return (
    <ol className="timeline">
      {items.map((post) => {
        const channel = names.get(post.channelId);
        return (
          <li key={post.id} className="post">
            <time dateTime={post.dueAt ?? undefined}>{formatDue(post.dueAt)}</time>
            <span className="channel">
              {channel ? `${channel.name} · ${channel.service}` : post.channelId}
            </span>
            <p>{post.text}</p>
            <span className="status">{post.status}</span>
          </li>
        );
      })}
    </ol>
  );
}
