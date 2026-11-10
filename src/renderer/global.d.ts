import type { DispatchBridge } from './bridge';

declare global {
  interface Window {
    /** Present only inside the Electron app, where the preload script sets it. */
    dispatch?: DispatchBridge;
  }
}

export {};
