import type { Channel, NewPost, Post } from '../core/types';

/** What the renderer may know about the Buffer connection. The key itself never leaves the main process. */
export interface BufferSettingsView {
  configured: boolean;
  /** Where the active settings come from. Environment variables win over saved settings. */
  source: 'environment' | 'saved' | 'none';
  organizationId: string | null;
  /** The key with everything but its last four characters hidden, or null when not configured. */
  apiKeyHint: string | null;
  /** False on machines without OS-level encryption, where a key cannot be saved safely. */
  secureStorageAvailable: boolean;
}

export interface BufferSettingsInput {
  apiKey: string;
  organizationId: string;
}

/** The API the preload script exposes to the renderer as `window.dispatch`. */
export interface DispatchBridge {
  /** The OS the desktop app runs on, e.g. "darwin". The top bar makes room for macOS's window controls. */
  readonly platform: string;
  getSettings(): Promise<BufferSettingsView>;
  saveSettings(input: BufferSettingsInput): Promise<BufferSettingsView>;
  clearSettings(): Promise<BufferSettingsView>;
  listChannels(): Promise<Channel[]>;
  listPosts(channelIds: string[]): Promise<Post[]>;
  schedulePost(post: NewPost): Promise<Post>;
}

export const BRIDGE_CHANNELS = {
  settingsGet: 'dispatch:settings:get',
  settingsSave: 'dispatch:settings:save',
  settingsClear: 'dispatch:settings:clear',
  channels: 'dispatch:channels',
  posts: 'dispatch:posts',
  schedule: 'dispatch:schedule',
} as const;
