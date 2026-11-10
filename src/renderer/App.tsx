import { useCallback, useEffect, useState } from 'react';
import type { Channel, NewPost, Post } from '../core/types';
import { useOrientation } from './useOrientation';
import { Composer } from './Composer';
import { Timeline } from './Timeline';
import { Columns } from './Columns';

export function App() {
  const orientation = useOrientation();
  const bridge = window.dispatch;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!bridge?.configured) return;
    setLoading(true);
    try {
      const nextChannels = await bridge.listChannels();
      const nextPosts = await bridge.listPosts(nextChannels.map((c) => c.id));
      setChannels(nextChannels);
      setPosts(nextPosts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load posts from Buffer.');
    } finally {
      setLoading(false);
    }
  }, [bridge]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
  if (!bridge.configured) {
    return (
      <main className="setup">
        <h1>Dispatch</h1>
        <p>
          Buffer is not configured. Set <code>BUFFER_API_KEY</code> and{' '}
          <code>BUFFER_ORGANIZATION_ID</code>, then restart.
        </p>
      </main>
    );
  }

  return (
    <main className={`app ${orientation}`}>
      <header>
        <h1>Dispatch</h1>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
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
