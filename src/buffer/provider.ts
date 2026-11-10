import type { Channel, NewPost, Post } from '../core/types';
import { BufferError, createGraphQLClient } from './client';
import { channelsQuery, createPostMutation, postsQuery } from './operations';

/** The only way the rest of the app reaches a publishing service. */
export interface PublishingProvider {
  listChannels(): Promise<Channel[]>;
  listPosts(channelIds: readonly string[]): Promise<Post[]>;
  schedulePost(post: NewPost): Promise<Post>;
}

export interface BufferProviderOptions {
  apiKey: string;
  organizationId: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  /** Upper bound on pages fetched per listPosts call, to protect the shared quota. */
  maxPages?: number;
}

interface PostNode {
  id: string;
  text: string;
  dueAt: string | null;
  channelId: string;
  status: string;
}

export function createBufferProvider(options: BufferProviderOptions): PublishingProvider {
  const request = createGraphQLClient(options);
  const maxPages = options.maxPages ?? 5;

  return {
    async listChannels() {
      const data = await request<{ channels: Channel[] }>(channelsQuery(options.organizationId));
      return data.channels.map(({ id, name, service }) => ({ id, name, service }));
    },

    async listPosts(channelIds) {
      if (channelIds.length === 0) return [];
      const posts: Post[] = [];
      let after: string | undefined;

      for (let page = 0; page < maxPages; page += 1) {
        const data = await request<{
          posts: {
            edges: { node: PostNode }[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        }>(postsQuery(options.organizationId, channelIds, after));

        for (const { node } of data.posts.edges) {
          posts.push({
            id: node.id,
            channelId: node.channelId,
            text: node.text,
            dueAt: node.dueAt,
            status: node.status,
          });
        }

        const { hasNextPage, endCursor } = data.posts.pageInfo;
        if (!hasNextPage || !endCursor) break;
        after = endCursor;
      }
      return posts;
    },

    async schedulePost(post) {
      // Buffer's createPost has no idempotency key, so this is never retried automatically.
      const data = await request<{
        createPost: { post: PostNode } | { message: string };
      }>(createPostMutation(post));

      const result = data.createPost;
      if ('message' in result) {
        throw new BufferError(result.message);
      }
      const { id, text, dueAt, channelId, status } = result.post;
      return { id, text, dueAt, channelId, status };
    },
  };
}
