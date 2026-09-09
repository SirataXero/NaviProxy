import React, { useState, useEffect } from 'react';
import { Server, Save, Check, AlertCircle } from 'lucide-react';

export const DockerContainerView: React.FC = () => {
  const [composeData, setComposeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable states
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [volumes, setVolumes] = useState<string[]>([]);
  const [ports, setPorts] = useState<string[]>([]);

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
                return { key: e.substring(0, idx), value: e.substring(idx + 1) };
              }
              return { key: e, value: '' };
            })
          );

          setVolumes(data.services.naviproxy.volumes || []);
          setPorts(data.services.naviproxy.ports || []);
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
      updatedCompose.services.naviproxy.volumes = volumes;
      updatedCompose.services.naviproxy.ports = ports;

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

  const handleVolumeChange = (index: number, val: string) => {
    const newVol = [...volumes];
    newVol[index] = val;
    setVolumes(newVol);
  };

  const handlePortChange = (index: number, val: string) => {
    const newPorts = [...ports];
    newPorts[index] = val;
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
    <div className="space-y-6">
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

        <div className="space-y-6">
          {/* Environment Variables */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-3 border-b border-zinc-800 pb-2">
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
            <h3 className="text-lg font-semibold text-zinc-200 mb-3 border-b border-zinc-800 pb-2">
              Volume Mappings
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {volumes.map((vol, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <label className="text-xs text-zinc-400 font-mono">Volume Binding {i + 1}</label>
                  <input
                    type="text"
                    value={vol}
                    onChange={(e) => handleVolumeChange(i, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Port Mappings */}
          <div>
            <h3 className="text-lg font-semibold text-zinc-200 mb-3 border-b border-zinc-800 pb-2">
              Port Mappings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ports.map((port, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <label className="text-xs text-zinc-400 font-mono">Port Binding {i + 1}</label>
                  <input
                    type="text"
                    value={port}
                    onChange={(e) => handlePortChange(i, e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
