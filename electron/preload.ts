import { contextBridge, ipcRenderer } from 'electron';
import type { UpdateState } from '../src/core/updates';
import type { DispatchBridge } from '../src/renderer/bridge';

// A sandboxed preload may only require 'electron', so these channel names are
// repeated from BRIDGE_CHANNELS in src/renderer/bridge.ts. A test keeps them in step.
const CHANNELS = {
  settingsGet: 'dispatch:settings:get',
  settingsSave: 'dispatch:settings:save',
  settingsClear: 'dispatch:settings:clear',
  channels: 'dispatch:channels',
  posts: 'dispatch:posts',
  schedule: 'dispatch:schedule',
  composeTake: 'dispatch:compose:take',
  composeChanged: 'dispatch:compose:changed',
  updatesState: 'dispatch:updates:state',
  updatesCheck: 'dispatch:updates:check',
  updatesInstall: 'dispatch:updates:install',
  updatesChanged: 'dispatch:updates:changed',
} as const;

const bridge: DispatchBridge = {
  platform: process.platform,
  updates: {
    state: () => ipcRenderer.invoke(CHANNELS.updatesState),
    check: () => ipcRenderer.invoke(CHANNELS.updatesCheck),
    install: () => ipcRenderer.invoke(CHANNELS.updatesInstall),
    onChange: (listener) => {
      const handler = (_event: unknown, state: UpdateState) => listener(state);
      ipcRenderer.on(CHANNELS.updatesChanged, handler);
      return () => ipcRenderer.removeListener(CHANNELS.updatesChanged, handler);
    },
  },
  getSettings: () => ipcRenderer.invoke(CHANNELS.settingsGet),
  saveSettings: (input) => ipcRenderer.invoke(CHANNELS.settingsSave, input),
  clearSettings: () => ipcRenderer.invoke(CHANNELS.settingsClear),
  listChannels: () => ipcRenderer.invoke(CHANNELS.channels),
  listPosts: (channelIds) => ipcRenderer.invoke(CHANNELS.posts, channelIds),
  schedulePost: (post) => ipcRenderer.invoke(CHANNELS.schedule, post),
  takeComposeRequest: () => ipcRenderer.invoke(CHANNELS.composeTake),
  onComposeRequest: (listener) => {
    const handler = () => listener();
    ipcRenderer.on(CHANNELS.composeChanged, handler);
    return () => ipcRenderer.removeListener(CHANNELS.composeChanged, handler);
  },
};

contextBridge.exposeInMainWorld('dispatch', bridge);
