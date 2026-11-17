/**
 * Domain types shared by the desktop main process, the Buffer provider and the UI.
 * Nothing in this folder may depend on Node or browser APIs.
 */

/** A connected social account, as Buffer reports it. `service` is the network, e.g. "mastodon". */
export interface Channel {
  id: string;
  name: string;
  service: string;
}

/** A post that is queued, scheduled or already sent on a channel. */
export interface Post {
  id: string;
  channelId: string;
  text: string;
  /** ISO 8601 UTC time the post is due to publish, or null when it is queued without a time. */
  dueAt: string | null;
  /** Status as Buffer reports it, passed through unchanged. */
  status: string;
}

/** What the composer sends when scheduling a new post. */
export interface NewPost {
  channelId: string;
  text: string;
  /** A specific time, or null to use the channel's next free queue slot. */
  dueAt: string | null;
  /** True to publish straight away. Then `dueAt` must be null. */
  publishNow: boolean;
}

/** One platform column in the landscape layout. */
export interface ChannelColumn {
  channel: Channel;
  posts: Post[];
}
