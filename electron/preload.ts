import { contextBridge, ipcRenderer } from 'electron';
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
} as const;

const bridge: DispatchBridge = {
  platform: process.platform,
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
