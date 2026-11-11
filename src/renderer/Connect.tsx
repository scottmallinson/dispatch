import { useState, type FormEvent } from 'react';
import type { BufferSettingsView } from './bridge';
import { cleanErrorMessage } from './format';

const BUFFER_API_SETTINGS = 'https://publish.buffer.com/settings/api';

interface ConnectFormProps {
  settings: BufferSettingsView;
  submitLabel: string;
  onSaved: (view: BufferSettingsView) => void;
}

/** The key and organization id form, used by first-run setup and by Settings. */
export function ConnectForm({ settings, submitLabel, onSaved }: ConnectFormProps) {
  const bridge = window.dispatch;
  const [apiKey, setApiKey] = useState('');
  const [organizationId, setOrganizationId] = useState(settings.organizationId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!bridge) return;
    setBusy(true);
    setError(null);
    try {
      const view = await bridge.saveSettings({ apiKey, organizationId });
      setApiKey('');
      onSaved(view);
    } catch (err) {
      setError(cleanErrorMessage(err, 'Could not connect to Buffer.'));
    } finally {
      setBusy(false);
    }
  }

  const keyPlaceholder = settings.apiKeyHint
    ? `Saved key ${settings.apiKeyHint}. Paste a new key to replace it.`
    : 'Paste your Buffer API key';
  const canSubmit =
    !busy &&
    settings.secureStorageAvailable &&
    apiKey.trim() !== '' &&
    organizationId.trim() !== '';

  return (
    <form className="connect" onSubmit={submit}>
      {!settings.secureStorageAvailable && (
        <p className="error" role="alert">
          This computer has no secure storage, so Dispatch cannot save a key. Set BUFFER_API_KEY and
          BUFFER_ORGANIZATION_ID as environment variables instead.
        </p>
      )}
      {settings.source === 'environment' && (
        <p className="note">Environment variables are set. They override anything saved here.</p>
      )}
      <label>
        API key
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          placeholder={keyPlaceholder}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>
      <label>
        Organization ID
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={!canSubmit}>
        {busy ? 'Connecting…' : submitLabel}
      </button>
    </form>
  );
}

/** First run: shown until Buffer is connected. */
export function Onboarding({
  settings,
  onConnected,
}: {
  settings: BufferSettingsView;
  onConnected: (view: BufferSettingsView) => void;
}) {
  return (
    <main className="setup">
      <h1>Connect Dispatch to Buffer</h1>
      <p>Dispatch schedules posts through your Buffer account. You need two things from Buffer:</p>
      <ol>
        <li>
          An API key, from{' '}
          <a href={BUFFER_API_SETTINGS} target="_blank" rel="noreferrer">
            Buffer's API settings
          </a>
          .
        </li>
        <li>Your organization ID.</li>
      </ol>
      <p>
        Dispatch tests the connection before it saves anything. The key is stored encrypted on this
        computer.
      </p>
      <ConnectForm settings={settings} submitLabel="Connect" onSaved={onConnected} />
    </main>
  );
}

/** Settings: change the connection or remove the saved key. */
export function SettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: BufferSettingsView;
  onChange: (view: BufferSettingsView) => void;
  onClose: () => void;
}) {
  const bridge = window.dispatch;
  const [error, setError] = useState<string | null>(null);

  async function removeKey() {
    if (!bridge) return;
    setError(null);
    try {
      onChange(await bridge.clearSettings());
    } catch (err) {
      setError(cleanErrorMessage(err, 'Could not remove the saved key.'));
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Settings</h1>
        <button type="button" className="secondary" onClick={onClose}>
          Back
        </button>
      </header>
      <h2>Buffer</h2>
      <ConnectForm
        settings={settings}
        submitLabel="Save and test"
        onSaved={(view) => {
          onChange(view);
          onClose();
        }}
      />
      {settings.source === 'saved' && (
        <button type="button" className="secondary danger" onClick={removeKey}>
          Remove saved key
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
