import { platformFor } from '../core/platforms';
import { describeStatus } from '../core/status';

/**
 * The Dispatch mark at text size: one post, joined by the rule to three
 * channels, in a frame cut to the name's cap height. It is drawn the way
 * Bureau's Wordmark is, so the two apps read as a pair.
 */
export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden focusable="false">
      <rect
        x="1.1"
        y="4.1"
        width="27.8"
        height="21.8"
        rx="4.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <rect x="15.25" y="0" width="1.5" height="30" rx="0.75" fill="currentColor" opacity="0.5" />
      <rect x="4.4" y="13.5" width="8.4" height="3" rx="1.5" fill="currentColor" />
      <rect x="14.4" y="8.2" width="10.8" height="3" rx="1.5" fill="currentColor" />
      <rect x="14.4" y="13.5" width="10.8" height="3" rx="1.5" fill="currentColor" />
      <rect x="14.4" y="18.8" width="10.8" height="3" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** The name locked up with the mark: the one Title Case element. */
export function Brand() {
  return (
    <span className="brand">
      <Wordmark />
      Dispatch
    </span>
  );
}

/**
 * A platform's two-letter mark in its colour slot. Colour never carries the
 * meaning alone, so the mark is always there and the full name is given to
 * assistive technology.
 */
export function PlatformMark({ service }: { service: string }) {
  const platform = platformFor(service);
  return (
    <span className={`mark slot-${platform.slot}`} title={platform.label}>
      <span aria-hidden>{platform.short}</span>
      <span className="sr-only">{platform.label}</span>
    </span>
  );
}

/** A post's status as a word with a dot. */
export function StatusBadge({ status }: { status: string }) {
  const { label, tone } = describeStatus(status);
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" aria-hidden />
      {label}
    </span>
  );
}
