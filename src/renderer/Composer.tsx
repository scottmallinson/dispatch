import { useState, type FormEvent } from 'react';
import type { Channel, NewPost } from '../core/types';
import { validateNewPost } from '../core/validate';

interface ComposerProps {
  channels: Channel[];
  onSchedule: (post: NewPost) => Promise<void>;
}

export function Composer({ channels, onSchedule }: ComposerProps) {
  const [channelId, setChannelId] = useState('');
  const [text, setText] = useState('');
  const [timing, setTiming] = useState<'queue' | 'at'>('queue');
  const [when, setWhen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const candidate = {
      channelId: channelId || channels[0]?.id || '',
      text,
      dueAt: timing === 'at' ? when : null,
    };
    const result = validateNewPost(candidate);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onSchedule(result.value);
      setText('');
      setWhen('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not schedule the post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <label>
        Channel
        <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name} ({channel.service})
            </option>
          ))}
        </select>
      </label>
      <label>
        Post
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
      </label>
      <fieldset>
        <legend>When</legend>
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
          At a specific time
        </label>
        {timing === 'at' && (
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="Publish time"
          />
        )}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || channels.length === 0}>
        {busy ? 'Scheduling…' : 'Schedule'}
      </button>
    </form>
  );
}
