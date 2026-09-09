package quality

import (
	"strings"

	"github.com/navidrome/naviproxy/pkg/plugins"
)

// QualityFilter evaluates and filters tracks against audio fidelity criteria
type QualityFilter struct {
	MinTier plugins.QualityTier
}

func NewQualityFilter(minTier plugins.QualityTier) *QualityFilter {
	return &QualityFilter{
		MinTier: minTier,
	}
}

// ParseTier converts string or query parameter to QualityTier enum
func ParseTier(s string) plugins.QualityTier {
	s = strings.ToUpper(strings.TrimSpace(s))
	switch {
	case strings.Contains(s, "192") || strings.Contains(s, "MASTER"):
		return plugins.QualityHiResLossless192
	case strings.Contains(s, "96") || strings.Contains(s, "HIRES") || strings.Contains(s, "HI-RES") || strings.Contains(s, "24BIT"):
		return plugins.QualityHiResLossless96
	case strings.Contains(s, "FLAC") || strings.Contains(s, "ALAC") || strings.Contains(s, "LOSSLESS") || strings.Contains(s, "CD"):
		return plugins.QualityCDLossless
	case strings.Contains(s, "320") || strings.Contains(s, "HIGH"):
		return plugins.QualityHighMP3320
	case strings.Contains(s, "256") || strings.Contains(s, "MID") || strings.Contains(s, "AAC"):
		return plugins.QualityMidMP3256
	case strings.Contains(s, "128") || strings.Contains(s, "LOW"):
		return plugins.QualityLowMP3128
	default:
		return plugins.QualityHighMP3320
	}
}

// MeetsRequirement checks whether a track's audio quality satisfies the target threshold
func (qf *QualityFilter) MeetsRequirement(track plugins.MusicTrack) bool {
	// If no minimum tier specified, all tracks pass
	if qf.MinTier <= 0 {
		return true
	}
	return track.Quality.Tier >= qf.MinTier
}

// FilterTracks processes a slice of tracks, returning only those meeting or exceeding MinTier
func (qf *QualityFilter) FilterTracks(tracks []plugins.MusicTrack) (accepted []plugins.MusicTrack, filteredOutCount int) {
	accepted = make([]plugins.MusicTrack, 0, len(tracks))
	for _, t := range tracks {
		if qf.MeetsRequirement(t) {
			accepted = append(accepted, t)
		} else {
			filteredOutCount++
		}
	}
	return accepted, filteredOutCount
}

// SortByQualityDescending orders tracks by audio fidelity then source priority
func SortByQualityDescending(tracks []plugins.MusicTrack) {
	for i := 0; i < len(tracks)-1; i++ {
		for j := i + 1; j < len(tracks); j++ {
			// Navidrome local library always gets highest ranking preference
			if tracks[j].InLocalLibrary && !tracks[i].InLocalLibrary {
				tracks[i], tracks[j] = tracks[j], tracks[i]
				continue
			}
			if !tracks[j].InLocalLibrary && tracks[i].InLocalLibrary {
				continue
			}
			// Compare quality tier
			if tracks[j].Quality.Tier > tracks[i].Quality.Tier {
				tracks[i], tracks[j] = tracks[j], tracks[i]
			} else if tracks[j].Quality.Tier == tracks[i].Quality.Tier && tracks[j].Quality.BitrateKbps > tracks[i].Quality.BitrateKbps {
				tracks[i], tracks[j] = tracks[j], tracks[i]
			}
		}
	}
}
