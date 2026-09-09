export type SourceType =
  | 'navidrome'
  | 'tidal'
  | 'spotify'
  | 'applemusic'
  | 'deezer'
  | 'ytmusic'
  | 'debrid'
  | 'usenet';

export type SearchType = 'song' | 'artist' | 'album';

export type QualityTier =
  | 'LOW_MP3_128'
  | 'MID_MP3_256'
  | 'HIGH_MP3_320'
  | 'CD_FLAC_16_44'
  | 'HIRES_FLAC_24_96'
  | 'HIRES_FLAC_24_192';

export interface QualityMetadata {
  tier: QualityTier;
  label: string;
  format: string;
  bitrateKbps: number;
  sampleRateHz: number;
  bitDepth?: number;
  isLossless: boolean;
}

export interface MusicTrack {
  id: string;
  source: SourceType;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  year?: number;
  coverArtUrl?: string;
  quality: QualityMetadata;
  sourceId: string;
  streamUrl?: string;
  downloadUrl?: string;
  inLocalLibrary?: boolean;
  navidromeId?: string;
  searchLatencyMs?: number;
  fileSizeEstimateBytes?: number;
}

export interface SearchResponse {
  query: string;
  type: SearchType;
  minQuality: QualityTier;
  totalResults: number;
  filteredOutCount: number;
  tookMs: number;
  cached: boolean;
  results: MusicTrack[];
  sourcesQueried: {
    source: SourceType;
    tookMs: number;
    count: number;
    status: 'ok' | 'timeout' | 'error' | 'disabled';
  }[];
}

export interface SourcePluginConfig {
  id: SourceType;
  name: string;
  enabled: boolean;
  priority: number;
  description: string;
  requiresAuth: boolean;
  authenticated: boolean;
  credentials: Record<string, string>;
  maxQuality: QualityTier;
  rateLimitPerMin: number;
  lastHealthCheck?: {
    status: 'healthy' | 'degraded' | 'down';
    latencyMs: number;
    lastChecked: string;
  };
}

export interface AppConfig {
  navidrome: {
    url: string;
    username: string;
    token: string;
    salt: string;
    libraryPath: string;
    connected: boolean;
  };
  sources: SourcePluginConfig[];
  quality: {
    minQuality: QualityTier;
    allowLowerIfUnavailable: boolean;
    preferredFormat: 'flac' | 'alac' | 'mp3' | 'opus';
  };
  downloads: {
    folder: string;
    autoTriggerOnStream: boolean;
    concurrentLimit: number;
    namingPattern: string; // e.g. "{artist}/{album}/{track} - {title}"
  };
  performance: {
    cacheTTLSeconds: number;
    maxMemoryCacheEntries: number;
    searchTimeoutMs: number;
    streamChunkSizeBytes: number;
  };
}

export interface DownloadTask {
  id: string;
  track: MusicTrack;
  status: 'queued' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0 to 100
  downloadSpeedBytesPerSec: number;
  downloadedBytes: number;
  totalBytes: number;
  startedAt: string;
  completedAt?: string;
  targetFilePath: string;
  error?: string;
}

export interface SystemMetrics {
  uptimeSeconds: number;
  totalSearches: number;
  cacheHitRatio: number;
  avgSearchLatencyMs: number;
  activeStreams: number;
  activeDownloads: number;
  memoryUsageMb: number;
  sourcesStatus: Record<SourceType, { latencyMs: number; errorRate: number; active: boolean }>;
}
