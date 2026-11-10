import { describe, expect, it } from 'vitest';
import { BufferError, createGraphQLClient, gqlString } from './client';

function fakeFetch(response: Response): {
  fetchImpl: typeof fetch;
  calls: { url: string; init: RequestInit }[];
} {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response.clone();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe('createGraphQLClient', () => {
  it('posts the query with a bearer token and returns data', async () => {
    const { fetchImpl, calls } = fakeFetch(
      new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }),
    );
    const request = createGraphQLClient({
      apiKey: 'secret-key',
      fetchImpl,
      endpoint: 'https://example.test/graphql',
    });

    await expect(request<{ ok: boolean }>('query { ok }')).resolves.toEqual({ ok: true });

    expect(calls[0].url).toBe('https://example.test/graphql');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer secret-key',
    );
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ query: 'query { ok }' });
  });

  it('turns a 429 into a BufferError carrying Retry-After', async () => {
    const { fetchImpl } = fakeFetch(
      new Response('{}', { status: 429, headers: { 'Retry-After': '30' } }),
    );
    const request = createGraphQLClient({ apiKey: 'k', fetchImpl });

    const error = await request('query { ok }').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BufferError);
    expect((error as BufferError).status).toBe(429);
    expect((error as BufferError).retryAfterSeconds).toBe(30);
  });

  it('throws on GraphQL errors and on HTTP failures', async () => {
    const graphqlErrors = createGraphQLClient({
      apiKey: 'k',
      fetchImpl: fakeFetch(
        new Response(JSON.stringify({ errors: [{ message: 'bad field' }] }), { status: 200 }),
      ).fetchImpl,
    });
    await expect(graphqlErrors('query { x }')).rejects.toThrow('bad field');

    const httpFailure = createGraphQLClient({
      apiKey: 'k',
      fetchImpl: fakeFetch(new Response('', { status: 500 })).fetchImpl,
    });
    await expect(httpFailure('query { x }')).rejects.toMatchObject({ status: 500 });
  });
});

describe('gqlString', () => {
  it('encodes quotes and newlines as a GraphQL string literal', () => {
    expect(gqlString('say "hi"\nthere')).toBe('"say \\"hi\\"\\nthere"');
  });
});
