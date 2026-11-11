import { describe, expect, it } from 'vitest';
import { describeUpdate, type UpdateState } from './updates';

const formatTime = (iso: string) => `at ${iso}`;

describe('describeUpdate', () => {
  it('says what the app is doing in each state', () => {
    const cases: [UpdateState, string][] = [
      [{ status: 'idle', version: '1.0.0' }, 'Not checked yet.'],
      [{ status: 'unsupported', version: '1.0.0', reason: 'Run from source.' }, 'Run from source.'],
      [{ status: 'checking', version: '1.0.0' }, 'Checking for updates…'],
      [
        { status: 'current', version: '1.0.0', checkedAt: '2026-11-11T10:00:00Z' },
        'Dispatch is up to date. Last checked at 2026-11-11T10:00:00Z.',
      ],
      [
        { status: 'downloading', version: '1.0.0', next: '1.1.0', percent: 40 },
        'Downloading version 1.1.0… 40%',
      ],
      [
        { status: 'ready', version: '1.0.0', next: '1.1.0' },
        'Version 1.1.0 is ready. It installs when Dispatch restarts.',
      ],
      [
        { status: 'error', version: '1.0.0', message: 'No network.' },
        'Could not check for updates: No network.',
      ],
    ];
    for (const [state, text] of cases) {
      expect(describeUpdate(state, formatTime)).toBe(text);
    }
  });
});
