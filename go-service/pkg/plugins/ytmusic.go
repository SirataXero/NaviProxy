package plugins

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"
)

type YTMusicPlugin struct {
	cookiesPath string
	visitorData string
	client      *http.Client
}

func NewYTMusicPlugin() *YTMusicPlugin {
	return &YTMusicPlugin{
		client: &http.Client{Timeout: 8 * time.Second},
	}
}

func (y *YTMusicPlugin) ID() string          { return "ytmusic" }
func (y *YTMusicPlugin) Name() string        { return "YouTube Music" }
func (y *YTMusicPlugin) Description() string { return "YouTube Music 256kbps AAC / Opus audio stream extraction" }
func (y *YTMusicPlugin) MaxQuality() QualityTier { return QualityMidMP3256 }

func (y *YTMusicPlugin) Configure(cfg map[string]string) error {
	y.cookiesPath = cfg["cookies_path"]
	y.visitorData = cfg["visitor_data"]
	return nil
}

func (y *YTMusicPlugin) Authenticate(ctx context.Context) (bool, error) {
	return true, nil // public search works without full auth
}

func (y *YTMusicPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "ytmusic:demo-track-5",
		Source:      "ytmusic",
		SourceID:    "demo-track-5",
		Title:       req.Query,
		Artist:      "YouTube Official Audio",
		Album:       "Single Release",
		Duration:    210,
		Year:        2024,
		CoverArtURL: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityMidMP3256,
			Label:        "Opus / AAC 256kbps",
			Format:       "opus",
			BitrateKbps:  256,
			SampleRateHz: 48000,
			IsLossless:   false,
		},
		StreamURL:     "/stream/ytmusic/demo-track-5",
		DownloadURL:   "/download/ytmusic/demo-track-5",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   6 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (y *YTMusicPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("YOUTUBE_AUDIO_STREAM_DATA")),
		ContentType:   "audio/webm",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   256,
		Format:        "opus",
	}, nil
}

func (y *YTMusicPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := y.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (y *YTMusicPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
