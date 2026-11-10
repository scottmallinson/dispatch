import { contextBridge, ipcRenderer } from 'electron';
import type { DispatchBridge } from '../src/renderer/bridge';
import { BRIDGE_CHANNELS } from '../src/renderer/bridge';

const configured = process.argv.includes('--dispatch-configured=1');

const bridge: DispatchBridge = {
  configured,
  listChannels: () => ipcRenderer.invoke(BRIDGE_CHANNELS.channels),
  listPosts: (channelIds) => ipcRenderer.invoke(BRIDGE_CHANNELS.posts, channelIds),
  schedulePost: (post) => ipcRenderer.invoke(BRIDGE_CHANNELS.schedule, post),
};

contextBridge.exposeInMainWorld('dispatch', bridge);
