import type { Channel, NewPost, Post } from '../core/types';

/** The API the preload script exposes to the renderer as `window.dispatch`. */
export interface DispatchBridge {
  /** False when no Buffer key or organization id is configured. */
  configured: boolean;
  listChannels(): Promise<Channel[]>;
  listPosts(channelIds: string[]): Promise<Post[]>;
  schedulePost(post: NewPost): Promise<Post>;
}

export const BRIDGE_CHANNELS = {
  channels: 'dispatch:channels',
  posts: 'dispatch:posts',
  schedule: 'dispatch:schedule',
} as const;
