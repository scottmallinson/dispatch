# 0006. Adopt the Bureau design system

- Status: Accepted
- Date: 2026-11-11

## Context

Dispatch is built to sit beside Bureau. The two apps are separate, but they are
used together, and the first version of Dispatch had its own system font, a
blue accent and no mark. Side by side, they looked like two unrelated tools.

Bureau already has a mature design system: paper, ink, hairline rules and one
red accent; Hanken Grotesk and Azeret Mono; nine platform colour slots; and
rules for state, time and density. Its tokens are generated into
`src/web/tokens.css` in the Bureau repository.

## Decision

We will build Dispatch's interface on the Bureau design system.

- `src/renderer/tokens.css` is a copy of Bureau's generated tokens, unchanged.
  `src/renderer/styles.css` uses only those tokens and adds no colour of its own.
- The two faces are self-hosted from `src/renderer/fonts/`, the same files Bureau
  ships.
- A platform keeps the colour slot and two-letter mark it has in Bureau
  (`src/core/platforms.ts`), so Bluesky reads the same in both apps.
- The shell follows Bureau's: a top bar on `surface-card` that hides the macOS
  title bar and absorbs the traffic-light inset, and a window that opens on the
  page ground in light and dark.
- The Dispatch mark is drawn in the same material as Bureau's: an ink tile, the
  accent rule and paper bars. One bar on the left joins three on the right: one
  post, sent to every channel you pick. `build-resources/icon.png` (from
  `icon.svg`) brands the macOS and Windows installers, as Bureau's does.

## Consequences

- Dispatch and Bureau read as a pair, and a change to the system can reach both.
- The tokens are copied, not shared, so a change to the system needs the file
  copied again from Bureau. A shared package would remove that step; it is not
  worth the build and release work while the apps are this small.
- Dispatch inherits the system's rules: 24-hour times in mono, colour never
  carrying meaning alone, and no colours outside the tokens.
