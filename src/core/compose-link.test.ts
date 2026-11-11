import { describe, expect, it } from 'vitest';
import { parseComposeLink } from './compose-link';

describe('parseComposeLink', () => {
  it('reads the time Bureau sends, as an ISO 8601 UTC string', () => {
    expect(parseComposeLink('dispatch://compose?at=2026-11-12T09%3A00%3A00.000Z')).toEqual({
      at: '2026-11-12T09:00:00.000Z',
    });
  });

  it('accepts an unencoded time and normalises it to UTC', () => {
    expect(parseComposeLink('dispatch://compose?at=2026-11-12T10:30:00+01:00')).toEqual({
      at: '2026-11-12T09:30:00.000Z',
    });
  });

  it('refuses other links, extra parameters and times that are not dates', () => {
    const refused = [
      'https://example.com/?at=2026-11-12T09:00:00Z',
      'dispatch://settings',
      'dispatch://compose',
      'dispatch://compose?at=',
      'dispatch://compose?at=tomorrow',
      'dispatch://compose?at=2026-11-12T09:00:00Z&text=hello',
      'dispatch://compose?at=2026-11-12T09:00:00Z#x',
      'dispatch://compose?at=%E0%A4%A',
    ];
    for (const link of refused) expect(parseComposeLink(link)).toBeNull();
  });
});
