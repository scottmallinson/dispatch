# 0008. Update the desktop app from GitHub Releases, as Bureau does

- Status: Proposed
- Date: 2026-11-11

## Context

Dispatch is installed from GitHub Releases, and each release is cut
automatically (ADR 0004). Until now an installed copy never noticed a newer
release, so people had to download each installer by hand. Bureau's desktop
app already updates itself: it uses electron-updater with GitHub Releases as
the feed, checks at launch and every six hours, downloads in the background and
installs on quit or on request from Settings (Bureau ADR 0005).

Dispatch's installers are unsigned (ADR 0004). That matters for updates: macOS
installs an update only into a signed app, while Windows updates unsigned apps,
with a SmartScreen warning on first install.

## Decision

Dispatch gets the same update mechanism as Bureau:

- The app depends on **electron-updater** at the same version as Bureau.
  `electron-builder.yml` names the repository in its `publish` block, so the
  packaged app knows where to look.
- The main process (`electron/updates.ts`) checks at launch and every six
  hours. It reports one `UpdateState` (shared in `src/core/updates.ts`) to the
  window over IPC. The state covers checking, downloading, ready to install and
  errors. From source, the state is `unsupported`.
- The preload bridge exposes `window.dispatch.updates`: read the state, check
  now, install now, and listen for changes. The renderer keeps the channel names
  in `BRIDGE_CHANNELS`, and the preload contract test keeps them in step.
- Settings shows an **Updates** card with the version, the state and the buttons.
- Releases carry the update metadata. macOS builds are universal, so there is
  one dmg and one zip, and the release workflow uploads the zip, the blockmaps
  and the `latest*.yml` files alongside the installers.

## Consequences

- Windows installs update themselves. An installed copy checks GitHub Releases
  and installs the new version on quit. The first install still shows
  SmartScreen, as it does today.
- macOS updates are expected to fail until the macOS build is signed and
  notarised. Squirrel.Mac checks the code signature of the new app, and the
  current builds have none. We have not verified this on a Mac. Until signing
  exists, a Mac user still updates by downloading the new dmg.
- Installed apps read `latest*.yml` from the latest release. A release that
  lacks that metadata shows an error in Settings and does not change the
  installed app. The workflow change is what makes this work, so it has to ship
  with the app change.
- Checks made by electron-updater may not go through the system proxy the way
  the app's own requests do (ADR 0005 moved those to Chromium's network stack).
  We have not tested this behind a proxy. A failed check shows an error in Settings.
- One more dependency (electron-updater) is added, which the repository's
  rules ask to be confirmed before merge.
