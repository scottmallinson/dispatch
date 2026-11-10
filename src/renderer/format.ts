/** Formats a due time for display in the user's locale, or says it is queued. */
export function formatDue(dueAt: string | null): string {
  if (dueAt === null) return 'Next free slot';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return dueAt;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
