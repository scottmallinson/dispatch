import { useEffect, useState } from 'react';
import { describeUpdate, type UpdateState } from '../core/updates';

const formatTime = (iso: string) => new Date(iso).toLocaleString();

/** The Settings card for updates. It is absent in a browser, where there is no desktop bridge. */
export function UpdatesCard() {
  const updates = window.dispatch?.updates;
  const [state, setState] = useState<UpdateState>();

  useEffect(() => {
    if (!updates) return;
    void updates.state().then(setState);
    return updates.onChange(setState);
  }, [updates]);

  if (!updates || !state) return null;
  const busy = state.status === 'checking' || state.status === 'downloading';

  return (
    <section className="settings-card" aria-labelledby="settings-updates">
      <div className="settings-card-head">
        <h2 id="settings-updates">Updates</h2>
        <span className="muted small">Version {state.version}</span>
      </div>
      <p
        className={state.status === 'error' ? 'notice notice-error' : 'muted'}
        role={state.status === 'error' ? 'alert' : 'status'}
      >
        {describeUpdate(state, formatTime)}
      </p>
      {state.status === 'ready' ? (
        <button type="button" className="primary" onClick={() => void updates.install()}>
          Restart and update
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || state.status === 'unsupported'}
          onClick={() => void updates.check().then(setState)}
        >
          Check for updates
        </button>
      )}
    </section>
  );
}
