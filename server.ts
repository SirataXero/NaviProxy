import express, { Request, Response } from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory application state
const defaultConfig = {
  navidrome: {
    url: "http://localhost:4533",
    username: "admin",
    token: "demo_salt_token_98234",
    salt: "s4lt",
    libraryPath: "/music/navidrome_library",
    connected: true,
  },
  sources: [
    {
      id: "navidrome",
      name: "Navidrome Local Server",
      enabled: true,
      priority: 1,
      description: "Direct library query to local Navidrome instance via Subsonic API",
      requiresAuth: true,
      authenticated: true,
      credentials: { url: "http://localhost:4533", username: "admin" },
      maxQuality: "HIRES_FLAC_24_192",
      rateLimitPerMin: 1200,
      lastHealthCheck: { status: "healthy", latencyMs: 12, lastChecked: new Date().toISOString() },
    },
    {
      id: "tidal",
      name: "Tidal HiFi / Master",
      enabled: true,
      priority: 2,
      description: "Lossless FLAC and Hi-Res 24-bit/96kHz & 24-bit/192kHz MQA/FLAC master streaming",
      requiresAuth: true,
      authenticated: true,
      credentials: { access_token: "tdl_oauth_sec_8723498a72b", user_id: "usr_audiophile_01" },
      maxQuality: "HIRES_FLAC_24_192",
      rateLimitPerMin: 300,
      lastHealthCheck: { status: "healthy", latencyMs: 46, lastChecked: new Date().toISOString() },
    },
    {
      id: "spotify",
      name: "Spotify Premium",
      enabled: true,
      priority: 3,
      description: "OGG Vorbis 320kbps catalog search and preview streaming",
      requiresAuth: true,
      authenticated: true,
      credentials: { client_id: "sp_cl_8762934", sp_dc: "sp_dc_auth_cookie_token_9918" },
      maxQuality: "HIGH_MP3_320",
      rateLimitPerMin: 600,
      lastHealthCheck: { status: "healthy", latencyMs: 38, lastChecked: new Date().toISOString() },
    },
    {
      id: "applemusic",
      name: "Apple Music",
      enabled: true,
      priority: 4,
      description: "Apple Lossless (ALAC) up to 24-bit/192kHz and AAC 256kbps catalog streams",
      requiresAuth: true,
      authenticated: true,
      credentials: { developer_token: "eyJh...musickit_jwt_token", storefront: "us" },
      maxQuality: "HIRES_FLAC_24_192",
      rateLimitPerMin: 400,
      lastHealthCheck: { status: "healthy", latencyMs: 52, lastChecked: new Date().toISOString() },
    },
    {
      id: "deezer",
      name: "Deezer HiFi",
      enabled: true,
      priority: 5,
      description: "16-bit/44.1kHz FLAC and MP3 320kbps direct CBR streams",
      requiresAuth: true,
      authenticated: true,
      credentials: { arl: "arl_deezer_cookie_sec_7823901" },
      maxQuality: "CD_FLAC_16_44",
      rateLimitPerMin: 500,
      lastHealthCheck: { status: "healthy", latencyMs: 41, lastChecked: new Date().toISOString() },
    },
    {
      id: "ytmusic",
      name: "YouTube Music",
      enabled: true,
      priority: 6,
      description: "256kbps Opus / AAC stream extractor with extensive live & cover catalog",
      requiresAuth: false,
      authenticated: true,
      credentials: { cookies_status: "configured" },
      maxQuality: "MID_MP3_256",
      rateLimitPerMin: 200,
      lastHealthCheck: { status: "healthy", latencyMs: 65, lastChecked: new Date().toISOString() },
    },
    {
      id: "debrid",
      name: "Real-Debrid / Torbox",
      enabled: true,
      priority: 7,
      description: "Instant cached torrent audio uncompressed lossless rips & vinyl transfers",
      requiresAuth: true,
      authenticated: true,
      credentials: { api_key: "rd_api_tok_9918234891" },
      maxQuality: "HIRES_FLAC_24_192",
      rateLimitPerMin: 150,
      lastHealthCheck: { status: "healthy", latencyMs: 78, lastChecked: new Date().toISOString() },
    },
    {
      id: "usenet",
      name: "Usenet Indexers (Newznab)",
      enabled: true,
      priority: 8,
      description: "Automated NZB music release search with SABnzbd / NZBGet pipeline",
      requiresAuth: true,
      authenticated: true,
      credentials: { indexer_url: "https://api.nzbgeek.info", api_key: "nzb_key_8719238" },
      maxQuality: "HIRES_FLAC_24_192",
      rateLimitPerMin: 100,
      lastHealthCheck: { status: "healthy", latencyMs: 95, lastChecked: new Date().toISOString() },
    },
  ],
  quality: {
    minQuality: "HIGH_MP3_320", // Default requirement: at least MP3 320kbps
    allowLowerIfUnavailable: false,
    preferredFormat: "flac",
  },
  downloads: {
    folder: "/music/downloads",
    autoTriggerOnStream: true,
    concurrentLimit: 4,
    namingPattern: "{artist}/{album}/{track} - {title}",
  },
  performance: {
    cacheTTLSeconds: 900,
    maxMemoryCacheEntries: 5000,
    searchTimeoutMs: 2500,
    streamChunkSizeBytes: 65536,
  },
};

let currentConfig = { ...defaultConfig };

// Metrics
let searchCounter = 42;
let streamCounter = 18;
let cacheHits = 126;
let cacheMisses = 31;
const serverStartTime = Date.now();

// Cache map for searches
const searchCache = new Map<string, any>();

// Quality hierarchy map
const QUALITY_WEIGHTS: Record<string, number> = {
  LOW_MP3_128: 1,
  MID_MP3_256: 2,
  HIGH_MP3_320: 3,
  CD_FLAC_16_44: 4,
  HIRES_FLAC_24_96: 5,
  HIRES_FLAC_24_192: 6,
};

// Download queue
interface DownloadTaskItem {
  id: string;
  track: any;
  status: "queued" | "downloading" | "completed" | "failed";
  progress: number;
  downloadSpeedBytesPerSec: number;
  downloadedBytes: number;
  totalBytes: number;
  startedAt: string;
  completedAt?: string;
  targetFilePath: string;
  error?: string;
}

const downloadTasks: DownloadTaskItem[] = [
  {
    id: "dl_init_01",
    track: {
      id: "tidal:td-8921",
      source: "tidal",
      title: "Get Lucky (feat. Pharrell Williams)",
      artist: "Daft Punk",
      album: "Random Access Memories (10th Anniversary)",
      duration: 369,
      quality: {
        tier: "HIRES_FLAC_24_96",
        label: "FLAC 24-bit/96kHz (Master)",
        format: "flac",
        bitrateKbps: 2760,
        sampleRateHz: 96000,
        bitDepth: 24,
        isLossless: true,
      },
    },
    status: "completed",
    progress: 100,
    downloadSpeedBytesPerSec: 0,
    downloadedBytes: 89410290,
    totalBytes: 89410290,
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3570000).toISOString(),
    targetFilePath: "/music/downloads/Daft Punk - Get Lucky.flac",
  },
];

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });
const wsClients = new Set<WebSocket>();

wss.on("connection", (ws: WebSocket) => {
  wsClients.add(ws);
  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Connected to NaviProxy real-time event bus",
      timestamp: new Date().toISOString(),
    })
  );

  ws.on("close", () => {
    wsClients.delete(ws);
  });
});

function broadcastEvent(event: any) {
  const msg = JSON.stringify(event);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Helper to generate simulated mock tracks for rich testing
function generateSourceTracks(query: string, sourceId: string): any[] {
  const q = query.trim();
  const lowerQ = q.toLowerCase();

  // Known catalog entries for realistic demos
  const catalog = [
    {
      title: "Get Lucky (feat. Pharrell Williams)",
      artist: "Daft Punk",
      album: "Random Access Memories",
      year: 2013,
      duration: 369,
      coverArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
    },
    {
      title: "Time",
      artist: "Pink Floyd",
      album: "The Dark Side of the Moon",
      year: 1973,
      duration: 425,
      coverArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
    },
    {
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      year: 2020,
      duration: 200,
      coverArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
    },
    {
      title: "So What",
      artist: "Miles Davis",
      album: "Kind of Blue",
      year: 1959,
      duration: 562,
      coverArtUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop",
    },
    {
      title: "Time",
      artist: "Hans Zimmer",
      album: "Inception (Original Motion Picture Soundtrack)",
      year: 2010,
      duration: 275,
      coverArtUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300&h=300&fit=crop",
    },
  ];

  // Match or use fallback based on query
  let matched = catalog.find((c) =>
    lowerQ.includes(c.title.toLowerCase()) || lowerQ.includes(c.artist.toLowerCase())
  );

  if (!matched) {
    matched = {
      title: q,
      artist: "Studio Performer",
      album: `${q} - Single`,
      year: 2024,
      duration: 234,
      coverArtUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    };
  }

  // Define quality characteristics according to source
  const sourceProfiles: Record<string, any> = {
    navidrome: {
      tier: "CD_FLAC_16_44",
      label: "FLAC 16-bit/44.1kHz (Navidrome Local)",
      format: "flac",
      bitrateKbps: 960,
      sampleRateHz: 44100,
      bitDepth: 16,
      isLossless: true,
      inLocalLibrary: true,
      fileSize: 32000000,
    },
    tidal: {
      tier: "HIRES_FLAC_24_96",
      label: "FLAC 24-bit/96kHz (Tidal Master)",
      format: "flac",
      bitrateKbps: 2760,
      sampleRateHz: 96000,
      bitDepth: 24,
      isLossless: true,
      fileSize: 84000000,
    },
    spotify: {
      tier: "HIGH_MP3_320",
      label: "OGG Vorbis 320kbps (Spotify High)",
      format: "ogg",
      bitrateKbps: 320,
      sampleRateHz: 44100,
      bitDepth: 16,
      isLossless: false,
      fileSize: 9500000,
    },
    applemusic: {
      tier: "HIRES_FLAC_24_192",
      label: "ALAC 24-bit/192kHz (Apple Digital Master)",
      format: "alac",
      bitrateKbps: 4608,
      sampleRateHz: 192000,
      bitDepth: 24,
      isLossless: true,
      fileSize: 128000000,
    },
    deezer: {
      tier: "CD_FLAC_16_44",
      label: "FLAC 16-bit/44.1kHz (Deezer HiFi)",
      format: "flac",
      bitrateKbps: 1411,
      sampleRateHz: 44100,
      bitDepth: 16,
      isLossless: true,
      fileSize: 38000000,
    },
    ytmusic: {
      tier: "MID_MP3_256",
      label: "Opus 256kbps (YouTube Music)",
      format: "opus",
      bitrateKbps: 256,
      sampleRateHz: 48000,
      bitDepth: 16,
      isLossless: false,
      fileSize: 6800000,
    },
    debrid: {
      tier: "HIRES_FLAC_24_96",
      label: "FLAC 24-bit/96kHz (Debrid Cached Torrent)",
      format: "flac",
      bitrateKbps: 2950,
      sampleRateHz: 96000,
      bitDepth: 24,
      isLossless: true,
      fileSize: 92000000,
    },
    usenet: {
      tier: "CD_FLAC_16_44",
      label: "FLAC 16-bit/44.1kHz (Usenet Lossless NZB)",
      format: "flac",
      bitrateKbps: 1024,
      sampleRateHz: 44100,
      bitDepth: 16,
      isLossless: true,
      fileSize: 34000000,
    },
  };

  const prof = sourceProfiles[sourceId] || sourceProfiles.spotify;
  const trackId = `${sourceId}_${Math.abs(hashString(query + sourceId)).toString(36)}`;

  return [
    {
      id: `${sourceId}:${trackId}`,
      source: sourceId,
      sourceId: trackId,
      title: matched.title,
      artist: matched.artist,
      album: matched.album,
      duration: matched.duration,
      year: matched.year,
      coverArtUrl: matched.coverArtUrl,
      quality: {
        tier: prof.tier,
        label: prof.label,
        format: prof.format,
        bitrateKbps: prof.bitrateKbps,
        sampleRateHz: prof.sampleRateHz,
        bitDepth: prof.bitDepth,
        isLossless: prof.isLossless,
      },
      streamUrl: `/stream/${sourceId}/${trackId}`,
      downloadUrl: `/download/${sourceId}/${trackId}`,
      inLocalLibrary: !!prof.inLocalLibrary,
      navidromeId: prof.inLocalLibrary ? `nd_${trackId}` : undefined,
      searchLatencyMs: Math.floor(10 + Math.random() * 25),
      fileSizeEstimateBytes: prof.fileSize,
    },
  ];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ==========================================
// 8. REST API SPECIFICATION IMPLEMENTATION
// ==========================================

// GET /search?q={query}&type={song|artist|album}&quality={min_quality}
app.get("/search", async (req: Request, res: Response) => {
  searchCounter++;
  const query = (req.query.q as string) || "";
  const type = (req.query.type as string) || "song";
  const requestedQuality = (req.query.quality as string) || currentConfig.quality.minQuality;

  if (!query) {
    res.status(400).json({ error: "Missing required parameter 'q'" });
    return;
  }

  const cacheKey = `search:${query.toLowerCase()}:${type}:${requestedQuality}`;
  if (searchCache.has(cacheKey)) {
    cacheHits++;
    const cached = searchCache.get(cacheKey);
    res.setHeader("X-Cache", "HIT");
    res.setHeader("X-Response-Time-Ms", "0.4");
    res.json({ ...cached, cached: true, tookMs: 1 });
    return;
  }

  cacheMisses++;
  const startTime = Date.now();
  const minWeight = QUALITY_WEIGHTS[requestedQuality] || QUALITY_WEIGHTS.HIGH_MP3320;

  const sourcesQueried: any[] = [];
  const allTracks: any[] = [];

  // Step 1: Check Navidrome local server
  const naviSource = currentConfig.sources.find((s) => s.id === "navidrome");
  if (naviSource && naviSource.enabled) {
    const naviStart = Date.now();
    // Simulate local library check
    const localTracks = generateSourceTracks(query, "navidrome");
    sourcesQueried.push({
      source: "navidrome",
      count: localTracks.length,
      tookMs: Date.now() - naviStart + 4,
      status: "ok",
    });
    allTracks.push(...localTracks);
  }

  // Step 2: Query configured external sources simultaneously
  const activeSources = currentConfig.sources
    .filter((s) => s.enabled && s.id !== "navidrome")
    .sort((a, b) => a.priority - b.priority);

  for (const src of activeSources) {
    const srcStart = Date.now();
    const tracks = generateSourceTracks(query, src.id);
    sourcesQueried.push({
      source: src.id,
      count: tracks.length,
      tookMs: Date.now() - srcStart + Math.floor(Math.random() * 15) + 8,
      status: "ok",
    });
    allTracks.push(...tracks);
  }

  // Step 3: Quality-based filtering
  let filteredOutCount = 0;
  const qualifiedTracks = allTracks.filter((track) => {
    const trackTier = track.quality?.tier || "LOW_MP3_128";
    const trackWeight = QUALITY_WEIGHTS[trackTier] || 1;
    if (trackWeight >= minWeight) {
      return true;
    }
    filteredOutCount++;
    return false;
  });

  // Step 4: Sorting: Navidrome local first, then highest audio fidelity
  qualifiedTracks.sort((a, b) => {
    if (a.inLocalLibrary && !b.inLocalLibrary) return -1;
    if (!a.inLocalLibrary && b.inLocalLibrary) return 1;
    const wA = QUALITY_WEIGHTS[a.quality?.tier] || 0;
    const wB = QUALITY_WEIGHTS[b.quality?.tier] || 0;
    return wB - wA;
  });

  const totalTime = Date.now() - startTime;
  const responseData = {
    query,
    type,
    minQuality: requestedQuality,
    totalResults: qualifiedTracks.length,
    filteredOutCount,
    tookMs: Math.max(totalTime, 12),
    cached: false,
    results: qualifiedTracks,
    sourcesQueried,
  };

  searchCache.set(cacheKey, responseData);
  res.setHeader("X-Cache", "MISS");
  res.setHeader("X-Response-Time-Ms", totalTime.toString());
  res.json(responseData);
});

// GET /stream/{source}/{id} - Stream from source
app.get("/stream/:source/:id", (req: Request, res: Response) => {
  streamCounter++;
  const { source, id } = req.params;

  broadcastEvent({
    type: "stream_started",
    source,
    id,
    timestamp: new Date().toISOString(),
  });

  // Synthesize a valid streamable audio waveform buffer (WAV/PCM container) so HTML5 <audio> plays smoothly
  // 44100Hz, 16-bit, 440Hz A tone with gentle stereo modulation
  const sampleRate = 44100;
  const durationSeconds = 120; // 2 minutes generated tone
  const numSamples = sampleRate * durationSeconds;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  res.setHeader("Content-Type", "audio/wav");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Audio-Source", source);
  res.setHeader("X-Audio-Bitrate", "1411");

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(totalSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  res.write(header);

  // Stream in 16KB audio chunks
  const chunkSize = 16384;
  let sampleIndex = 0;
  const toneFreq = source === "tidal" ? 528 : source === "spotify" ? 440 : 432;

  const interval = setInterval(() => {
    if (res.writableEnded || sampleIndex >= numSamples) {
      clearInterval(interval);
      if (!res.writableEnded) res.end();
      return;
    }

    const chunkSamples = Math.min(chunkSize / blockAlign, numSamples - sampleIndex);
    const buffer = Buffer.alloc(chunkSamples * blockAlign);

    for (let i = 0; i < chunkSamples; i++) {
      const t = (sampleIndex + i) / sampleRate;
      // Dual harmonic acoustic tone with gentle tremolo
      const val = Math.sin(2 * Math.PI * toneFreq * t) * 0.4 + Math.sin(2 * Math.PI * (toneFreq * 1.5) * t) * 0.15;
      const sample16 = Math.max(-32768, Math.min(32767, Math.floor(val * 24000)));

      buffer.writeInt16LE(sample16, i * 4); // Left
      buffer.writeInt16LE(sample16, i * 4 + 2); // Right
    }

    sampleIndex += chunkSamples;
    res.write(buffer);
  }, 20);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// GET & POST /download/{source}/{id} - Trigger download
app.all("/download/:source/:id", (req: Request, res: Response) => {
  const { source, id } = req.params;
  const title = (req.query.title as string) || `Track ${id}`;
  const artist = (req.query.artist as string) || "Audiophile Artist";

  const taskId = `dl_${source}_${id}_${Date.now()}`;
  const targetPath = `${currentConfig.downloads.folder}/${artist} - ${title}.flac`;

  const task: DownloadTaskItem = {
    id: taskId,
    track: {
      id: `${source}:${id}`,
      source: source as any,
      title,
      artist,
      album: "Studio Master",
      duration: 240,
      quality: {
        tier: "HIRES_FLAC_24_96",
        label: "FLAC 24-bit/96kHz",
        format: "flac",
        bitrateKbps: 2760,
        sampleRateHz: 96000,
        bitDepth: 24,
        isLossless: true,
      },
    },
    status: "queued",
    progress: 0,
    downloadSpeedBytesPerSec: 0,
    downloadedBytes: 0,
    totalBytes: 74000000,
    startedAt: new Date().toISOString(),
    targetFilePath: targetPath,
  };

  downloadTasks.unshift(task);

  // Broadcast download queued event
  broadcastEvent({
    type: "download_queued",
    task,
  });

  // Start background async progress simulation
  setTimeout(() => {
    task.status = "downloading";
    let bytes = 0;
    const total = task.totalBytes;
    const speed = 8500000; // ~8.5 MB/s

    const timer = setInterval(() => {
      bytes += Math.floor(speed * 0.25);
      if (bytes >= total) {
        task.progress = 100;
        task.downloadedBytes = total;
        task.downloadSpeedBytesPerSec = 0;
        task.status = "completed";
        task.completedAt = new Date().toISOString();
        clearInterval(timer);
        broadcastEvent({ type: "download_completed", task });
      } else {
        task.downloadedBytes = bytes;
        task.progress = Math.floor((bytes / total) * 100);
        task.downloadSpeedBytesPerSec = speed + Math.floor((Math.random() - 0.5) * 500000);
        broadcastEvent({ type: "download_progress", task });
      }
    }, 250);
  }, 300);

  res.status(202).json(task);
});

// GET /config - Retrieve current configuration
app.get("/config", (req: Request, res: Response) => {
  res.json(currentConfig);
});

// POST /config - Update configuration
app.post("/config", (req: Request, res: Response) => {
  const newConfig = req.body;
  if (!newConfig || typeof newConfig !== "object") {
    res.status(400).json({ error: "Invalid JSON configuration object" });
    return;
  }

  currentConfig = {
    ...currentConfig,
    ...newConfig,
    navidrome: { ...currentConfig.navidrome, ...(newConfig.navidrome || {}) },
    quality: { ...currentConfig.quality, ...(newConfig.quality || {}) },
    downloads: { ...currentConfig.downloads, ...(newConfig.downloads || {}) },
    performance: { ...currentConfig.performance, ...(newConfig.performance || {}) },
  };

  // Invalidate search cache when settings change
  searchCache.clear();

  broadcastEvent({
    type: "config_updated",
    config: currentConfig,
  });

  res.json({ status: "ok", config: currentConfig });
});

// POST /auth/{source} - Handle authentication
app.post("/auth/:source", (req: Request, res: Response) => {
  const { source } = req.params;
  const creds = req.body || {};

  const plugin = currentConfig.sources.find((s) => s.id === source);
  if (!plugin) {
    res.status(404).json({ error: `Plugin source ${source} not found` });
    return;
  }

  // Update credentials
  plugin.credentials = { ...plugin.credentials, ...creds };
  plugin.authenticated = true;
  plugin.lastHealthCheck = {
    status: "healthy",
    latencyMs: Math.floor(15 + Math.random() * 30),
    lastChecked: new Date().toISOString(),
  };

  broadcastEvent({
    type: "auth_success",
    source,
    timestamp: new Date().toISOString(),
  });

  res.json({
    source,
    authenticated: true,
    message: `Successfully verified and authenticated credentials for ${plugin.name}`,
  });
});

// GET /health
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "naviproxy",
    version: "1.0.0",
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// GET /metrics
app.get("/metrics", (req: Request, res: Response) => {
  const total = cacheHits + cacheMisses;
  const ratio = total > 0 ? (cacheHits / total) * 100 : 80;

  const sourcesStatus: Record<string, any> = {};
  for (const s of currentConfig.sources) {
    sourcesStatus[s.id] = {
      latencyMs: s.lastHealthCheck?.latencyMs || 25,
      errorRate: 0.0,
      active: s.enabled,
    };
  }

  res.json({
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    totalSearches: searchCounter,
    totalStreams: streamCounter,
    cacheHitRatio: Math.round(ratio * 10) / 10,
    avgSearchLatencyMs: 38,
    activeStreams: Math.floor(Math.random() * 3) + 1,
    activeDownloads: downloadTasks.filter((t) => t.status === "downloading").length,
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    sourcesStatus,
  });
});

// GET /downloads & /api/downloads
app.get(["/downloads", "/api/downloads"], (req: Request, res: Response) => {
  res.json({
    tasks: downloadTasks,
  });
});

// GET /api/go-project - Returns structured Go codebase, Dockerfile, docker-compose, etc. for in-browser inspection
app.get("/api/go-project", (req: Request, res: Response) => {
  try {
    const baseDir = path.join(process.cwd(), "go-service");
    const files: { path: string; name: string; content: string; language: string }[] = [];

    function readDirRecursive(dir: string, relPath = "") {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.join(relPath, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(full, rel);
        } else {
          let lang = "text";
          if (entry.name.endsWith(".go")) lang = "go";
          else if (entry.name.endsWith(".json")) lang = "json";
          else if (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")) lang = "yaml";
          else if (entry.name.endsWith(".md")) lang = "markdown";
          else if (entry.name.endsWith(".py")) lang = "python";
          else if (entry.name.endsWith(".sh")) lang = "bash";
          else if (entry.name === "Dockerfile") lang = "dockerfile";
          else if (entry.name === "go.mod") lang = "go";

          const content = fs.readFileSync(full, "utf-8");
          files.push({
            path: rel,
            name: entry.name,
            content,
            language: lang,
          });
        }
      }
    }

    readDirRecursive(baseDir);
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Subsonic API Compatibility Endpoints
app.get("/rest/ping.view", (req: Request, res: Response) => {
  res.json({
    "subsonic-response": {
      status: "ok",
      version: "1.16.1",
      type: "naviproxy",
      serverVersion: "1.0.0",
    },
  });
});

app.get("/rest/search3.view", (req: Request, res: Response) => {
  const query = (req.query.query as string) || "";
  const tracks = generateSourceTracks(query, "navidrome");
  res.json({
    "subsonic-response": {
      status: "ok",
      version: "1.16.1",
      searchResult3: {
        song: tracks.map((t) => ({
          id: t.sourceId,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration,
          bitRate: t.quality.bitrateKbps,
          suffix: t.quality.format,
          contentType: "audio/flac",
          year: t.year,
          coverArt: t.id,
          size: t.fileSizeEstimateBytes,
        })),
      },
    },
  });
});

app.get("/rest/stream.view", (req: Request, res: Response) => {
  req.params.source = "navidrome";
  req.params.id = (req.query.id as string) || "local_track";
  res.redirect(`/stream/navidrome/${req.params.id}`);
});

// Vite Middleware for development & Static serving for production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind WebSocket server upgrade to HTTP server
  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[NaviProxy] Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
