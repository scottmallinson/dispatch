/** Date formatting. Everything renders in the user's locale and time zone, as in Bureau. */

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const dayWithYearFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
// 24-hour whatever the locale, because that is what a schedule shows.
const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The two halves of a publish time, for a time column: "Thu 19 Nov" and "09:00". */
export function dueParts(
  dueAt: string | null,
  now: Date = new Date(),
): { day: string; time: string } | null {
  if (dueAt === null) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  const format = date.getFullYear() === now.getFullYear() ? dayFormat : dayWithYearFormat;
  return { day: format.format(date), time: timeFormat.format(date) };
}

/** A publish time in one line, or says it is queued. */
export function formatDue(dueAt: string | null): string {
  if (dueAt === null) return 'Next free slot';
  const parts = dueParts(dueAt);
  return parts ? `${parts.day} ${parts.time}` : dueAt;
}

/** Turns an error from the bridge into a sentence for the user, without Electron's IPC prefix. */
export function cleanErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const message = err.message
    .replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    .trim();
  return message || fallback;
}
