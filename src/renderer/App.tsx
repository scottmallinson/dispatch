import { useCallback, useEffect, useState } from 'react';
import type { Channel, NewPost, Post } from '../core/types';
import type { BufferSettingsView } from './bridge';
import { cleanErrorMessage } from './format';
import { Composer } from './Composer';
import { Timeline } from './Timeline';
import { Columns } from './Columns';
import { Onboarding, SettingsPanel } from './Connect';
import { useOrientation } from './useOrientation';

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
    await bridge.schedulePost(post);
    await refresh();
  }

  if (!bridge) {
    return (
      <main className="setup">
        <p>Open Dispatch in the desktop app to load Buffer data.</p>
      </main>
    );
  }
  if (settings === null) {
    return (
      <main className="setup">
        <p>{error ?? 'Loading…'}</p>
      </main>
    );
  }
  if (!configured) {
    return <Onboarding settings={settings} onConnected={handleSettingsChange} />;
  }
  if (showSettings) {
    return (
      <SettingsPanel
        settings={settings}
        onChange={handleSettingsChange}
        onClose={() => setShowSettings(false)}
      />
    );
  }

  return (
    <main className={`app ${orientation}`}>
      <header>
        <h1>Dispatch</h1>
        <div className="header-actions">
          <button type="button" className="secondary" onClick={() => setShowSettings(true)}>
            Settings
          </button>
          <button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Composer channels={channels} onSchedule={schedule} />
      {orientation === 'portrait' ? (
        <Timeline posts={posts} channels={channels} />
      ) : (
        <Columns posts={posts} channels={channels} />
      )}
    </main>
  );
}
