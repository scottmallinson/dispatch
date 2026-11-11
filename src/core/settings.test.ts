import { describe, expect, it } from 'vitest';
import { maskApiKey, validateBufferSettings } from './settings';

describe('validateBufferSettings', () => {
  it('trims both fields and accepts a valid pair', () => {
    expect(validateBufferSettings({ apiKey: '  abc123  ', organizationId: ' org_1-x ' })).toEqual({
      ok: true,
      value: { apiKey: 'abc123', organizationId: 'org_1-x' },
    });
  });

  it('rejects a missing key, a key with spaces, and a missing organization id', () => {
    expect(validateBufferSettings({ apiKey: '  ', organizationId: 'org' })).toMatchObject({
      ok: false,
    });
    expect(validateBufferSettings({ apiKey: 'a b', organizationId: 'org' })).toMatchObject({
      ok: false,
    });
    expect(validateBufferSettings({ apiKey: 'key', organizationId: '' })).toMatchObject({
      ok: false,
    });
  });

  it('rejects organization ids with characters that could alter a request', () => {
    expect(validateBufferSettings({ apiKey: 'key', organizationId: 'org"} x' })).toMatchObject({
      ok: false,
      error: 'The organization ID should contain only letters, numbers, - and _.',
    });
  });

  it('rejects non-objects', () => {
    expect(validateBufferSettings(null)).toMatchObject({ ok: false });
    expect(validateBufferSettings('key')).toMatchObject({ ok: false });
  });
});

describe('maskApiKey', () => {
  it('keeps only the last four characters', () => {
    expect(maskApiKey('abcdefgh1234')).toBe('••••1234');
  });

  it('hides short keys completely', () => {
    expect(maskApiKey('abc')).toBe('••••');
  });
});
