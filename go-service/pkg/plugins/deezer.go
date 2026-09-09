package plugins

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type DeezerPlugin struct {
	arl    string // ARL cookie for Deezer HiFi access
	client *http.Client
}

func NewDeezerPlugin() *DeezerPlugin {
	return &DeezerPlugin{
		client: &http.Client{Timeout: 8 * time.Second},
	}
}

func (d *DeezerPlugin) ID() string          { return "deezer" }
func (d *DeezerPlugin) Name() string        { return "Deezer HiFi" }
func (d *DeezerPlugin) Description() string { return "16-bit 44.1kHz FLAC and MP3 320kbps direct audio streams" }
func (d *DeezerPlugin) MaxQuality() QualityTier { return QualityCDLossless }

func (d *DeezerPlugin) Configure(cfg map[string]string) error {
	d.arl = cfg["arl"]
	return nil
}

func (d *DeezerPlugin) Authenticate(ctx context.Context) (bool, error) {
	if d.arl == "" {
		return false, fmt.Errorf("deezer ARL cookie required")
	}
	return true, nil
}

func (d *DeezerPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "deezer:demo-track-4",
		Source:      "deezer",
		SourceID:    "demo-track-4",
		Title:       req.Query,
		Artist:      "Deezer HiFi Artist",
		Album:       "Deezer Studio FLAC",
		Duration:    205,
		Year:        2024,
		CoverArtURL: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityCDLossless,
			Label:        "FLAC 16-bit/44.1kHz (HiFi)",
			Format:       "flac",
			BitrateKbps:  1411,
			SampleRateHz: 44100,
			BitDepth:     16,
			IsLossless:   true,
		},
		StreamURL:     "/stream/deezer/demo-track-4",
		DownloadURL:   "/download/deezer/demo-track-4",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   35 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (d *DeezerPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("DEEZER_FLAC_AUDIO_STREAM_DATA")),
		ContentType:   "audio/flac",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   1411,
		Format:        "flac",
	}, nil
}

func (d *DeezerPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := d.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (d *DeezerPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
