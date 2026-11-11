import type { Channel, Post } from '../core/types';
import { columnsByChannel } from '../core/timeline';
import { PlatformMark, StatusBadge } from './brand';
import { formatDue } from './format';

/** Landscape layout: one column per platform channel, each newest first. */
export function Columns({ posts, channels }: { posts: Post[]; channels: Channel[] }) {
  const columns = columnsByChannel(channels, posts);
  if (columns.length === 0) {
    return (
      <div className="empty">
        <p className="empty-headline">No channels connected</p>
        <p>Connect a channel in Buffer, then refresh. Each one gets a column here.</p>
      </div>
    );
  }

  return (
    <div className="columns">
      {columns.map(({ channel, posts: columnPosts }) => (
        <section key={channel.id} className="column" aria-label={channel.name}>
          <h2 className="column-head">
            <PlatformMark service={channel.service} />
            <span className="column-name">{channel.name}</span>
            <span className="column-count">{columnPosts.length}</span>
          </h2>
          {columnPosts.length === 0 ? (
            <p className="column-empty">Nothing scheduled.</p>
          ) : (
            <ol className="column-list">
              {columnPosts.map((post) => (
                <li key={post.id} className="card">
                  <div className="card-meta">
                    {post.dueAt === null ? (
                      <span className="due due-queued">{formatDue(null)}</span>
                    ) : (
                      <time className="due" dateTime={post.dueAt}>
                        {formatDue(post.dueAt)}
                      </time>
                    )}
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="post-text">{post.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
