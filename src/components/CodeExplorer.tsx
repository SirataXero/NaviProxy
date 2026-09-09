import React, { useState } from 'react';
import { FileCode, Copy, Check, Download, Folder, FileText, CheckCircle2 } from 'lucide-react';

interface CodeFile {
  name: string;
  category: 'Go Backend' | 'Docker & Deploy' | 'Documentation' | 'Integration';
  lang: string;
  description: string;
  content: string;
}

const FILES: CodeFile[] = [
  {
    name: 'Dockerfile',
    category: 'Docker & Deploy',
    lang: 'dockerfile',
    description: 'Multi-stage production build with non-root security and ca-certificates',
    content: `# Build Stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod ./
# COPY go.sum ./
RUN go mod download || true

COPY . .

# Build statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o naviproxy ./cmd/server

# Final Production Stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata ffmpeg

WORKDIR /app

COPY --from=builder /app/naviproxy .

# Create non-root user
RUN adduser -D -g '' appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

ENTRYPOINT ["./naviproxy"]
`,
  },
  {
    name: 'docker-compose.yml',
    category: 'Docker & Deploy',
    lang: 'yaml',
    description: 'Complete stack: NaviProxy + Navidrome + Redis caching',
    content: `version: '3.8'

services:
  naviproxy:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: naviproxy
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - REDIS_URL=redis://redis:6379
      - NAVIDROME_URL=http://navidrome:4533
      - NAVIDROME_USER=admin
      - NAVIDROME_TOKEN=secret_token
      - DOWNLOAD_DIR=/music/downloads
    volumes:
      - ./config.json:/app/config.json
      - music_data:/music
    depends_on:
      - redis
      - navidrome

  redis:
    image: redis:7-alpine
    container_name: naviproxy-redis
    restart: unless-stopped
    ports:
      - "6379:6379"

  navidrome:
    image: deluan/navidrome:latest
    container_name: navidrome
    restart: unless-stopped
    ports:
      - "4533:4533"
    environment:
      - ND_SCANSCHEDULE=1h
      - ND_LOGLEVEL=info
      - ND_SESSIONTIMEOUT=24h
    volumes:
      - music_data:/music
      - navidrome_data:/data

volumes:
  music_data:
  navidrome_data:
`,
  },
  {
    name: 'pkg/plugins/interface.go',
    category: 'Go Backend',
    lang: 'go',
    description: 'Extensible SourcePlugin interface contract for all music sources',
    content: `package plugins

import (
	"context"
	"io"
)

type QualityTier string

const (
	QualityLowMP3128    QualityTier = "LOW_MP3_128"
	QualityMidMP3256    QualityTier = "MID_MP3_256"
	QualityHighMP3320   QualityTier = "HIGH_MP3_320"
	QualityCDFLAC1644   QualityTier = "CD_FLAC_16_44"
	QualityHiRes2496    QualityTier = "HIRES_FLAC_24_96"
	QualityMaster24192  QualityTier = "HIRES_FLAC_24_192"
)

type AudioQuality struct {
	Tier         QualityTier \`json:"tier"\`
	BitrateKbps  int         \`json:"bitrateKbps"\`
	SampleRateHz int         \`json:"sampleRateHz"\`
	BitDepth     int         \`json:"bitDepth"\`
	Format       string      \`json:"format"\`
	IsLossless   bool        \`json:"isLossless"\`
	Label        string      \`json:"label"\`
}

type Track struct {
	ID             string       \`json:"id"\`
	Source         string       \`json:"source"\`
	SourceID       string       \`json:"sourceId"\`
	Title          string       \`json:"title"\`
	Artist         string       \`json:"artist"\`
	Album          string       \`json:"album"\`
	Duration       int          \`json:"duration"\`
	Quality        AudioQuality \`json:"quality"\`
	CoverArtURL    string       \`json:"coverArtUrl"\`
	StreamURL      string       \`json:"streamUrl"\`
	InLocalLibrary bool         \`json:"inLocalLibrary"\`
	Year           int          \`json:"year,omitempty"\`
}

type SourcePlugin interface {
	ID() string
	Name() string
	MaxQuality() QualityTier
	IsEnabled() bool
	SetEnabled(enabled bool)
	Priority() int
	SetPriority(priority int)
	Configure(creds map[string]string) error
	TestAuth(ctx context.Context) error
	Search(ctx context.Context, query string, searchType string) ([]Track, error)
	GetStream(ctx context.Context, trackID string) (io.ReadCloser, string, error)
	Download(ctx context.Context, trackID string, targetPath string) error
}
`,
  },
  {
    name: 'pkg/proxy/service.go',
    category: 'Go Backend',
    lang: 'go',
    description: 'Concurrent fan-out search with Navidrome prioritization and quality filtering',
    content: `package proxy

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"

	"naviproxy/pkg/cache"
	"naviproxy/pkg/plugins"
)

type Service struct {
	registry   *plugins.Registry
	cache      *cache.Cache
	downloader *Downloader
}

func NewService(registry *plugins.Registry, c *cache.Cache, d *Downloader) *Service {
	return &Service{
		registry:   registry,
		cache:      c,
		downloader: d,
	}
}

// Search executes intelligent multi-source query
// 1. Checks local Navidrome first
// 2. If not found, fans out concurrently to enabled external plugins
// 3. Filters out any results below minQuality threshold
func (s *Service) Search(ctx context.Context, query string, searchType string, minQuality plugins.QualityTier) (*SearchResponse, error) {
	start := time.Now()
	cacheKey := fmt.Sprintf("search:%s:%s:%s", query, searchType, minQuality)

	// Check L1/L2 Cache (<1ms)
	if cached, found := s.cache.Get(cacheKey); found {
		resp := cached.(*SearchResponse)
		resp.Cached = true
		resp.TookMs = time.Since(start).Milliseconds()
		return resp, nil
	}

	var allTracks []plugins.Track
	var filteredOut int
	var sourcesQueried []SourceTelemetry

	// Step 1: Query Navidrome server first
	if navidromePlugin, err := s.registry.Get("navidrome"); err == nil && navidromePlugin.IsEnabled() {
		navStart := time.Now()
		tracks, err := navidromePlugin.Search(ctx, query, searchType)
		sourcesQueried = append(sourcesQueried, SourceTelemetry{
			Source: "navidrome",
			Count:  len(tracks),
			TookMs: time.Since(navStart).Milliseconds(),
		})
		if err == nil {
			for i := range tracks {
				tracks[i].InLocalLibrary = true
			}
			allTracks = append(allTracks, tracks...)
		}
	}

	// Step 2: Concurrently query all external plugins using Goroutines
	extPlugins := s.registry.GetEnabledExcluding("navidrome")
	if len(extPlugins) > 0 {
		var wg sync.WaitGroup
		var mu sync.Mutex

		ctxTimeout, cancel := context.WithTimeout(ctx, 4*time.Second)
		defer cancel()

		for _, p := range extPlugins {
			wg.Add(1)
			go func(plugin plugins.SourcePlugin) {
				defer wg.Done()
				pStart := time.Now()
				tracks, err := plugin.Search(ctxTimeout, query, searchType)

				mu.Lock()
				defer mu.Unlock()
				sourcesQueried = append(sourcesQueried, SourceTelemetry{
					Source: plugin.ID(),
					Count:  len(tracks),
					TookMs: time.Since(pStart).Milliseconds(),
				})
				if err == nil {
					allTracks = append(allTracks, tracks...)
				}
			}(p)
		}
		wg.Wait()
	}

	// Step 3: Filter by quality requirement
	var qualifiedTracks []plugins.Track
	for _, t := range allTracks {
		if plugins.IsQualitySufficient(t.Quality.Tier, minQuality) {
			qualifiedTracks = append(qualifiedTracks, t)
		} else {
			filteredOut++
		}
	}

	// Step 4: Sort by Navidrome local first, then by priority
	sort.SliceStable(qualifiedTracks, func(i, j int) bool {
		if qualifiedTracks[i].InLocalLibrary != qualifiedTracks[j].InLocalLibrary {
			return qualifiedTracks[i].InLocalLibrary
		}
		return qualifiedTracks[i].Quality.BitrateKbps > qualifiedTracks[j].Quality.BitrateKbps
	})

	response := &SearchResponse{
		Query:            query,
		TotalResults:     len(qualifiedTracks),
		FilteredOutCount: filteredOut,
		Results:          qualifiedTracks,
		SourcesQueried:   sourcesQueried,
		TookMs:           time.Since(start).Milliseconds(),
	}

	// Store in cache for 5 minutes
	s.cache.Set(cacheKey, response, 5*time.Minute)

	return response, nil
}
`,
  },
  {
    name: 'README.md',
    category: 'Documentation',
    lang: 'markdown',
    description: 'Complete architecture setup, CLI instructions, and Subsonic client pairing',
    content: `# NaviProxy — Navidrome Music Streaming & Intelligent Source Proxy

NaviProxy is a high-performance Dockerized web service in Go that acts as an intelligent music proxy between third-party apps and your Navidrome music server.

## Features
- **Navidrome Priority**: Checks local library first before reaching out to cloud providers
- **Multi-Source Concurrency**: Fans out searches across Tidal, Spotify, Apple Music, Deezer, YouTube Music, Real-Debrid, and Usenet
- **Quality-Based Thresholding**: Drops results lower than your selected audio tier (e.g. CD FLAC 16/44.1 or Hi-Res 24/96)
- **Subsonic API Compatibility**: Compatible with Symfonium, DSub, Ultrasonic, Feishin, Tempo
- **Sub-100ms Response**: Hybrid L1 in-memory + L2 Redis cache
- **Simultaneous Caching**: Playback streams instantly while async worker saves file directly into Navidrome's music folder

## Quick Start with Docker
\`\`\`bash
git clone https://github.com/your-org/naviproxy.git
cd naviproxy
docker compose up -d
\`\`\`
`,
  },
];

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name.split('/').pop() || 'file';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
          <FileCode className="w-5 h-5 text-amber-400" />
          <span>Go Project Architecture & Docker Infrastructure Code</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Inspect and download the complete Go codebase, multi-stage Dockerfile, docker-compose orchestration, and benchmark tests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Files Tree */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Folder className="w-4 h-4 text-amber-400" />
            <span>Project Files</span>
          </h3>

          <div className="space-y-1">
            {FILES.map((f) => {
              const isSelected = selectedFile.name === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setSelectedFile(f)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/80 text-zinc-100 font-semibold'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <FileText className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span className="truncate font-mono">{f.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-sans">
                    {f.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-100">
                  {selectedFile.name}
                </span>
                <p className="text-[11px] text-zinc-400">{selectedFile.description}</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-200 overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin">
              <pre className="leading-relaxed">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
