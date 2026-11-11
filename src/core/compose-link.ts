/**
 * The links that open Dispatch's composer with a publish time filled in, such as
 * `dispatch://compose?at=2026-11-12T09%3A00%3A00.000Z`. Bureau builds them from a
 * calendar cell. Nothing in this folder may depend on Node or browser APIs.
 */

/** The scheme Dispatch registers with the operating system. */
export const COMPOSE_SCHEME = 'dispatch';

const COMPOSE_LINK = /^dispatch:\/\/compose\?at=([^&#\s]+)$/;

/** A request to open the composer with `at`, an ISO 8601 UTC time. */
export interface ComposeRequest {
  at: string;
}

/**
 * Reads a compose link. Returns null for anything else, including a time that
 * is not a date, so a stray link from the web can never open the composer.
 */
export function parseComposeLink(link: string): ComposeRequest | null {
  const match = COMPOSE_LINK.exec(link);
  if (!match) return null;
  let raw: string;
  try {
    raw = decodeURIComponent(match[1] ?? '');
  } catch {
    return null;
  }
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return null;
  return { at: new Date(time).toISOString() };
}
