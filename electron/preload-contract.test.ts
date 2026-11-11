import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRIDGE_CHANNELS } from '../src/renderer/bridge';

const preload = readFileSync(new URL('./preload.ts', import.meta.url), 'utf8');

describe('preload script', () => {
  // A sandboxed preload can only require 'electron'. A relative import would
  // load nothing, and the renderer would see no bridge at all.
  it('imports nothing at runtime from local files', () => {
    const runtimeLocalImport = /^import\s+(?!type\b)[^;]*from\s+['"]\.\.?\//m;
    expect(preload).not.toMatch(runtimeLocalImport);
  });

  it('repeats every channel name from BRIDGE_CHANNELS', () => {
    for (const channel of Object.values(BRIDGE_CHANNELS)) {
      expect(preload).toContain(`'${channel}'`);
    }
  });
});
