import { useEffect, useState, type FormEvent } from 'react';
import type { ComposeRequest } from '../core/compose-link';
import type { Channel, NewPost } from '../core/types';
import { describeOutcome, scheduleEach } from '../core/schedule';
import { validatePostDraft } from '../core/validate';
import { PlatformMark } from './brand';
import { formatDue, toLocalInput } from './format';

interface ComposerProps {
  channels: Channel[];
  /** A short name per channel id, for the confirmation sentence. */
  labels: Map<string, string>;
  /** A time to start from, such as one sent from Bureau's calendar. */
  request: ComposeRequest | null;
  /** Schedules one post on one channel. */
  onSchedule: (post: NewPost) => Promise<void>;
  /** Called once after a batch, whatever the outcome, so the lists can refresh. */
  onScheduled: () => Promise<void>;
}

type Feedback = { ok: boolean; message: string };

export function Composer({ channels, labels, request, onSchedule, onScheduled }: ComposerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [timing, setTiming] = useState<'queue' | 'at'>('queue');
  const [when, setWhen] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  // A new request sets the time and switches to "At a time". Other fields are left as they are.
  useEffect(() => {
    if (!request) return;
    setTiming('at');
    setWhen(toLocalInput(request.at));
    setFeedback(null);
  }, [request]);

  // A refresh can remove a channel; never keep one selected that is no longer there.
  useEffect(() => {
    const known = new Set(channels.map((c) => c.id));
    setSelected((current) => {
      const kept = current.filter((id) => known.has(id));
      return kept.length === current.length ? current : kept;
    });
  }, [channels]);

  const allSelected = channels.length > 0 && selected.length === channels.length;

  function toggle(channelId: string, on: boolean) {
    setSelected((current) =>
      on
        ? [...current.filter((id) => id !== channelId), channelId]
        : current.filter((id) => id !== channelId),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    // Keep the channel order the reader sees, not the order they were ticked.
    const channelIds = channels.map((c) => c.id).filter((id) => selected.includes(id));
    const result = validatePostDraft({
      channelIds,
      text,
      dueAt: timing === 'at' ? when : null,
    });
    if (!result.ok) {
      setFeedback({ ok: false, message: result.error });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const outcome = await scheduleEach(result.value, onSchedule);
      const dueAt = result.value[0]?.dueAt ?? null;
      setFeedback(
        describeOutcome(
          outcome,
          (id) => labels.get(id) ?? id,
          dueAt === null ? 'the next free slot' : formatDue(dueAt),
        ),
      );
      if (outcome.failed.length === 0) {
        setText('');
        setWhen('');
      } else {
        setSelected(outcome.failed.map((f) => f.channelId));
      }
      if (outcome.scheduled.length > 0) await onScheduled();
    } finally {
      setBusy(false);
    }
  }

  const count = selected.length;
  const hint =
    channels.length === 0
      ? 'No channels yet. Connect one in Buffer, then refresh.'
      : count === 0
        ? 'Choose one or more channels. Dispatch sends one post to each.'
        : `${count} of ${channels.length} ${channels.length === 1 ? 'channel' : 'channels'}. Dispatch sends one post to each.`;

  return (
    <form className="composer" onSubmit={submit} aria-labelledby="composer-title">
      <h2 id="composer-title" className="composer-title">
        New post
      </h2>

      <fieldset className="field">
        <div className="field-head">
          <legend className="field-label">Channels</legend>
          {channels.length > 1 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setSelected(allSelected ? [] : channels.map((c) => c.id))}
            >
              {allSelected ? 'Clear' : 'Select all'}
            </button>
          )}
        </div>
        <div className="channel-options">
          {channels.map((channel) => (
            <label key={channel.id} className="channel-option">
              <input
                type="checkbox"
                checked={selected.includes(channel.id)}
                onChange={(e) => toggle(channel.id, e.target.checked)}
              />
              <PlatformMark service={channel.service} />
              <span className="channel-name">{channel.name}</span>
            </label>
          ))}
        </div>
        <span className="field-hint">{hint}</span>
      </fieldset>

      <label className="field">
        <span className="field-label">Post</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} />
      </label>

      <fieldset className="field">
        <legend className="field-label">When</legend>
        <div className="when">
          <div className="segmented">
            <label>
              <input
                type="radio"
                name="timing"
                checked={timing === 'queue'}
                onChange={() => setTiming('queue')}
              />
              Next free slot
            </label>
            <label>
              <input
                type="radio"
                name="timing"
                checked={timing === 'at'}
                onChange={() => setTiming('at')}
              />
              At a time
            </label>
          </div>
          {timing === 'at' && (
            <input
              type="datetime-local"
              className="time-input"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="Publish time"
            />
          )}
        </div>
      </fieldset>

      <div className="composer-foot">
        {feedback && (
          <p
            className={feedback.ok ? 'notice notice-ok' : 'notice notice-error'}
            role={feedback.ok ? 'status' : 'alert'}
          >
            {feedback.message}
          </p>
        )}
        <button type="submit" className="primary" disabled={busy || channels.length === 0}>
          {busy ? 'Scheduling…' : count > 1 ? `Schedule ${count} posts` : 'Schedule'}
        </button>
      </div>
    </form>
  );
}
