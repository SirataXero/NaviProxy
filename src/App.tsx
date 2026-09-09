import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MusicSearch } from './components/MusicSearch';
import { SourcePluginsManager } from './components/SourcePluginsManager';
import { QualitySettings } from './components/QualitySettings';
import { DownloadManager } from './components/DownloadManager';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ApiPlayground } from './components/ApiPlayground';
import { CodeExplorer } from './components/CodeExplorer';
import { DockerContainerView } from './components/DockerContainerView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AppConfig, DownloadTask, MusicTrack, SystemMetrics } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('search');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isGoBackend, setIsGoBackend] = useState(false);
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

  
  const mapQualityTierFromGo = (val: any): QualityTier => {
    if (typeof val === 'string') return val as QualityTier;
    switch (val) {
      case 1: return 'LOW_MP3_128';
      case 2: return 'MID_MP3_256';
      case 3: return 'HIGH_MP3_320';
      case 4: return 'CD_FLAC_16_44';
      case 5: return 'HIRES_FLAC_24_96';
      case 6: return 'HIRES_FLAC_24_192';
      default: return 'HIGH_MP3_320';
    }
  };

  const mapQualityTierToGo = (val: QualityTier): number => {
    switch (val) {
      case 'LOW_MP3_128': return 1;
      case 'MID_MP3_256': return 2;
      case 'HIGH_MP3_320': return 3;
      case 'CD_FLAC_16_44': return 4;
      case 'HIRES_FLAC_24_96': return 5;
      case 'HIRES_FLAC_24_192': return 6;
      default: return 3;
    }
  };

  const mapConfig = (data: any): AppConfig => {
    // Fill in default values to prevent crashes in SourcePluginsManager
    const defaultSources = {
      navidrome: { id: "navidrome", name: "Navidrome Local", description: "Local library synchronization", maxQuality: "HIRES_FLAC_24_192" },
      tidal: { id: "tidal", name: "Tidal HiFi/Master", description: "High fidelity streams", maxQuality: "HIRES_FLAC_24_192" },
      spotify: { id: "spotify", name: "Spotify Premium", description: "OGG Vorbis 320kbps", maxQuality: "HIGH_MP3_320" },
      applemusic: { id: "applemusic", name: "Apple Music", description: "ALAC up to 24-bit/192kHz", maxQuality: "HIRES_FLAC_24_192" },
      deezer: { id: "deezer", name: "Deezer HiFi", description: "FLAC 16-bit/44.1kHz", maxQuality: "CD_FLAC_16_44" },
      ytmusic: { id: "ytmusic", name: "YouTube Music", description: "256kbps Opus/AAC", maxQuality: "MID_MP3_256" },
      debrid: { id: "debrid", name: "Real-Debrid / Torbox", description: "Cached torrent rips", maxQuality: "HIRES_FLAC_24_192" },
      usenet: { id: "usenet", name: "Usenet Indexers", description: "Automated NZB search", maxQuality: "HIRES_FLAC_24_192" }
    };

    const mappedSources = Object.values(data.sources || {}).map((s: any) => ({
      id: s.id,
      name: s.name || (defaultSources as any)[s.id]?.name || s.id,
      enabled: s.enabled,
      priority: s.priority,
      credentials: s.credentials || {},
      description: (defaultSources as any)[s.id]?.description || "Source plugin",
      requiresAuth: true,
      authenticated: true,
      maxQuality: (defaultSources as any)[s.id]?.maxQuality || "HIGH_MP3_320",
      rateLimitPerMin: 100,
    }));

    return {
      navidrome: {
        url: data.navidrome_server_url || '',
        username: data.navidrome_username || '',
        token: data.navidrome_token || '',
        salt: data.navidrome_salt || '',
        libraryPath: data.download_folder || '',
        connected: true,
      },
      sources: mappedSources,
      quality: {
        minQuality: mapQualityTierFromGo(data.min_quality),
        allowLowerIfUnavailable: false,
        preferredFormat: 'flac',
      },
      downloads: {
        folder: data.download_folder || '',
        autoTriggerOnStream: data.auto_trigger_download || false,
        concurrentLimit: data.concurrent_limit || 4,
        namingPattern: "{artist}/{album}/{track} - {title}",
      },
      performance: {
        cacheTTLSeconds: 900,
        maxMemoryCacheEntries: 5000,
        searchTimeoutMs: 2500,
        streamChunkSizeBytes: 65536,
      }
    };
  };

  const mapMetrics = (data: any): SystemMetrics => {
    return {
      uptimeSeconds: data.uptime_seconds || 0,
      totalSearches: data.total_searches || 0,
      cacheHitRatio: data.cache_hit_ratio || 0,
      avgSearchLatencyMs: 0,
      activeStreams: data.total_streams || 0,
      activeDownloads: 0,
      memoryUsageMb: data.memory_alloc_mb || 0,
      sourcesStatus: {
        navidrome: { latencyMs: 10, errorRate: 0, active: true },
        tidal: { latencyMs: 20, errorRate: 0, active: true },
        spotify: { latencyMs: 15, errorRate: 0, active: true },
        applemusic: { latencyMs: 30, errorRate: 0, active: true },
        deezer: { latencyMs: 12, errorRate: 0, active: true },
        ytmusic: { latencyMs: 40, errorRate: 0, active: true },
        debrid: { latencyMs: 50, errorRate: 0, active: true },
        usenet: { latencyMs: 60, errorRate: 0, active: true },
      } as any
    };
  };

  const mapDownloads = (tasks: any[]): DownloadTask[] => {
    return tasks.map(t => {
      if (t.downloadSpeedBytesPerSec !== undefined) return t;
      return {
        id: t.id,
        track: t.track,
        status: t.status,
        progress: t.progress,
        downloadSpeedBytesPerSec: t.speed_bps || 0,
        downloadedBytes: t.bytes_read || 0,
        totalBytes: t.bytes_total || 0,
        targetFilePath: t.target_file_path || '',
        startedAt: t.started_at,
        completedAt: t.completed_at,
        error: t.error
      };
    });
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/config');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.navidrome_server_url !== undefined) {
          setIsGoBackend(true);
          setConfig(mapConfig(data));
        } else {
          setConfig(data);
        }
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
        if (data.uptime_seconds !== undefined) {
          setMetrics(mapMetrics(data));
        } else {
          setMetrics(data);
        }
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
          setDownloadTasks(mapDownloads(data));
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
      let bodyData: any = newConfig;
      if (isGoBackend) {
        bodyData = {
          navidrome_server_url: newConfig.navidrome.url,
          navidrome_username: newConfig.navidrome.username,
          navidrome_token: newConfig.navidrome.token,
          navidrome_salt: newConfig.navidrome.salt,
          download_folder: newConfig.downloads.folder,
          min_quality: mapQualityTierToGo(newConfig.quality.minQuality),
          auto_trigger_download: newConfig.downloads.autoTriggerOnStream,
          concurrent_limit: newConfig.downloads.concurrentLimit,
          sources: newConfig.sources.reduce((acc, src) => {
            acc[src.id] = src;
            return acc;
          }, {} as Record<string, any>),
          redis_addr: ""
        };
      }
      const res = await fetch('/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
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
    if (config?.downloads?.autoTriggerOnStream && !track.inLocalLibrary) {
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
            minQualitySetting={config?.quality?.minQuality || 'HIGH_MP3_320'}
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

        {activeTab === 'docker' && <DockerContainerView />}

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
