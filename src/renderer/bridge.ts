import type { ComposeRequest } from '../core/compose-link';
import type { UpdateState } from '../core/updates';
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

/** Update controls from the main process. Updates come from GitHub Releases; see electron/updates.ts. */
export interface UpdatesBridge {
  state(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  install(): Promise<void>;
  onChange(listener: (state: UpdateState) => void): () => void;
}

/** The API the preload script exposes to the renderer as `window.dispatch`. */
export interface DispatchBridge {
  /** The OS the desktop app runs on, e.g. "darwin". The top bar makes room for macOS's window controls. */
  readonly platform: string;
  readonly updates: UpdatesBridge;
  getSettings(): Promise<BufferSettingsView>;
  saveSettings(input: BufferSettingsInput): Promise<BufferSettingsView>;
  clearSettings(): Promise<BufferSettingsView>;
  listChannels(): Promise<Channel[]>;
  listPosts(channelIds: string[]): Promise<Post[]>;
  schedulePost(post: NewPost): Promise<Post>;
  /** The compose request waiting for the composer, if any. Taking it clears it. */
  takeComposeRequest(): Promise<ComposeRequest | null>;
  /** Called whenever a new compose request arrives while the app is running. */
  onComposeRequest(listener: () => void): () => void;
}

export const BRIDGE_CHANNELS = {
  settingsGet: 'dispatch:settings:get',
  settingsSave: 'dispatch:settings:save',
  settingsClear: 'dispatch:settings:clear',
  channels: 'dispatch:channels',
  posts: 'dispatch:posts',
  schedule: 'dispatch:schedule',
  composeTake: 'dispatch:compose:take',
  composeChanged: 'dispatch:compose:changed',
  updatesState: 'dispatch:updates:state',
  updatesCheck: 'dispatch:updates:check',
  updatesInstall: 'dispatch:updates:install',
  updatesChanged: 'dispatch:updates:changed',
} as const;
