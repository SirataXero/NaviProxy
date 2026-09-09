import React, { useState, useEffect } from 'react';
import { Server, Save, Check, AlertCircle, Trash2, Plus } from 'lucide-react';

export const DockerContainerView: React.FC = () => {
  const [composeData, setComposeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable states
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [volumes, setVolumes] = useState<{ host: string; container: string }[]>([]);
  const [ports, setPorts] = useState<{ host: string; container: string }[]>([]);

  // Delete confirmation state
  const [volumeToDelete, setVolumeToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/docker-compose')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.services && data.services.naviproxy) {
          setComposeData(data);
          
          const envs = data.services.naviproxy.environment || [];
          setEnvVars(
            envs.map((e: string) => {
              const idx = e.indexOf('=');
              if (idx > -1) {
                let key = e.substring(0, idx);
                if (key === 'NAVIDROME_TOKEN') key = 'NAVIDROME_PASSWORD'; // ensure upgrade
                return { key, value: e.substring(idx + 1) };
              }
              return { key: e, value: '' };
            })
          );

          setVolumes(
            (data.services.naviproxy.volumes || []).map((v: string) => {
              const parts = v.split(':');
              return { host: parts[0] || '', container: parts[1] || '' };
            })
          );

          setPorts(
            (data.services.naviproxy.ports || []).map((p: string) => {
              const parts = p.split(':');
              return { host: parts[0] || '', container: parts[1] || '' };
            })
          );
        } else {
          setError('Could not parse docker-compose.yml properly.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updatedCompose = { ...composeData };
      updatedCompose.services.naviproxy.environment = envVars.map(
        (e) => `${e.key}=${e.value}`
      );
      updatedCompose.services.naviproxy.volumes = volumes
        .filter((v) => v.host || v.container)
        .map((v) => `${v.host}:${v.container}`);
      updatedCompose.services.naviproxy.ports = ports
        .filter((p) => p.host || p.container)
        .map((p) => `${p.host}:${p.container}`);

      const res = await fetch('/api/docker-compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedCompose),
      });

      if (!res.ok) {
        throw new Error('Failed to save docker-compose.yml');
      }

      setSuccessMsg('Docker configuration updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEnvChange = (index: number, val: string) => {
    const newEnv = [...envVars];
    newEnv[index].value = val;
    setEnvVars(newEnv);
  };

  const handleVolumeChange = (index: number, field: 'host' | 'container', val: string) => {
    const newVol = [...volumes];
    newVol[index][field] = val;
    setVolumes(newVol);
  };

  const addVolume = () => {
    setVolumes([...volumes, { host: '', container: '' }]);
  };

  const confirmDeleteVolume = (index: number) => {
    setVolumeToDelete(index);
  };

  const deleteVolume = () => {
    if (volumeToDelete !== null) {
      const newVol = [...volumes];
      newVol.splice(volumeToDelete, 1);
      setVolumes(newVol);
      setVolumeToDelete(null);
    }
  };

  const handlePortChange = (index: number, field: 'host' | 'container', val: string) => {
    const newPorts = [...ports];
    newPorts[index][field] = val;
    setPorts(newPorts);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-zinc-400">
        Loading Docker Container settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Delete Confirmation Modal */}
      {volumeToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Are you sure?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This will remove your volume mapping from your Docker container.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setVolumeToDelete(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={deleteVolume}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Delete Volume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Server className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Docker Container Configuration</h2>
              <p className="text-sm text-zinc-400">
                Manage your docker-compose variables and volume mappings persistently.
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {saving ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Config</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-emerald-400 text-sm">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* Environment Variables */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">
              Environment Variables
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {envVars.map((env, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <label className="text-xs text-zinc-400 font-mono">{env.key}</label>
                  <input
                    type="text"
                    value={env.value}
                    onChange={(e) => handleEnvChange(i, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Volume Mappings */}
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
              <h3 className="text-lg font-semibold text-zinc-200">Volume Mappings</h3>
              <button
                onClick={addVolume}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-medium transition-colors border border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <div className="space-y-4">
              {volumes.map((vol, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-zinc-400 font-mono">Host:</label>
                    <input
                      type="text"
                      value={vol.host}
                      onChange={(e) => handleVolumeChange(i, 'host', e.target.value)}
                      placeholder="/mnt/user/data"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-zinc-400 font-mono">Local Container:</label>
                    <input
                      type="text"
                      value={vol.container}
                      onChange={(e) => handleVolumeChange(i, 'container', e.target.value)}
                      placeholder="/app/data"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => confirmDeleteVolume(i)}
                    className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete Volume"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Port Mappings */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-4 border-b border-zinc-800 pb-2">
              Port Mappings
            </h3>
            <div className="space-y-4">
              {ports.map((port, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-4 items-start bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-zinc-400 font-mono">Host Port:</label>
                    <input
                      type="text"
                      value={port.host}
                      onChange={(e) => handlePortChange(i, 'host', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs text-zinc-400 font-mono">Container Port:</label>
                    <input
                      type="text"
                      value={port.container}
                      onChange={(e) => handlePortChange(i, 'container', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
