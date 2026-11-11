import { app, safeStorage } from 'electron';
import path from 'node:path';
import {
  createSettingsStore,
  type SettingsStore,
  type StoredBufferSettings,
} from './settings-store';

const safeStorageCodec = {
  available: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plain: string) => safeStorage.encryptString(plain).toString('base64'),
  decrypt: (cipher: string) => safeStorage.decryptString(Buffer.from(cipher, 'base64')),
};

export function secureStorageAvailable(): boolean {
  return safeStorageCodec.available();
}

export function settingsStore(): SettingsStore {
  return createSettingsStore({
    filePath: path.join(app.getPath('userData'), 'settings.json'),
    codec: safeStorageCodec,
  });
}

export interface ActiveConfig extends StoredBufferSettings {
  source: 'environment' | 'saved';
}

/** Environment variables win over saved settings, as they do in Bureau. */
export function activeConfig(): ActiveConfig | null {
  const apiKey = process.env.BUFFER_API_KEY;
  const organizationId = process.env.BUFFER_ORGANIZATION_ID;
  if (apiKey && organizationId) return { source: 'environment', apiKey, organizationId };

  const saved = settingsStore().read();
  return saved ? { source: 'saved', ...saved } : null;
}
