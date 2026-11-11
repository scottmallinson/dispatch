# 0007. Open the composer from a dispatch link

- Status: Proposed
- Date: 2026-11-11

## Context

Bureau shows the publishing schedule. When someone sees a free slot there, they
want to write a post for that time without retyping it. Bureau is a separate
app, so the two can only meet through the operating system: a link that names
Dispatch.

## Decision

We will register the `dispatch` URL scheme and open the composer for a link of
the form `dispatch://compose?at=<ISO 8601 time>`.

- The app keeps one running copy. A link that starts a second copy is handed
  to the first, which then quits (`requestSingleInstanceLock`). macOS sends
  links through `open-url`.
- A link that arrives before the window has loaded is kept until the composer
  takes it, so it is not lost while the app starts.
- The time only pre-fills the composer, switching it to "At a time". Nothing is
  scheduled until the person presses Schedule.
- Only links that `parseComposeLink` accepts are used. Any other address, or a
  time that is not a date, is ignored.
- The scheme is declared in `electron-builder.yml`, which writes it into the
  macOS Info.plist and the Windows installer.

## Consequences

- Dispatch can be opened from any app or web page that can make a link, so a
  link can start a draft with a time but never publish.
- A second copy of Dispatch no longer opens; it hands over to the first.
- Installers must be rebuilt before the scheme works on macOS.
