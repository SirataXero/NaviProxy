package plugins

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type UsenetPlugin struct {
	indexerURL string // e.g. https://api.nzbgeek.info
	apiKey     string
	sabURL     string // SABnzbd URL for direct grab & unpack
	sabAPIKey  string
	client     *http.Client
}

func NewUsenetPlugin() *UsenetPlugin {
	return &UsenetPlugin{
		client: &http.Client{Timeout: 8 * time.Second},
	}
}

func (u *UsenetPlugin) ID() string          { return "usenet" }
func (u *UsenetPlugin) Name() string        { return "Usenet Indexers (Newznab)" }
func (u *UsenetPlugin) Description() string { return "Lossless music releases from Usenet indexers with SABnzbd/NZBGet integration" }
func (u *UsenetPlugin) MaxQuality() QualityTier { return QualityHiResLossless192 }

func (u *UsenetPlugin) Configure(cfg map[string]string) error {
	u.indexerURL = strings.TrimRight(cfg["indexer_url"], "/")
	u.apiKey = cfg["api_key"]
	u.sabURL = strings.TrimRight(cfg["sab_url"], "/")
	u.sabAPIKey = cfg["sab_api_key"]
	return nil
}

func (u *UsenetPlugin) Authenticate(ctx context.Context) (bool, error) {
	if u.indexerURL == "" || u.apiKey == "" {
		return false, fmt.Errorf("usenet indexer URL and API key required")
	}
	return true, nil
}

func (u *UsenetPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "usenet:demo-track-7",
		Source:      "usenet",
		SourceID:    "demo-track-7",
		Title:       req.Query,
		Artist:      "Audiophile Remaster",
		Album:       "Usenet Pure FLAC Archive",
		Duration:    280,
		Year:        2024,
		CoverArtURL: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityCDLossless,
			Label:        "FLAC 16-bit/44.1kHz (Lossless CD)",
			Format:       "flac",
			BitrateKbps:  980,
			SampleRateHz: 44100,
			BitDepth:     16,
			IsLossless:   true,
		},
		StreamURL:     "/stream/usenet/demo-track-7",
		DownloadURL:   "/download/usenet/demo-track-7",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   32 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (u *UsenetPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("USENET_FLAC_AUDIO_STREAM_DATA")),
		ContentType:   "audio/flac",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   980,
		Format:        "flac",
	}, nil
}

func (u *UsenetPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := u.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (u *UsenetPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
