package plugins

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type SpotifyPlugin struct {
	clientID     string
	clientSecret string
	spDC         string // sp_dc cookie for Web Player auth & full track access
	accessToken  string
	tokenExpiry  time.Time
	client       *http.Client
}

func NewSpotifyPlugin() *SpotifyPlugin {
	return &SpotifyPlugin{
		client: &http.Client{Timeout: 8 * time.Second},
	}
}

func (s *SpotifyPlugin) ID() string   { return "spotify" }
func (s *SpotifyPlugin) Name() string { return "Spotify Premium" }
func (s *SpotifyPlugin) Description() string {
	return "OGG Vorbis 320kbps and rich Spotify catalog metadata"
}
func (s *SpotifyPlugin) MaxQuality() QualityTier { return QualityHighMP3320 }

func (s *SpotifyPlugin) Configure(cfg map[string]string) error {
	s.clientID = cfg["client_id"]
	s.clientSecret = cfg["client_secret"]
	s.spDC = cfg["sp_dc"]
	return nil
}

func (s *SpotifyPlugin) Authenticate(ctx context.Context) (bool, error) {
	if s.clientID == "" && s.spDC == "" {
		return false, fmt.Errorf("spotify client credentials or sp_dc required")
	}
	return true, nil
}

func (s *SpotifyPlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	start := time.Now()
	track := MusicTrack{
		ID:          "spotify:demo-track-2",
		Source:      "spotify",
		SourceID:    "demo-track-2",
		Title:       req.Query,
		Artist:      "Featured Artist",
		Album:       "Spotify Session",
		Duration:    218,
		Year:        2023,
		CoverArtURL: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
		Quality: AudioQuality{
			Tier:         QualityHighMP3320,
			Label:        "OGG Vorbis 320kbps (Very High)",
			Format:       "ogg",
			BitrateKbps:  320,
			SampleRateHz: 44100,
			IsLossless:   false,
		},
		StreamURL:     "/stream/spotify/demo-track-2",
		DownloadURL:   "/download/spotify/demo-track-2",
		SearchLatency: time.Since(start).Milliseconds(),
		FileSizeEst:   9 * 1024 * 1024,
	}
	return []MusicTrack{track}, nil
}

func (s *SpotifyPlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	return &StreamInfo{
		Reader:        io.NopCloser(strings.NewReader("SPOTIFY_OGG_AUDIO_STREAM_DATA")),
		ContentType:   "audio/ogg",
		ContentLength: -1,
		Seekable:      true,
		BitrateKbps:   320,
		Format:        "ogg",
	}, nil
}

func (s *SpotifyPlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	si, err := s.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return si.Reader, si.ContentLength, nil
}

func (s *SpotifyPlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	return true, time.Since(start)
}
