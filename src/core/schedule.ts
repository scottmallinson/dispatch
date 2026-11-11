import type { NewPost } from './types';

/** What happened when one post was sent to several channels. */
export interface ScheduleOutcome {
  scheduled: string[];
  failed: { channelId: string; error: string }[];
}

/**
 * Schedules each post in turn and collects what succeeded and what failed.
 * One post per channel, one at a time: Buffer's createPost has no idempotency
 * key and shares a request quota, so nothing is sent in parallel or retried.
 * A failure on one channel does not stop the others.
 */
export async function scheduleEach(
  posts: readonly NewPost[],
  schedule: (post: NewPost) => Promise<unknown>,
): Promise<ScheduleOutcome> {
  const outcome: ScheduleOutcome = { scheduled: [], failed: [] };
  for (const post of posts) {
    try {
      await schedule(post);
      outcome.scheduled.push(post.channelId);
    } catch (err) {
      const error = err instanceof Error && err.message ? err.message : 'Buffer refused the post.';
      outcome.failed.push({ channelId: post.channelId, error });
    }
  }
  return outcome;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The sentence the composer shows after scheduling. It names the channels and
 * the time, and on a failure says what to do next.
 */
export function describeOutcome(
  outcome: ScheduleOutcome,
  labelFor: (channelId: string) => string,
  when: string,
): { ok: boolean; message: string } {
  const done = joinNames(outcome.scheduled.map(labelFor));
  if (outcome.failed.length === 0) {
    return { ok: true, message: `Scheduled on ${done} for ${when}.` };
  }
  const clean = (error: string) => error.trim().replace(/\.$/, '');
  const [first] = outcome.failed;
  const refused =
    outcome.failed.length === 1 && first
      ? `${labelFor(first.channelId)}: ${clean(first.error)}`
      : joinNames(outcome.failed.map((f) => `${labelFor(f.channelId)} (${clean(f.error)})`));
  const retry =
    outcome.failed.length === 1
      ? 'The post is still here with that channel selected, so you can try again.'
      : 'The post is still here with those channels selected, so you can try again.';
  const prefix = outcome.scheduled.length > 0 ? `Scheduled on ${done}. ` : '';
  return { ok: false, message: `${prefix}Buffer refused the post on ${refused}. ${retry}` };
}
