import { app, BrowserWindow, ipcMain, Menu, net, shell } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBufferProvider, type PublishingProvider } from '../src/buffer/provider';
import { maskApiKey, validateBufferSettings } from '../src/core/settings';
import { validateNewPost } from '../src/core/validate';
import { BRIDGE_CHANNELS, type BufferSettingsView } from '../src/renderer/bridge';
import { activeConfig, secureStorageAvailable, settingsStore } from './settings';

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

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Dispatch',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

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

app.whenReady().then(() => {
  setMenu();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
