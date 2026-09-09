package plugins

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type AppleMusicPlugin struct {
	developerToken string
	userMusicToken string
	storefront     string
	client         *http.Client
}

func NewAppleMusicPlugin() *AppleMusicPlugin {
	return &AppleMusicPlugin{
		storefront: "us",
		client:     &http.Client{Timeout: 8 * time.Second},
	}
}

func (a *AppleMusicPlugin) ID() string   { return "applemusic" }
func (a *AppleMusicPlugin) Name() string { return "Apple Music" }
func (a *AppleMusicPlugin) Description() string {
	return "Apple Lossless (ALAC) up to 24-bit/192kHz and AAC 256kbps"
}
func (a *AppleMusicPlugin) MaxQuality() QualityTier { return QualityHiResLossless192 }

func (a *AppleMusicPlugin) Configure(cfg map[string]string) error {
	a.developerToken = cfg["developer_token"]
	a.userMusicToken = cfg["user_token"]
	if sf := cfg["storefront"]; sf != "" {
		a.storefront = sf
	}
	return nil
}

func (a *AppleMusicPlugin) Authenticate(ctx context.Context) (bool, error) {
	if a.developerToken == "" {
		return false, fmt.Errorf("developer token required")
	}
	return true, nil
}

func (a *AppleMusicPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "applemusic:demo-track-3",
		Source:      "applemusic",
		SourceID:    "demo-track-3",
		Title:       req.Query,
		Artist:      "Apple Digital Master Artist",
		Album:       "Spatial Lossless Edition",
		Duration:    260,
		Year:        2024,
		CoverArtURL: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityCDLossless,
			Label:        "ALAC 16-bit/44.1kHz (Lossless)",
			Format:       "alac",
			BitrateKbps:  920,
			SampleRateHz: 44100,
			BitDepth:     16,
			IsLossless:   true,
		},
		StreamURL:     "/stream/applemusic/demo-track-3",
		DownloadURL:   "/download/applemusic/demo-track-3",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   28 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (a *AppleMusicPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("APPLE_MUSIC_ALAC_AUDIO_STREAM_DATA")),
		ContentType:   "audio/mp4",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   920,
		Format:        "alac",
	}, nil
}

func (a *AppleMusicPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := a.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (a *AppleMusicPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
