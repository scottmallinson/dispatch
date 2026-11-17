import { describe, expect, it } from 'vitest';
import { createBufferProvider } from './provider';

type Handler = (query: string) => unknown;

/** Routes each GraphQL request to a handler by matching a substring of the query. */
function fakeBuffer(routes: Record<string, Handler>): {
  fetchImpl: typeof fetch;
  queries: string[];
} {
  const queries: string[] = [];
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    const query = JSON.parse(init?.body as string).query as string;
    queries.push(query);
    const key = Object.keys(routes).find((k) => query.includes(k));
    if (!key) throw new Error(`unexpected query: ${query}`);
    return new Response(JSON.stringify({ data: routes[key](query) }), { status: 200 });
  }) as typeof fetch;
  return { fetchImpl, queries };
}

describe('createBufferProvider', () => {
  it('lists channels for the organization', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'channels(': () => ({
        channels: [{ id: 'c1', name: 'Mastodon', service: 'mastodon', extra: 'dropped' }],
      }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    await expect(provider.listChannels()).resolves.toEqual([
      { id: 'c1', name: 'Mastodon', service: 'mastodon' },
    ]);
    expect(queries[0]).toContain('organizationId: "org-1"');
  });

  it('follows pagination cursors until there are no more pages', async () => {
    let page = 0;
    const { fetchImpl, queries } = fakeBuffer({
      'posts(': () => {
        page += 1;
        if (page === 1) {
          return {
            posts: {
              edges: [
                {
                  node: {
                    id: 'p1',
                    text: 'one',
                    dueAt: null,
                    channelId: 'c1',
                    status: 'scheduled',
                  },
                },
              ],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-2' },
            },
          };
        }
        return {
          posts: {
            edges: [
              {
                node: {
                  id: 'p2',
                  text: 'two',
                  dueAt: '2026-11-12T09:00:00Z',
                  channelId: 'c1',
                  status: 'sent',
                },
              },
            ],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        };
      },
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    const posts = await provider.listPosts(['c1']);
    expect(posts.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(queries[1]).toContain('after: "cursor-2"');
  });

  it('stops after maxPages even if Buffer reports more', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'posts(': () => ({
        posts: { edges: [], pageInfo: { hasNextPage: true, endCursor: 'more' } },
      }),
    });
    const provider = createBufferProvider({
      apiKey: 'k',
      organizationId: 'org-1',
      fetchImpl,
      maxPages: 2,
    });

    await provider.listPosts(['c1']);
    expect(queries).toHaveLength(2);
  });

  it('filters posts by bare enum status values, not quoted strings', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'posts(': () => ({
        posts: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
      }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    await provider.listPosts(['c1']);

    // Buffer's PostStatus is a GraphQL enum: quoting its values is rejected by the API.
    expect(queries[0]).toContain('status: [scheduled, sent, error]');
    expect(queries[0]).not.toContain('"scheduled"');
  });

  it('does not query Buffer when there are no channels to list posts for', async () => {
    const { fetchImpl, queries } = fakeBuffer({});
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    await expect(provider.listPosts([])).resolves.toEqual([]);
    expect(queries).toHaveLength(0);
  });

  it('schedules a post at a specific time using customScheduled', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'createPost(': () => ({
        createPost: {
          post: {
            id: 'new',
            text: 'Hi',
            dueAt: '2026-11-12T09:00:00.000Z',
            channelId: 'c1',
            status: 'scheduled',
          },
        },
      }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    const post = await provider.schedulePost({
      channelId: 'c1',
      text: 'Hi',
      dueAt: '2026-11-12T09:00:00.000Z',
    });
    expect(post.id).toBe('new');
    expect(queries[0]).toContain('mode: customScheduled');
    expect(queries[0]).toContain('schedulingType: automatic');
  });

  it('publishes a post straight away using shareNow', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'createPost(': () => ({
        createPost: {
          post: { id: 'now', text: 'Hi', dueAt: null, channelId: 'c1', status: 'sent' },
        },
      }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    const post = await provider.schedulePost({
      channelId: 'c1',
      text: 'Hi',
      dueAt: null,
      publishNow: true,
    });
    expect(post.id).toBe('now');
    expect(queries[0]).toContain('mode: shareNow');
    expect(queries[0]).toContain('schedulingType: automatic');
    expect(queries[0]).not.toContain('dueAt:');
  });

  it('queues a post with no time using addToQueue', async () => {
    const { fetchImpl, queries } = fakeBuffer({
      'createPost(': () => ({
        createPost: {
          post: { id: 'q', text: 'Hi', dueAt: null, channelId: 'c1', status: 'scheduled' },
        },
      }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    await provider.schedulePost({ channelId: 'c1', text: 'Hi', dueAt: null, publishNow: false });
    expect(queries[0]).toContain('mode: addToQueue');
    expect(queries[0]).not.toContain('dueAt:');
  });

  it('surfaces a MutationError message as a thrown error', async () => {
    const { fetchImpl } = fakeBuffer({
      'createPost(': () => ({ createPost: { message: 'Channel is disconnected.' } }),
    });
    const provider = createBufferProvider({ apiKey: 'k', organizationId: 'org-1', fetchImpl });

    await expect(
      provider.schedulePost({ channelId: 'c1', text: 'Hi', dueAt: null, publishNow: false }),
    ).rejects.toThrow('Channel is disconnected.');
  });
});
