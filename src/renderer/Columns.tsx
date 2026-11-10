import type { Channel, Post } from '../core/types';
import { columnsByChannel } from '../core/timeline';
import { formatDue } from './format';

/** Landscape layout: one column per platform channel. */
export function Columns({ posts, channels }: { posts: Post[]; channels: Channel[] }) {
  const columns = columnsByChannel(channels, posts);
  if (columns.length === 0) return <p className="empty">No channels connected.</p>;

  return (
    <div
      className="columns"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(14rem, 1fr))` }}
    >
      {columns.map(({ channel, posts: columnPosts }) => (
        <section key={channel.id} className="column" aria-label={channel.name}>
          <h2>
            {channel.name} <span className="service">{channel.service}</span>
          </h2>
          {columnPosts.length === 0 ? (
            <p className="empty">Nothing scheduled.</p>
          ) : (
            <ol>
              {columnPosts.map((post) => (
                <li key={post.id} className="post">
                  <time dateTime={post.dueAt ?? undefined}>{formatDue(post.dueAt)}</time>
                  <p>{post.text}</p>
                  <span className="status">{post.status}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
