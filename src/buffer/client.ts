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
    let response: Response;
    try {
      response = await doFetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
    } catch (error) {
      throw new BufferError(`Could not reach Buffer. ${describeNetworkError(error)}`);
    }

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

/**
 * Node's fetch fails with a generic "fetch failed" and keeps the real reason on
 * `cause` (for example ENOTFOUND or a certificate error), so surface that instead.
 */
export function describeNetworkError(error: unknown): string {
  const cause = error instanceof Error ? (error.cause as unknown) : undefined;
  if (cause instanceof Error && cause.message) return `Reason: ${cause.message}.`;
  if (cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') {
    return `Reason: ${cause.code}.`;
  }
  if (error instanceof Error && error.message) return `Reason: ${error.message}.`;
  return 'Check the internet connection and try again.';
}

/** Encodes a value as a GraphQL string literal. */
export function gqlString(value: string): string {
  return JSON.stringify(value);
}
