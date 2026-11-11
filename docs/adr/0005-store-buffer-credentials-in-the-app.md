# 0005. Store Buffer credentials in the app, encrypted by the OS

- Status: Accepted
- Date: 2026-11-11

## Context

Dispatch was first set up with environment variables only. That worked for a
developer, but a person who installs the app from a release has no way to give
it their Buffer details. Bureau already takes its credentials in a settings
screen, and Dispatch should work the same way.

Credentials must not reach the renderer, and they must not sit in plain text on
disk.

## Decision

Dispatch takes a Buffer API key and organization ID in the app. It tests them
against Buffer before saving. It stores them in the user data folder, with the
key encrypted by Electron's `safeStorage`, which uses the OS keychain. If
`safeStorage` is unavailable, saving is refused.

The main process holds the key. The renderer gets a masked hint and a
connected flag. Environment variables still take precedence, as in Bureau.

## Consequences

- A new install shows a connect screen before anything else.
- Losing the OS keychain entry, such as after a reinstall on another account,
  means the user enters the key again.
- Organization ID must be entered by hand until Buffer's account query is
  confirmed.
