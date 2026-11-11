/** What the user enters to connect Dispatch to Buffer. */
export interface BufferSettings {
  apiKey: string;
  organizationId: string;
}

export type BufferSettingsResult =
  { ok: true; value: BufferSettings } | { ok: false; error: string };

/**
 * Checks the connect form before anything is sent or stored. The organization id is
 * limited to letters, digits, `-` and `_`, so a typo cannot change the shape of a request.
 */
export function validateBufferSettings(input: unknown): BufferSettingsResult {
  if (typeof input !== 'object' || input === null)
    return { ok: false, error: 'Settings must be an object.' };
  const { apiKey, organizationId } = input as Record<string, unknown>;

  if (typeof apiKey !== 'string' || apiKey.trim() === '') {
    return { ok: false, error: 'Paste your Buffer API key.' };
  }
  if (/\s/.test(apiKey.trim())) {
    return { ok: false, error: 'The API key should not contain spaces.' };
  }
  if (typeof organizationId !== 'string' || organizationId.trim() === '') {
    return { ok: false, error: 'Enter your Buffer organization ID.' };
  }
  const orgId = organizationId.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(orgId)) {
    return {
      ok: false,
      error: 'The organization ID should contain only letters, numbers, - and _.',
    };
  }

  return { ok: true, value: { apiKey: apiKey.trim(), organizationId: orgId } };
}

/** Shows only the last four characters of a secret, for display. */
export function maskApiKey(apiKey: string): string {
  return apiKey.length <= 4 ? '••••' : `••••${apiKey.slice(-4)}`;
}
