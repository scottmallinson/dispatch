import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { createBufferProvider, type PublishingProvider } from '../src/buffer/provider';
import { validateNewPost } from '../src/core/validate';
import { BRIDGE_CHANNELS } from '../src/renderer/bridge';

/**
 * The Buffer key lives only in the main process. The renderer reaches Buffer
 * through the preload bridge, which exposes three narrow operations.
 */
function providerFromEnv(): PublishingProvider | null {
  const apiKey = process.env.BUFFER_API_KEY;
  const organizationId = process.env.BUFFER_ORGANIZATION_ID;
  if (!apiKey || !organizationId) return null;
  return createBufferProvider({ apiKey, organizationId });
}

function requireProvider(provider: PublishingProvider | null): PublishingProvider {
  if (!provider)
    throw new Error('Buffer is not configured. Set BUFFER_API_KEY and BUFFER_ORGANIZATION_ID.');
  return provider;
}

function registerIpc(provider: PublishingProvider | null): void {
  ipcMain.handle(BRIDGE_CHANNELS.channels, () => requireProvider(provider).listChannels());

  ipcMain.handle(BRIDGE_CHANNELS.posts, (_event, channelIds: unknown) => {
    if (!Array.isArray(channelIds) || !channelIds.every((id) => typeof id === 'string')) {
      throw new Error('channelIds must be an array of strings.');
    }
    return requireProvider(provider).listPosts(channelIds);
  });

  ipcMain.handle(BRIDGE_CHANNELS.schedule, (_event, input: unknown) => {
    const result = validateNewPost(input);
    if (!result.ok) throw new Error(result.error);
    return requireProvider(provider).schedulePost(result.value);
  });
}

function createWindow(configured: boolean): void {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Dispatch',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Sandboxed preloads cannot read process.env, so pass the flag as an argument.
      additionalArguments: [`--dispatch-configured=${configured ? '1' : '0'}`],
    },
  });

  const devUrl = process.env.DISPATCH_DEV_SERVER_URL;
  if (devUrl) {
    void window.loadURL(devUrl);
  } else {
    void window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  const provider = providerFromEnv();
  registerIpc(provider);
  createWindow(provider !== null);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(providerFromEnv() !== null);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
