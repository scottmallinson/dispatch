import type { NewPost } from './types';

export type ValidationResult = { ok: true; value: NewPost } | { ok: false; error: string };

/** Checks a composer submission before it is sent to Buffer. */
export function validateNewPost(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null)
    return { ok: false, error: 'Post must be an object.' };
  const { channelId, text, dueAt } = input as Record<string, unknown>;

  if (typeof channelId !== 'string' || channelId.trim() === '') {
    return { ok: false, error: 'Choose a channel.' };
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'Write something to post.' };
  }
  if (dueAt !== null && dueAt !== undefined) {
    if (typeof dueAt !== 'string' || Number.isNaN(Date.parse(dueAt))) {
      return { ok: false, error: 'The publish time is not a valid date.' };
    }
    if (Date.parse(dueAt) <= Date.now()) {
      return { ok: false, error: 'The publish time must be in the future.' };
    }
  }

  return {
    ok: true,
    value: {
      channelId: channelId.trim(),
      text,
      dueAt: typeof dueAt === 'string' ? new Date(dueAt).toISOString() : null,
    },
  };
}

export type DraftValidationResult = { ok: true; value: NewPost[] } | { ok: false; error: string };

/**
 * Checks a composer submission that targets one or more channels, and splits it
 * into one post per channel. Duplicate channel ids are sent once.
 */
export function validatePostDraft(input: unknown): DraftValidationResult {
  if (typeof input !== 'object' || input === null)
    return { ok: false, error: 'Post must be an object.' };
  const { channelIds, text, dueAt } = input as Record<string, unknown>;

  if (!Array.isArray(channelIds) || !channelIds.every((id) => typeof id === 'string')) {
    return { ok: false, error: 'Choose at least one channel.' };
  }
  const unique = [...new Set(channelIds.map((id) => id.trim()).filter((id) => id !== ''))];
  if (unique.length === 0) return { ok: false, error: 'Choose at least one channel.' };

  const posts: NewPost[] = [];
  for (const channelId of unique) {
    const result = validateNewPost({ channelId, text, dueAt });
    if (!result.ok) return result;
    posts.push(result.value);
  }
  return { ok: true, value: posts };
}
