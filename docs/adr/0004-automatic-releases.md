# 0004. Release automatically from Conventional Commits on main

- Status: Accepted
- Date: 2026-11-10

## Context

Dispatch is a desktop app that people will install from GitHub Releases. Each
merge to `main` should either publish a version or be clearly marked as one that
does not change the app. Version numbers should follow from the commit messages
that already have to be Conventional, so nobody picks them by hand.

Bureau and the scottmallinson.com themes already use semantic-release, which
keeps this project consistent with them.

## Decision

We will use semantic-release. The release workflow in
`.github/workflows/release.yml` runs on each push to `main`. It publishes a GitHub
Release and a tag when the commits since the last tag include a releasable
Conventional Commit:

- `feat` releases a minor version.
- `fix` and `perf` release a patch version.
- A breaking change (`feat!:` or a `BREAKING CHANGE:` footer) releases a major version.
- Other types, such as `docs`, `chore`, `ci` and `build`, do not release.

The release is created with `GITHUB_TOKEN`, which needs only `contents`, `issues`
and `pull-requests` write permission in that job. The plugin does not comment
on the PRs it releases. It does not commit back to `main`, so the tag is the only
version record in git. The version lives in the tag and the release notes.

The first release has no earlier tag to compare against, so semantic-release
publishes `v1.0.0` from the existing `feat` commits. We accepted that over a
hand-made baseline tag, which the session's git proxy would not push.

## Consequences

- Every releasable merge publishes a version straight away. Batch changes into
  one PR if you want them in one release.
- When a release is cut, the workflow builds a macOS DMG and a Windows NSIS
  installer from that tag and attaches them to the release. The builds are
  unsigned, so macOS and Windows show security warnings until signing certificates
  are added. The packaging is configured in `electron-builder.yml`.
- The version in `package.json` is not updated in git. The installer job sets it
  from the tag before it builds, so the file names match the release.
