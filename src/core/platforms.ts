import type { Channel } from './types';

/** How a platform is shown: its name, a two-letter mark and a colour slot. */
export interface PlatformInfo {
  label: string;
  /** Short mark for tight spaces such as chips and column heads. */
  short: string;
  /**
   * Categorical colour slot (0-8) from the Bureau design system. Colour follows
   * the platform, never its position, so a platform reads the same here and in
   * Bureau. The slots match Bureau's `src/core/platforms.ts`.
   */
  slot: number;
}

const PLATFORMS: Record<string, PlatformInfo> = {
  linkedin: { label: 'LinkedIn', short: 'LI', slot: 2 },
  bluesky: { label: 'Bluesky', short: 'BS', slot: 3 },
  twitter: { label: 'X', short: 'X', slot: 4 },
  threads: { label: 'Threads', short: 'TH', slot: 5 },
  facebook: { label: 'Facebook', short: 'FB', slot: 6 },
  mastodon: { label: 'Mastodon', short: 'MA', slot: 7 },
  instagram: { label: 'Instagram', short: 'IG', slot: 8 },
};

/** The platform for a Buffer `service`. Services Dispatch does not know share slot 0. */
export function platformFor(service: string): PlatformInfo {
  const known = PLATFORMS[service.toLowerCase()];
  if (known) return known;
  const label = service.trim() === '' || service === 'unknown' ? 'Other' : service;
  return { label: label.charAt(0).toUpperCase() + label.slice(1), short: '··', slot: 0 };
}

/**
 * A short name for each channel: the platform, plus the account name when two
 * channels share a platform ("LinkedIn (Bureau)", "LinkedIn (Scott)").
 */
export function channelLabels(channels: readonly Channel[]): Map<string, string> {
  const perPlatform = new Map<string, number>();
  for (const channel of channels) {
    const label = platformFor(channel.service).label;
    perPlatform.set(label, (perPlatform.get(label) ?? 0) + 1);
  }
  return new Map(
    channels.map((channel) => {
      const label = platformFor(channel.service).label;
      const shared = (perPlatform.get(label) ?? 0) > 1;
      return [channel.id, shared ? `${label} (${channel.name})` : label];
    }),
  );
}
