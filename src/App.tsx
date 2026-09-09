import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MusicSearch } from './components/MusicSearch';
import { SourcePluginsManager } from './components/SourcePluginsManager';
import { QualitySettings } from './components/QualitySettings';
import { DownloadManager } from './components/DownloadManager';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ApiPlayground } from './components/ApiPlayground';
import { CodeExplorer } from './components/CodeExplorer';
import { UnraidTemplateView } from './components/UnraidTemplateView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AppConfig, DownloadTask, MusicTrack, SystemMetrics } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('search');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [logs, setLogs] = useState<{ time: string; text: string; type: string }[]>([
    { time: '12:00:01', text: 'NaviProxy initialized on port :8080', type: 'system' },
    { time: '12:00:02', text: 'Connected to Navidrome Subsonic endpoint v1.16.1', type: 'system' },
    { time: '12:00:02', text: 'Loaded 8 source plugins (Tidal, Spotify, Apple, Deezer, etc.)', type: 'system' },
    { time: '12:00:03', text: 'Hybrid cache initialized (L1 LRU + L2 Redis)', type: 'system' },
  ]);

  // Fetch initial config & metrics
  useEffect(() => {
    fetchConfig();
    fetchMetrics();
    fetchDownloads();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchDownloads();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/config');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load configuration', err);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/metrics');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to load metrics', err);
    }
  };

  const fetchDownloads = async () => {
    try {
      const res = await fetch('/downloads');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDownloadTasks(data);
        } else if (data && Array.isArray(data.tasks)) {
          setDownloadTasks(data.tasks);
        }
      }
    } catch (err) {
      console.error('Failed to load downloads', err);
    }
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
    try {
      const res = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setConfig(newConfig);
        addLog(`Updated configuration: Min Quality set to ${newConfig.quality.minQuality}`, 'system');
      }
    } catch (err) {
      console.error('Failed to save config', err);
    }
  };

  const handlePlayTrack = (track: MusicTrack) => {
    setCurrentPlayingTrack(track);
    setIsPlaying(true);
    addLog(`Initiated chunked stream for "${track.title}" from source [${track.source.toUpperCase()}]`, 'stream');

    // Auto-trigger simultaneous download if configured
    if (config?.downloads.autoTriggerOnStream && !track.inLocalLibrary) {
      handleDownloadTrack(track);
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDownloadTrack = async (track: MusicTrack) => {
    try {
      const res = await fetch(
        `/download/${track.source}/${track.sourceId}?title=${encodeURIComponent(
          track.title
        )}&artist=${encodeURIComponent(track.artist)}`
      );
      if (res.ok) {
        const data = await res.json();
        addLog(`Download queued: "${track.title}" to Navidrome directory`, 'download');
        fetchDownloads();
      }
    } catch (err) {
      console.error('Failed to trigger download', err);
    }
  };

  const addLog = (text: string, type: string) => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 49),
    ]);
  };

  const activeDownloadsCount = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'queued'
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-28 selection:bg-amber-500 selection:text-zinc-950">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        metrics={metrics}
        activeDownloadsCount={activeDownloadsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'search' && (
          <MusicSearch
            onPlayTrack={handlePlayTrack}
            onDownloadTrack={handleDownloadTrack}
            currentPlayingTrack={currentPlayingTrack}
            minQualitySetting={config?.quality.minQuality || 'HIGH_MP3_320'}
          />
        )}

        {activeTab === 'plugins' && config && (
          <SourcePluginsManager config={config} onUpdateConfig={handleUpdateConfig} />
        )}

        {activeTab === 'quality' && config && (
          <QualitySettings config={config} onUpdateConfig={handleUpdateConfig} />
        )}

        {activeTab === 'downloads' && config && (
          <DownloadManager
            tasks={downloadTasks}
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}

        {activeTab === 'unraid' && <UnraidTemplateView />}

        {activeTab === 'metrics' && (
          <MetricsDashboard metrics={metrics} logs={logs} />
        )}

        {activeTab === 'api' && <ApiPlayground />}

        {activeTab === 'code' && <CodeExplorer />}
      </main>

      {/* Persistent Bottom Audio Player Bar */}
      <AudioPlayerBar
        currentTrack={currentPlayingTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onDownload={handleDownloadTrack}
      />
    </div>
  );
}

export default App;
