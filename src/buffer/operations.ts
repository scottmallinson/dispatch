/**
 * GraphQL documents for the Buffer operations Dispatch uses. These follow Buffer's
 * public guides at developers.buffer.com. Buffer does not expose comments or
 * replies through this API, so Dispatch does not query them.
 */
import { gqlString } from './client';
import type { NewPost } from '../core/types';

export function channelsQuery(organizationId: string): string {
  return `query {
  channels(input: { organizationId: ${gqlString(organizationId)} }) {
    id
    name
    service
  }
}`;
}

export function postsQuery(
  organizationId: string,
  channelIds: readonly string[],
  after?: string,
): string {
  const cursor = after ? `, after: ${gqlString(after)}` : '';
  const channels = channelIds.map(gqlString).join(', ');
  return `query {
  posts(first: 100${cursor}, input: { organizationId: ${gqlString(organizationId)}, filter: { status: [scheduled, sent, error], channelIds: [${channels}] } }) {
    edges {
      node {
        id
        text
        dueAt
        channelId
        status
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;
}

export function createPostMutation(post: NewPost): string {
  const scheduling = post.dueAt
    ? `mode: customScheduled, dueAt: ${gqlString(post.dueAt)}`
    : 'mode: addToQueue';
  return `mutation {
  createPost(input: { text: ${gqlString(post.text)}, channelId: ${gqlString(post.channelId)}, schedulingType: automatic, ${scheduling} }) {
    ... on PostActionSuccess {
      post {
        id
        text
        dueAt
        channelId
        status
      }
    }
    ... on MutationError {
      message
    }
  }
}`;
}
