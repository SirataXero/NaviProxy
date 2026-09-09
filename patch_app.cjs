const fs = require('fs');

const code = fs.readFileSync('src/App.tsx', 'utf8');

const newMapConfigStr = `  const mapConfig = (data: any): AppConfig => {
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
        minQuality: data.min_quality || 'HIGH_MP3_320',
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
  };`;

const replacedMapConfig = code.replace(/  const mapConfig = \(data: any\): AppConfig => \{[\s\S]*?    \};\n  \};\n/, newMapConfigStr + '\n');
fs.writeFileSync('src/App.tsx', replacedMapConfig);
console.log('App.tsx patched mapConfig successfully.');
