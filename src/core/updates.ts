/** What the desktop app tells its window about updates. Shared by the app and the UI. */
export type UpdateState =
  | { status: 'idle'; version: string }
  /** Run from source rather than installed, where there is nothing to update. */
  | { status: 'unsupported'; version: string; reason: string }
  | { status: 'checking'; version: string }
  | { status: 'current'; version: string; checkedAt: string }
  | { status: 'downloading'; version: string; next: string; percent: number }
  /** Downloaded: installs on quit, or now on request. */
  | { status: 'ready'; version: string; next: string }
  | { status: 'error'; version: string; message: string };

/**
 * The sentence Settings shows for an update state. `formatTime` turns an ISO
 * time into text for the viewer, so this stays free of browser APIs.
 */
export function describeUpdate(state: UpdateState, formatTime: (iso: string) => string): string {
  switch (state.status) {
    case 'idle':
      return 'Not checked yet.';
    case 'unsupported':
      return state.reason;
    case 'checking':
      return 'Checking for updates…';
    case 'current':
      return `Dispatch is up to date. Last checked ${formatTime(state.checkedAt)}.`;
    case 'downloading':
      return `Downloading version ${state.next}… ${state.percent}%`;
    case 'ready':
      return `Version ${state.next} is ready. It installs when Dispatch restarts.`;
    case 'error':
      return `Could not check for updates: ${state.message}`;
  }
}
