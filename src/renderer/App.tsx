import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Channel, NewPost, Post } from '../core/types';
import type { BufferSettingsView } from './bridge';
import { cleanErrorMessage } from './format';
import { Composer } from './Composer';
import { Timeline } from './Timeline';
import { Columns } from './Columns';
import { Onboarding, SettingsPanel, Setup } from './Connect';
import { useOrientation } from './useOrientation';
import { Brand } from './brand';
import { channelLabels } from '../core/platforms';

export function App() {
  const orientation = useOrientation();
  const bridge = window.dispatch;
  const [settings, setSettings] = useState<BufferSettingsView | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = settings?.configured ?? false;
  const labels = useMemo(() => channelLabels(channels), [channels]);

  useEffect(() => {
    if (!bridge) return;
    bridge
      .getSettings()
      .then(setSettings, (err: unknown) =>
        setError(cleanErrorMessage(err, 'Could not read settings.')),
      );
  }, [bridge]);

  const refresh = useCallback(async () => {
    if (!bridge || !configured) return;
    setLoading(true);
    try {
      const nextChannels = await bridge.listChannels();
      const nextPosts = await bridge.listPosts(nextChannels.map((c) => c.id));
      setChannels(nextChannels);
      setPosts(nextPosts);
      setError(null);
    } catch (err) {
      setError(cleanErrorMessage(err, 'Could not load posts from Buffer.'));
    } finally {
      setLoading(false);
    }
  }, [bridge, configured]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSettingsChange(view: BufferSettingsView) {
    setSettings(view);
    setError(null);
  }

  async function schedule(post: NewPost) {
    if (!bridge) throw new Error('Dispatch is not running inside the desktop app.');
    try {
      await bridge.schedulePost(post);
    } catch (err) {
      throw new Error(cleanErrorMessage(err, 'Buffer refused the post.'));
    }
  }

  if (!bridge) {
    return (
      <Setup>
        <p>Open Dispatch in the desktop app to load Buffer data.</p>
      </Setup>
    );
  }
  if (settings === null) {
    return (
      <Setup>
        <p className={error ? 'notice notice-error' : 'muted'} role={error ? 'alert' : undefined}>
          {error ?? 'Loading…'}
        </p>
      </Setup>
    );
  }
  if (!configured) {
    return <Onboarding settings={settings} onConnected={handleSettingsChange} />;
  }

  return (
    <div className={`app ${orientation}`}>
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <span className={`badge ${error ? 'badge-danger' : 'badge-ok'}`}>
            <span className="badge-dot" aria-hidden />
            Buffer
            <span className="sr-only">{error ? ' has a problem' : ' connected'}</span>
          </span>
          {showSettings ? (
            <button type="button" className="ghost" onClick={() => setShowSettings(false)}>
              Back
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ghost"
                onClick={() => void refresh()}
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
              <button type="button" className="ghost" onClick={() => setShowSettings(true)}>
                Settings
              </button>
            </>
          )}
        </div>
      </header>
      {showSettings ? (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <main className="workspace">
          <aside className="composer-pane">
            <Composer
              channels={channels}
              labels={labels}
              onSchedule={schedule}
              onScheduled={refresh}
            />
          </aside>
          <div className="posts-pane">
            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}
            {orientation === 'portrait' ? (
              <Timeline posts={posts} channels={channels} />
            ) : (
              <Columns posts={posts} channels={channels} />
            )}
          </div>
        </main>
      )}
    </div>
  );
}
