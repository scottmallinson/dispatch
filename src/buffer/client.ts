/**
 * A small GraphQL client for Buffer's public API. It takes an injectable fetch so
 * it can be tested without the network. Buffer counts every request against a
 * shared quota, so callers should keep request volume low.
 */

export const BUFFER_ENDPOINT = 'https://api.buffer.com';

export class BufferError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'BufferError';
  }
}

export interface GraphQLClientOptions {
  apiKey: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export function createGraphQLClient(options: GraphQLClientOptions) {
  const endpoint = options.endpoint ?? BUFFER_ENDPOINT;
  const doFetch = options.fetchImpl ?? fetch;

  return async function request<T>(query: string): Promise<T> {
    const response = await doFetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (response.status === 429) {
      const retry = Number(response.headers.get('Retry-After'));
      throw new BufferError(
        'Buffer rate limit reached. Try again shortly.',
        429,
        Number.isFinite(retry) && retry > 0 ? retry : undefined,
      );
    }
    if (!response.ok) {
      throw new BufferError(`Buffer returned HTTP ${response.status}.`, response.status);
    }

    const body = (await response.json()) as GraphQLResponse<T>;
    if (body.errors?.length) {
      throw new BufferError(body.errors.map((e) => e.message).join('; '));
    }
    if (body.data === undefined) {
      throw new BufferError('Buffer returned no data.');
    }
    return body.data;
  };
}

/** Encodes a value as a GraphQL string literal. */
export function gqlString(value: string): string {
  return JSON.stringify(value);
}
