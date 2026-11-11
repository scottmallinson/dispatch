/** Formats a due time for display in the user's locale, or says it is queued. */
export function formatDue(dueAt: string | null): string {
  if (dueAt === null) return 'Next free slot';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Turns an error from the bridge into a sentence for the user, without Electron's IPC prefix. */
export function cleanErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  const message = err.message
    .replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    .trim();
  return message || fallback;
}
