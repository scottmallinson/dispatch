import { app, BrowserWindow, ipcMain, Menu, nativeTheme, net, shell } from 'electron';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBufferProvider, type PublishingProvider } from '../src/buffer/provider';
import { maskApiKey, validateBufferSettings } from '../src/core/settings';
import { COMPOSE_SCHEME, parseComposeLink, type ComposeRequest } from '../src/core/compose-link';
import { validateNewPost } from '../src/core/validate';
import { BRIDGE_CHANNELS, type BufferSettingsView } from '../src/renderer/bridge';
import { activeConfig, secureStorageAvailable, settingsStore } from './settings';
import { registerUpdateIpc, startUpdates } from './updates';

// TEMPORARY diagnostic: records what the operating system passes in and how the
// link is read, in link-trace.log under the app's data folder.
function traceLink(event: string, detail: unknown): void {
  try {
    const file = path.join(app.getPath('userData'), 'link-trace.log');
    appendFileSync(file, `${new Date().toISOString()} ${event} ${JSON.stringify(detail)}\n`);
  } catch {
    // Diagnostic only.
  }
}

/**
 * A compose link (from Bureau, or the browser) that the window has not taken yet.
 * Only the latest one is kept: a second link before the first is taken replaces it.
 */
let pendingCompose: ComposeRequest | null = null;

/**
 * Requests go through Chromium's network stack rather than Node's fetch. Node's fetch
 * ignores the system proxy and the Windows certificate store, which is why connecting
 * failed with a bare "fetch failed" on machines behind a proxy or inspecting firewall.
 */
const chromiumFetch: typeof fetch = (input, init) => net.fetch(String(input), init);

/** The connection status the renderer shows. Never includes the full key. */
function settingsView(): BufferSettingsView {
  const config = activeConfig();
  return {
    configured: config !== null,
    source: config?.source ?? 'none',
    organizationId: config?.organizationId ?? null,
    apiKeyHint: config ? maskApiKey(config.apiKey) : null,
    secureStorageAvailable: secureStorageAvailable(),
  };
}

function providerOrThrow(): PublishingProvider {
  const config = activeConfig();
  if (!config) throw new Error('Buffer is not connected yet. Connect it in Settings.');
  return createBufferProvider({
    apiKey: config.apiKey,
    organizationId: config.organizationId,
    fetchImpl: chromiumFetch,
  });
}

function registerIpc(): void {
  ipcMain.handle(BRIDGE_CHANNELS.settingsGet, () => settingsView());

  ipcMain.handle(BRIDGE_CHANNELS.settingsSave, async (_event, input: unknown) => {
    const result = validateBufferSettings(input);
    if (!result.ok) throw new Error(result.error);
    // Test the new details before storing them, so a typo never replaces a working key.
    const provider = createBufferProvider({ ...result.value, fetchImpl: chromiumFetch });
    await provider.listChannels();
    settingsStore().write(result.value);
    return settingsView();
  });

  ipcMain.handle(BRIDGE_CHANNELS.settingsClear, () => {
    settingsStore().clear();
    return settingsView();
  });

  ipcMain.handle(BRIDGE_CHANNELS.channels, () => providerOrThrow().listChannels());

  ipcMain.handle(BRIDGE_CHANNELS.posts, (_event, channelIds: unknown) => {
    if (!Array.isArray(channelIds) || !channelIds.every((id) => typeof id === 'string')) {
      throw new Error('channelIds must be an array of strings.');
    }
    return providerOrThrow().listPosts(channelIds);
  });

  ipcMain.handle(BRIDGE_CHANNELS.schedule, (_event, input: unknown) => {
    const result = validateNewPost(input);
    if (!result.ok) throw new Error(result.error);
    return providerOrThrow().schedulePost(result.value);
  });

  ipcMain.handle(BRIDGE_CHANNELS.composeTake, () => {
    const request = pendingCompose;
    traceLink('take', request);
    pendingCompose = null;
    return request;
  });
}

function focusWindow(): void {
  const [window] = BrowserWindow.getAllWindows();
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

/**
 * Handles a dispatch:// link. The window takes the request itself (see
 * takeComposeRequest), so a link that arrives before the window has loaded is
 * still delivered.
 */
function receiveLink(link: string): void {
  const request = parseComposeLink(link);
  traceLink('receive', { link, request });
  if (!request) return;
  pendingCompose = request;
  // Before the app is ready, createWindow() runs later and takes the request.
  if (!app.isReady()) return;
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    return;
  }
  focusWindow();
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(BRIDGE_CHANNELS.composeChanged);
  }
}

/**
 * Registers dispatch:// with the operating system. In development the app
 * is started through Electron, so the registration must name the script too.
 */
function registerProtocol(): void {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(COMPOSE_SCHEME, process.execPath, [
      path.resolve(process.argv[1] ?? ''),
    ]);
  } else {
    app.setAsDefaultProtocolClient(COMPOSE_SCHEME);
  }
}

function setMenu(): void {
  // Windows and Linux get no menu bar. macOS keeps its system menu, with the
  // Edit commands so copy and paste shortcuts keep working.
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]));
  } else {
    Menu.setApplicationMenu(null);
  }
}

/** The design system's page ground (surface-page) in Daylight and Lamplight. */
function pageGround(): string {
  return nativeTheme.shouldUseDarkColors ? '#14120f' : '#f0ece1';
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 420,
    minHeight: 560,
    title: 'Dispatch',
    // The page ground, so the window never flashes white before the UI paints.
    backgroundColor: pageGround(),
    // macOS hides the title bar and the app's own top bar absorbs the
    // traffic-light inset, as in Bureau.
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const, trafficLightPosition: { x: 16, y: 18 } }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const followTheme = () => window.setBackgroundColor(pageGround());
  nativeTheme.on('updated', followTheme);
  window.on('closed', () => nativeTheme.off('updated', followTheme));

  // Links open in the user's browser, never in a new Dispatch window.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  const devUrl = process.env.DISPATCH_DEV_SERVER_URL;
  const entry =
    devUrl ?? pathToFileURL(path.join(__dirname, '..', '..', 'dist', 'index.html')).href;
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== entry) event.preventDefault();
  });

  void window.loadURL(entry);
}

// One running copy only. On Windows and Linux a dispatch:// link starts a second
// copy, which hands its link to the first and quits.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    traceLink('second-instance', argv);
    const link = argv.find((arg) => parseComposeLink(arg) !== null);
    if (link) receiveLink(link);
    else focusWindow();
  });
  // macOS delivers links here, possibly before the app is ready.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    receiveLink(url);
  });
  traceLink('launch', process.argv);
  registerProtocol();
  const launchLink = process.argv.find((arg) => parseComposeLink(arg) !== null);
  if (launchLink) receiveLink(launchLink);

  app.whenReady().then(() => {
    setMenu();
    registerIpc();
    registerUpdateIpc();
    startUpdates();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
