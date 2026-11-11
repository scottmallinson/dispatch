import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComposeRequest } from '../core/compose-link';
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

const TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'settings', label: 'Settings' },
] as const;

type Tab = (typeof TABS)[number]['id'];

function tabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === hash) ? (hash as Tab) : 'posts';
}

/** The section in the URL hash, as in Bureau, so the tabs are plain links. */
function useTab(): Tab {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return tab;
}

export function App() {
  const orientation = useOrientation();
  const bridge = window.dispatch;
  const [settings, setSettings] = useState<BufferSettingsView | null>(null);
  const tab = useTab();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
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

  // Takes a link that arrived before this window was ready, then any that arrive later.
  useEffect(() => {
    if (!bridge) return;
    const take = () => {
      bridge.takeComposeRequest().then(
        (request) => {
          if (request) setCompose(request);
        },
        () => undefined,
      );
    };
    take();
    return bridge.onComposeRequest(take);
  }, [bridge]);

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
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        <div className="sources">
          <span className={`source-badge ${error ? 'error' : 'live'}`} title={error ?? 'Connected'}>
            Buffer
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Reload"
            title="Reload"
          >
            ↻
          </button>
        </div>
      </header>
      {tab === 'settings' ? (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => (window.location.hash = 'posts')}
        />
      ) : (
        <main className="workspace">
          <aside className="composer-pane">
            <Composer
              channels={channels}
              labels={labels}
              request={compose}
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
