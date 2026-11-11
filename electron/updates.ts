import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import type { UpdateState } from '../src/core/updates';
import { BRIDGE_CHANNELS } from '../src/renderer/bridge';

const CHECK_EVERY_MS = 6 * 60 * 60_000;

/**
 * The update state the window shows. Kept here so a window that opens after an
 * update event still gets the current state from `updates.state()`.
 */
let state: UpdateState = { status: 'idle', version: '' };

function setState(next: UpdateState): void {
  state = next;
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(BRIDGE_CHANNELS.updatesChanged, next);
  }
}

/**
 * Lets the window read the update state and ask for a check or an install. Runs
 * in every build, so the Settings card works the same from source, where it
 * reports that updates are unsupported.
 */
export function registerUpdateIpc(): void {
  ipcMain.handle(BRIDGE_CHANNELS.updatesState, () => state);
  ipcMain.handle(BRIDGE_CHANNELS.updatesCheck, async () => {
    if (state.status !== 'unsupported' && state.status !== 'downloading') {
      await autoUpdater.checkForUpdates().catch(() => undefined);
    }
    return state;
  });
  ipcMain.handle(BRIDGE_CHANNELS.updatesInstall, () => {
    if (state.status === 'ready') autoUpdater.quitAndInstall();
  });
}

/**
 * Updates come from this repository's GitHub Releases (the `publish` block in
 * electron-builder.yml is baked into the installed app). A new version
 * downloads in the background and installs when Dispatch quits, or straight
 * away from Settings.
 */
export function startUpdates(): void {
  const version = app.getVersion();
  if (!app.isPackaged) {
    state = {
      status: 'unsupported',
      version,
      reason: 'Updates work in the installed app, not when run from source.',
    };
    return;
  }
  state = { status: 'idle', version };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', version }));
  autoUpdater.on('update-not-available', () =>
    setState({ status: 'current', version, checkedAt: new Date().toISOString() }),
  );
  autoUpdater.on('update-available', (info) =>
    setState({ status: 'downloading', version, next: info.version, percent: 0 }),
  );
  autoUpdater.on('download-progress', (progress) => {
    if (state.status === 'downloading') {
      setState({ ...state, percent: Math.round(progress.percent) });
    }
  });
  autoUpdater.on('update-downloaded', (info) =>
    setState({ status: 'ready', version, next: info.version }),
  );
  autoUpdater.on('error', (error) => {
    // The full error, with the response headers GitHub sends back, is for the log.
    // Settings only gets a plain message.
    console.error('Update check failed:', error);
    setState({
      status: 'error',
      version,
      message: 'Dispatch could not reach its update server. It will try again later.',
    });
  });

  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined);
  check();
  setInterval(check, CHECK_EVERY_MS).unref();
}
