# 0003. Publish through Buffer and defer comments

- Status: Accepted
- Date: 2026-11-10

## Context

Dispatch is a desktop app, next to Bureau, for scheduling social posts. The
first request also asked for viewing comments on posts and replying to them.

Buffer's public GraphQL API (`https://api.buffer.com`) covers posts: it can list
them by channel and status and create them with a schedule. It does not expose
comments or replies. Buffer's support article says so, and the "Community API"
item on its public roadmap is still in Exploring with no date.

Other Bureau-adjacent code already speaks to platforms directly through
provider interfaces, so comments could come from each platform's own API later.

## Decision

We will publish through Buffer only in the first version. The portrait timeline
and the landscape columns will show Buffer posts, and the composer will schedule
new ones. Comment viewing and replying are out of scope until Buffer ships
comment endpoints, or until we decide to add platform-native providers.

All calls to Buffer go through `PublishingProvider` in `src/buffer/provider.ts`,
so a comments capability can be added alongside it later without changing the
UI's layouts.

The Buffer key stays in the Electron main process. The renderer gets only three
operations through the preload bridge.

## Consequences

- The first release is useful for scheduling and reviewing the queue, but a
  person still needs Buffer's own app to read or answer comments.
- The queries are based on Buffer's public guides, not a full schema. They need
  checking against a live key, and a schema change will break them.
- The provider boundary keeps a later comments feature contained.
