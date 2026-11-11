import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface StoredBufferSettings {
  apiKey: string;
  organizationId: string;
}

/** Encrypts secrets before they reach disk. In the app this wraps Electron's safeStorage. */
export interface SecretCodec {
  available(): boolean;
  encrypt(plain: string): string;
  decrypt(cipher: string): string;
}

export interface SettingsStore {
  /** Returns the saved settings, or null when none are saved or the file cannot be read. */
  read(): StoredBufferSettings | null;
  /** Throws when secure storage is unavailable, so a key is never written in plain text. */
  write(settings: StoredBufferSettings): void;
  clear(): void;
}

interface SettingsFile {
  version: 1;
  organizationId: string;
  apiKey: string;
}

export function createSettingsStore(options: {
  filePath: string;
  codec: SecretCodec;
}): SettingsStore {
  const { filePath, codec } = options;

  return {
    read() {
      if (!existsSync(filePath)) return null;
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<SettingsFile>;
        if (
          data.version !== 1 ||
          typeof data.apiKey !== 'string' ||
          typeof data.organizationId !== 'string'
        ) {
          return null;
        }
        return { apiKey: codec.decrypt(data.apiKey), organizationId: data.organizationId };
      } catch {
        return null;
      }
    },

    write(settings) {
      if (!codec.available()) {
        throw new Error(
          'Secure storage is not available on this computer, so the key was not saved.',
        );
      }
      const file: SettingsFile = {
        version: 1,
        organizationId: settings.organizationId,
        apiKey: codec.encrypt(settings.apiKey),
      };
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
    },

    clear() {
      rmSync(filePath, { force: true });
    },
  };
}
