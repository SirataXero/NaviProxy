package plugins

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type DebridPlugin struct {
	provider string // "realdebrid", "torbox", "premiumize"
	apiKey   string
	client   *http.Client
}

func NewDebridPlugin() *DebridPlugin {
	return &DebridPlugin{
		provider: "realdebrid",
		client:   &http.Client{Timeout: 8 * time.Second},
	}
}

func (d *DebridPlugin) ID() string   { return "debrid" }
func (d *DebridPlugin) Name() string { return "Debrid (Real-Debrid / Torbox)" }
func (d *DebridPlugin) Description() string {
	return "Instant cached torrent lossless FLAC & Master releases via Debrid API"
}
func (d *DebridPlugin) MaxQuality() QualityTier { return QualityHiResLossless192 }

func (d *DebridPlugin) Configure(cfg map[string]string) error {
	d.apiKey = cfg["api_key"]
	if p := cfg["provider"]; p != "" {
		d.provider = p
	}
	return nil
}

func (d *DebridPlugin) Authenticate(ctx context.Context) (bool, error) {
	if d.apiKey == "" {
		return false, fmt.Errorf("debrid API key required")
	}
	return true, nil
}

func (d *DebridPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "debrid:demo-track-6",
		Source:      "debrid",
		SourceID:    "demo-track-6",
		Title:       req.Query,
		Artist:      "Vinyl Rip Hi-Res",
		Album:       "Debrid Uncompressed Archive",
		Duration:    315,
		Year:        2023,
		CoverArtURL: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityHiResLossless96,
			Label:        "FLAC 24-bit/96kHz (Vinyl/Master)",
			Format:       "flac",
			BitrateKbps:  2850,
			SampleRateHz: 96000,
			BitDepth:     24,
			IsLossless:   true,
		},
		StreamURL:     "/stream/debrid/demo-track-6",
		DownloadURL:   "/download/debrid/demo-track-6",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   95 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (d *DebridPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("DEBRID_FLAC_AUDIO_STREAM_DATA")),
		ContentType:   "audio/flac",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   2850,
		Format:        "flac",
	}, nil
}

func (d *DebridPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := d.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (d *DebridPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
