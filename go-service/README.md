# NaviProxy: Dockerized Music Proxy for Navidrome

**NaviProxy** is a high-performance Go-based web service that functions as an intelligent audio proxy between third-party applications (Symfonium, DSub, Ultrasonic, Feishin, Tempo, Kodi, custom clients) and your **Navidrome** personal music server.

---

## 🎯 Architecture & Workflow

```
[ Third-Party App / Subsonic Client ]
                │
                ▼
        [ NaviProxy (:8080) ]
                │
   ┌────────────┴────────────┐
   ▼                         ▼
[ 1. Check Navidrome ]    [ 2. Cache Hit? ]
   │ (Local Library)         │ (<1ms Redis/Memory)
   │                         │
   ├─ FOUND: Direct Stream ──┘
   │
   ▼
[ NOT FOUND: Fan-Out Multi-Source Search ]
   ├── Tidal (HiFi / Master 24-bit/192kHz)
   ├── Spotify (320kbps Ogg)
   ├── Apple Music (ALAC Lossless)
   ├── Deezer (16-bit/44.1kHz FLAC)
   ├── YouTube Music (Opus 256kbps)
   ├── Real-Debrid / Torbox (Cached Lossless)
   └── Usenet Newznab Indexers (NZB Lossless)
                │
                ▼
   [ 3. Quality Threshold Filter ]
   (Drop results < Min Quality, e.g. FLAC or MP3 320k)
                │
                ▼
   [ 4. Return Unified Results (<100ms) ]
                │
                ▼
   [ 5. Simultaneous Stream & Download to /music/library ]
                │
                ▼
   [ 6. Navidrome Library Auto-Scan picks up new file ]
```

---

## 🚀 Quick Start with Docker Compose

1. Clone repository and launch containers:
```bash
git clone https://github.com/navidrome/naviproxy.git
cd naviproxy/go-service
docker-compose up -d
```

2. Open the visual configuration web interface:
```
http://localhost:8080/
```

3. Configure your Navidrome credentials and desired source API keys/tokens.

---

## 📡 REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/search?q={query}&type={song\|artist\|album}&quality={min_quality}` | Concurrent search across Navidrome + external sources with quality filtering |
| `GET` | `/stream/{source}/{id}` | Low-latency audio stream with chunked transfer encoding |
| `GET` | `/download/{source}/{id}` | Queue asynchronous download to library folder |
| `GET` | `/config` | Retrieve current configuration and credentials |
| `POST` | `/config` | Update settings, source priorities, and audio thresholds |
| `POST` | `/auth/{source}` | Authenticate/verify credentials for a source plugin |
| `GET` | `/ws` | Real-time WebSocket connection for progress and events |
| `GET` | `/health` | Healthcheck endpoint |
| `GET` | `/metrics` | Prometheus/JSON performance metrics (latency, cache, streams) |

---

## 🧩 Plugin System (Go Interfaces)

Each source implements the standard `SourcePlugin` Go interface (`pkg/plugins/interface.go`):

```go
type SourcePlugin interface {
    ID() string
    Name() string
    Description() string
    Configure(config map[string]string) error
    Authenticate(ctx context.Context) (bool, error)
    Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error)
    GetStream(ctx context.Context, trackID string) (*StreamInfo, error)
    GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error)
    MaxQuality() QualityTier
    IsHealthy(ctx context.Context) (bool, time.Duration)
}
```

New source plugins can be dropped into `pkg/plugins/` and registered with the dynamic `Registry`.

---

## 🎧 Subsonic Client Compatibility

Third-party Subsonic clients can connect directly to NaviProxy using port `8080`:
- **Server Address**: `http://<your-server-ip>:8080`
- **Username**: `admin`
- **Token/Password**: Same credentials configured in Navidrome
