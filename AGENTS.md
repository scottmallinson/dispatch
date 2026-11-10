# AGENTS.md

Guidance for AI coding agents (and a useful summary for humans). Tool-specific
files such as `CLAUDE.md` point here so there is a single source of truth.

## Project overview

Dispatch is a desktop app for scheduling social posts through Buffer, built to
sit beside Bureau. It shows a portrait timeline of every post, or one column per
platform in landscape. The first version publishes only; comments and replies
wait for Buffer's API (see `docs/adr/0003-buffer-publishing-and-deferred-comments.md`).

- TypeScript on Node 22.9+, React + Vite for the UI, Electron for the desktop shell.
- Domain code lives in `src/core/` and must stay free of Node and browser APIs.
- Publishing services are reached only through `PublishingProvider` in
  `src/buffer/provider.ts`.
- The Buffer key lives in the Electron main process. The renderer sees only the
  preload bridge (`src/renderer/bridge.ts`).

## Commands

| Task             | Command                |
| ---------------- | ---------------------- |
| Install          | `npm install`          |
| Test             | `npm test`             |
| Typecheck        | `npm run typecheck`    |
| Build            | `npm run build`        |
| Desktop app      | `npm run desktop`      |
| UI only          | `npm run dev`          |
| Format           | `npm run format`       |
| Check formatting | `npm run format:check` |
| Lint commits     | `npm run lint:commits` |

## Conventions

- Commits and PR titles follow Conventional Commits (see `CONTRIBUTING.md`).
- Follow `.editorconfig`; run `npm run format` before committing.
- Match the style of surrounding code; don't reformat unrelated files.
- Keep changes small and focused; one logical change per PR.
- Add or update tests and docs with every behavioural change.
- Record significant design decisions in `docs/adr/`.
- When adding a language or package manager, add its ecosystem to
  `.github/dependabot.yml` so its dependencies stay up to date.

## Boundaries

- Never commit secrets, credentials, or `.env` files.
- Commits are authored by the human user; never add `Co-Authored-By`,
  `Generated with`, or other AI attribution to commits, PR bodies or comments
  (enforced in `.claude/settings.json`).
- Never bypass hooks (`--no-verify`) or disable checks to get green.
- Never force-push to `main` or rewrite shared history.
- Ask before: adding dependencies, changing CI or release config, deleting
  files you didn't create, or making breaking changes.

## Definition of done

1. Checks above pass locally.
2. Tests and docs updated.
3. PR description explains the _why_, links the issue, and notes risks.
