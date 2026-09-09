import React, { useState } from 'react';
import {
  ShieldCheck,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Save,
  Server,
  Lock,
} from 'lucide-react';
import { AppConfig, SourcePluginConfig } from '../types';

interface SourcePluginsManagerProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
}

export const SourcePluginsManager: React.FC<SourcePluginsManagerProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [sources, setSources] = useState<SourcePluginConfig[]>(config.sources);
  const [navidromeSettings, setNavidromeSettings] = useState(config.navidrome);
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [authFeedback, setAuthFeedback] = useState<Record<string, { success: boolean; message: string }>>({});
  const [saving, setSaving] = useState(false);

  const toggleSourceEnabled = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleCredentialChange = (sourceId: string, key: string, value: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id === sourceId) {
          return {
            ...s,
            credentials: {
              ...s.credentials,
              [key]: value,
            },
          };
        }
        return s;
      })
    );
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    const newSources = [...sources];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSources.length) return;

    const temp = newSources[index];
    newSources[index] = newSources[targetIndex];
    newSources[targetIndex] = temp;

    // Re-index priorities
    newSources.forEach((s, idx) => {
      s.priority = idx + 1;
    });

    setSources(newSources);
  };

  const testAuthentication = async (sourceId: string) => {
    setTestingSource(sourceId);
    setAuthFeedback((prev) => ({ ...prev, [sourceId]: { success: false, message: 'Authenticating...' } }));

    const source = sources.find((s) => s.id === sourceId);
    try {
      const res = await fetch(`/auth/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source?.credentials || {}),
      });

      const data = await res.json();
      if (res.ok) {
        setAuthFeedback((prev) => ({
          ...prev,
          [sourceId]: { success: true, message: data.message || 'Credentials successfully validated' },
        }));
      } else {
        setAuthFeedback((prev) => ({
          ...prev,
          [sourceId]: { success: false, message: data.error || 'Authentication rejected by upstream service' },
        }));
      }
    } catch (err: any) {
      setAuthFeedback((prev) => ({
        ...prev,
        [sourceId]: { success: false, message: err.message || 'Network error' },
      }));
    } finally {
      setTestingSource(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatedConfig: AppConfig = {
        ...config,
        navidrome: navidromeSettings,
        sources: sources,
      };
      await onUpdateConfig(updatedConfig);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Plugin Architecture & Credential Management</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Configure swappable Go source plugins, reorder priority, and manage API keys for Tidal, Spotify, Debrid, etc.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </div>

      {/* Navidrome Primary Connection Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Navidrome Server Connection (Primary Target)</h3>
              <p className="text-xs text-zinc-400">
                All music search requests check this server first before proxying to external sources
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Subsonic API v1.16.1
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Navidrome Server URL</label>
            <input
              type="text"
              value={navidromeSettings.url}
              onChange={(e) => setNavidromeSettings({ ...navidromeSettings, url: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Username</label>
            <input
              type="text"
              value={navidromeSettings.username}
              onChange={(e) => setNavidromeSettings({ ...navidromeSettings, username: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Auth Token / Password</label>
            <input
              type="password"
              value={navidromeSettings.token}
              onChange={(e) => setNavidromeSettings({ ...navidromeSettings, token: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Library Storage Watch Folder</label>
            <input
              type="text"
              value={navidromeSettings.libraryPath}
              onChange={(e) => setNavidromeSettings({ ...navidromeSettings, libraryPath: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Swappable Plugins List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Configured Audio Source Plugins (Order defines fallback priority)
        </h3>

        {sources.map((plugin, index) => {
          const feedback = authFeedback[plugin.id];
          const isTesting = testingSource === plugin.id;

          return (
            <div
              key={plugin.id}
              className={`p-4 rounded-xl border transition-all ${
                plugin.enabled
                  ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  : 'bg-zinc-950/40 border-zinc-900 opacity-60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info & Priority */}
                <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => movePriority(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePriority(index, 'down')}
                      disabled={index === sources.length - 1}
                      className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="w-6 text-center font-mono text-xs font-bold text-amber-400">
                    #{plugin.priority}
                  </span>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-zinc-100">{plugin.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        Max: {String(plugin.maxQuality).replace(/_/g, ' ')}
                      </span>
                      {plugin.lastHealthCheck && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ~{plugin.lastHealthCheck.latencyMs}ms latency
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{plugin.description}</p>
                  </div>
                </div>

                {/* Right: Enable Toggle & Auth Action */}
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => testAuthentication(plugin.id)}
                    disabled={isTesting}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Verifying...' : 'Test Auth'}</span>
                  </button>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plugin.enabled}
                      onChange={() => toggleSourceEnabled(plugin.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Dynamic Credential Inputs */}
              <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                {Object.entries(plugin.credentials).map(([k, v]) => (
                  <div key={k}>
                    <label className="block text-[11px] font-mono text-zinc-400 capitalize mb-1">
                      {k.replace(/_/g, ' ')}
                    </label>
                    <div className="relative">
                      <input
                        type={k.includes('token') || k.includes('key') || k.includes('arl') || k.includes('secret') ? 'password' : 'text'}
                        value={v}
                        onChange={(e) => handleCredentialChange(plugin.id, k, e.target.value)}
                        placeholder={`Enter ${k}...`}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Authentication Test Feedback Message */}
              {feedback && (
                <div
                  className={`mt-2 p-2 rounded-lg text-xs flex items-center space-x-2 ${
                    feedback.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {feedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
