# Dispatch

A desktop app for scheduling social posts through [Buffer](https://buffer.com),
built to sit beside [Bureau](https://github.com/scottmallinson/bureau). It has
two layouts that switch with the window shape:

- **Portrait:** one consolidated timeline of every scheduled post, soonest first.
- **Landscape:** one column per connected platform channel.

Dispatch publishes through Buffer's public GraphQL API. It does not show or
reply to comments. Buffer's API does not expose them yet (see
[ADR 0003](docs/adr/0003-buffer-publishing-and-deferred-comments.md)).

## Running it

Install dependencies, then start the app:

```sh
npm install
npm run desktop
```

On first run, Dispatch asks for a Buffer API key and your organization ID. It
tests them against Buffer before saving. The key is encrypted with the OS keychain
and stays in the main process. Change or remove it later from Settings.

For a headless or scripted setup, `BUFFER_API_KEY` and `BUFFER_ORGANIZATION_ID`
override anything saved in the app. See
[ADR 0005](docs/adr/0005-store-buffer-credentials-in-the-app.md).

For UI work without Electron, run `npm run dev` and open the printed URL. There
is no bridge in a browser, so the page explains that the desktop app is needed.

## Layout of the code

| Path            | What lives there                                                              |
| --------------- | ----------------------------------------------------------------------------- |
| `src/core/`     | Pure domain code: types, timeline grouping, layout choice, input validation   |
| `src/buffer/`   | Buffer GraphQL client, operations and the `PublishingProvider` implementation |
| `src/renderer/` | React UI: composer, portrait timeline, landscape columns                      |
| `electron/`     | Main process (holds the key, registers IPC) and the sandboxed preload bridge  |
| `scripts/`      | Build helper that marks `dist-electron/` as CommonJS                          |

The renderer never talks to Buffer. It calls `window.dispatch`, which the
preload script exposes, and the main process makes the request.

## Commands

```sh
npm test              # unit tests (Vitest)
npm run typecheck     # renderer and Electron TypeScript
npm run build         # typecheck, compile Electron code, build the renderer
npm run format:check  # Prettier, as CI runs it
npm run lint:commits  # Conventional Commits since origin/main
```

## Known limits

- The Buffer operations follow Buffer's public guides. Buffer's docs do not
  publish the full schema, so check the queries against a live key before you
  rely on them. The first real run is the test.
- Posts are fetched for up to five pages per refresh to protect Buffer's shared
  request quota.
- Comments and replies are not built. See ADR 0003.
- Installers are unsigned, so macOS and Windows show security warnings. Auto-update is not built.

## Releasing

Releases are automatic. Each push to `main` runs semantic-release (see
[ADR 0004](docs/adr/0004-automatic-releases.md)). It creates a GitHub Release
and tag when a commit is a `feat`, `fix`, `perf` or breaking change. Other commit
types do not release. A new release also gets a macOS DMG and a Windows installer,
built from the tag and attached by the workflow. To build them locally, run
`npm run package` on the target platform. To preview the next version locally, run
`npm run release -- --dry-run --no-ci` with a `GITHUB_TOKEN` set.

## Commit messages

Format: `type(optional-scope): description`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENCE.md)
