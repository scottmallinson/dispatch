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
} as const;

const bridge: DispatchBridge = {
  getSettings: () => ipcRenderer.invoke(CHANNELS.settingsGet),
  saveSettings: (input) => ipcRenderer.invoke(CHANNELS.settingsSave, input),
  clearSettings: () => ipcRenderer.invoke(CHANNELS.settingsClear),
  listChannels: () => ipcRenderer.invoke(CHANNELS.channels),
  listPosts: (channelIds) => ipcRenderer.invoke(CHANNELS.posts, channelIds),
  schedulePost: (post) => ipcRenderer.invoke(CHANNELS.schedule, post),
};

contextBridge.exposeInMainWorld('dispatch', bridge);
