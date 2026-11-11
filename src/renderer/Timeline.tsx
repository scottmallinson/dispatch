import type { Channel, Post } from '../core/types';
import { consolidatedTimeline } from '../core/timeline';
import { PlatformMark, StatusBadge } from './brand';
import { dueParts } from './format';

/** The publish time in the time column: day above, clock time below, right-aligned. */
export function DueTime({ dueAt }: { dueAt: string | null }) {
  const parts = dueParts(dueAt);
  if (!parts) return <span className="due due-queued">Next free slot</span>;
  return (
    <time className="due" dateTime={dueAt ?? undefined}>
      <span className="due-day">{parts.day}</span> <span className="due-time">{parts.time}</span>
    </time>
  );
}

/** Portrait layout: all posts in one list, newest first. */
export function Timeline({ posts, channels }: { posts: Post[]; channels: Channel[] }) {
  const byId = new Map(channels.map((c) => [c.id, c]));
  const items = consolidatedTimeline(posts);

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="section-head">
        <h2 id="timeline-title">Timeline</h2>
        <span className="section-meta">
          Newest first · {items.length} {items.length === 1 ? 'post' : 'posts'}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="empty">
          <p className="empty-headline">Nothing scheduled</p>
          <p>Write a post above and choose its channels. It appears here once Buffer has it.</p>
        </div>
      ) : (
        <ol className="timeline-list">
          {items.map((post) => {
            const channel = byId.get(post.channelId);
            return (
              <li key={post.id} className="timeline-item">
                <DueTime dueAt={post.dueAt} />
                <div className="timeline-body">
                  <div className="post-meta">
                    <PlatformMark service={channel?.service ?? 'unknown'} />
                    <span className="post-channel">{channel?.name ?? post.channelId}</span>
                    <StatusBadge status={post.status} />
                  </div>
                  <p className="post-text">{post.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
