package plugins

import (
	"context"
	"io"
	"time"
)

// QualityTier defines standard audio quality levels for audio evaluation
type QualityTier int

const (
	QualityLowMP3128        QualityTier = iota + 1 // MP3 128 kbps
	QualityMidMP3256                               // MP3 256 kbps / AAC 256 kbps
	QualityHighMP3320                              // MP3 320 kbps
	QualityCDLossless                              // FLAC/ALAC 16-bit / 44.1 kHz (~850-1000 kbps)
	QualityHiResLossless96                         // FLAC 24-bit / 96 kHz (~2500-3000 kbps)
	QualityHiResLossless192                        // FLAC 24-bit / 192 kHz (~4500-9216 kbps)
)

func (q QualityTier) String() string {
	switch q {
	case QualityLowMP3128:
		return "MP3 128kbps"
	case QualityMidMP3256:
		return "MP3/AAC 256kbps"
	case QualityHighMP3320:
		return "MP3 320kbps"
	case QualityCDLossless:
		return "FLAC 16-bit/44.1kHz (CD)"
	case QualityHiResLossless96:
		return "FLAC 24-bit/96kHz (Hi-Res)"
	case QualityHiResLossless192:
		return "FLAC 24-bit/192kHz (Master Studio)"
	default:
		return "Unknown Quality"
	}
}

// AudioQuality contains detailed technical specifications of the audio
type AudioQuality struct {
	Tier         QualityTier `json:"tier"`
	Label        string      `json:"label"`
	Format       string      `json:"format"` // flac, mp3, aac, alac
	BitrateKbps  int         `json:"bitrate_kbps"`
	SampleRateHz int         `json:"sample_rate_hz"`
	BitDepth     int         `json:"bit_depth,omitempty"`
	IsLossless   bool        `json:"is_lossless"`
}

// SearchItemType specifies whether the search is for songs, albums, or artists
type SearchItemType string

const (
	TypeSong   SearchItemType = "song"
	TypeAlbum  SearchItemType = "album"
	TypeArtist SearchItemType = "artist"
)

// SearchRequest parameters for multi-source search
type SearchRequest struct {
	Query      string         `json:"query"`
	Type       SearchItemType `json:"type"`
	MinQuality QualityTier    `json:"min_quality"`
	Limit      int            `json:"limit"`
}

// MusicTrack represents a unified music track metadata item
type MusicTrack struct {
	ID             string       `json:"id"`
	Source         string       `json:"source"`
	SourceID       string       `json:"source_id"`
	Title          string       `json:"title"`
	Artist         string       `json:"artist"`
	Album          string       `json:"album"`
	Duration       int          `json:"duration"` // in seconds
	Year           int          `json:"year,omitempty"`
	CoverArtURL    string       `json:"cover_art_url,omitempty"`
	Quality        AudioQuality `json:"quality"`
	StreamURL      string       `json:"stream_url,omitempty"`
	DownloadURL    string       `json:"download_url,omitempty"`
	InLocalLibrary bool         `json:"in_local_library"`
	NavidromeID    string       `json:"navidrome_id,omitempty"`
	SearchLatency  int64        `json:"search_latency_ms"`
	FileSizeEst    int64        `json:"file_size_bytes,omitempty"`
}

// StreamInfo provides stream reader and HTTP metadata
type StreamInfo struct {
	Reader        io.ReadCloser
	ContentType   string
	ContentLength int64
	Seekable      bool
	BitrateKbps   int
	Format        string
}

// SourcePlugin is the contract that each audio source (Tidal, Spotify, Debrid, etc.) must implement
type SourcePlugin interface {
	// ID returns unique identifier for the source (e.g. "tidal", "spotify")
	ID() string

	// Name returns human-readable name
	Name() string

	// Description returns short capability summary
	Description() string

	// Configure sets up authentication credentials and operational settings
	Configure(config map[string]string) error

	// Authenticate checks and refreshes credentials
	Authenticate(ctx context.Context) (bool, error)

	// Search queries the external source and returns standardized tracks
	Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error)

	// GetStream returns an audio reader for streaming
	GetStream(ctx context.Context, trackID string) (*StreamInfo, error)

	// GetDownloadStream returns full track stream for local filesystem persistence
	GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error)

	// MaxQuality returns the highest audio fidelity available from this source
	MaxQuality() QualityTier

	// IsHealthy checks if the upstream provider is responding
	IsHealthy(ctx context.Context) (bool, time.Duration)
}
