import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSettingsStore, type SecretCodec } from './settings-store';

// A stand-in for Electron's safeStorage: it is reversible but not secret.
const fakeCodec: SecretCodec = {
  available: () => true,
  encrypt: (plain) => `enc:${Buffer.from(plain).toString('base64')}`,
  decrypt: (cipher) => Buffer.from(cipher.replace(/^enc:/, ''), 'base64').toString('utf8'),
};

describe('settings store', () => {
  let dir: string;
  let filePath: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'dispatch-settings-'));
    filePath = path.join(dir, 'settings.json');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips the key and organization id', () => {
    const store = createSettingsStore({ filePath, codec: fakeCodec });
    store.write({ apiKey: 'secret-key-1234', organizationId: 'org_1' });
    expect(store.read()).toEqual({ apiKey: 'secret-key-1234', organizationId: 'org_1' });
  });

  it('never writes the key in plain text', () => {
    const store = createSettingsStore({ filePath, codec: fakeCodec });
    store.write({ apiKey: 'secret-key-1234', organizationId: 'org_1' });
    expect(readFileSync(filePath, 'utf8')).not.toContain('secret-key-1234');
  });

  it('refuses to save when secure storage is unavailable', () => {
    const store = createSettingsStore({
      filePath,
      codec: { ...fakeCodec, available: () => false },
    });
    expect(() => store.write({ apiKey: 'k', organizationId: 'org' })).toThrow(/Secure storage/);
    expect(store.read()).toBeNull();
  });

  it('returns null for a missing or corrupt file', () => {
    const store = createSettingsStore({ filePath, codec: fakeCodec });
    expect(store.read()).toBeNull();
    writeFileSync(filePath, '{not json');
    expect(store.read()).toBeNull();
  });

  it('clear removes the saved settings', () => {
    const store = createSettingsStore({ filePath, codec: fakeCodec });
    store.write({ apiKey: 'k', organizationId: 'org' });
    store.clear();
    expect(store.read()).toBeNull();
  });
});
