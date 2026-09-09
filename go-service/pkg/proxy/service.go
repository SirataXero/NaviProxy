package proxy

import (
	"context"
	"github.com/navidrome/naviproxy/pkg/logger"
	"fmt"
	"time"

	"github.com/navidrome/naviproxy/pkg/cache"
	"github.com/navidrome/naviproxy/pkg/config"
	"github.com/navidrome/naviproxy/pkg/plugins"
	"github.com/navidrome/naviproxy/pkg/quality"
)

type SearchResultStats struct {
	Source   string `json:"source"`
	Count    int    `json:"count"`
	TookMs   int64  `json:"took_ms"`
	Status   string `json:"status"`
}

type UnifiedSearchResponse struct {
	Query            string              `json:"query"`
	Type             string              `json:"type"`
	MinQuality       string              `json:"min_quality"`
	TotalFound       int                 `json:"total_found"`
	FilteredOutCount int                 `json:"filtered_out_count"`
	TookMs           int64               `json:"took_ms"`
	Cached           bool                `json:"cached"`
	Results          []plugins.MusicTrack `json:"results"`
	SourcesQueried   []SearchResultStats `json:"sources_queried"`
}

type Service struct {
	registry   *plugins.Registry
	cache      *cache.Service
	configMgr  *config.Manager
	downloader *Downloader
}

func NewService(r *plugins.Registry, c *cache.Service, cfg *config.Manager, d *Downloader) *Service {
	return &Service{
		registry:   r,
		cache:      c,
		configMgr:  cfg,
		downloader: d,
	}
}

// Search performs intelligent proxy music search:
// 1. Checks Navidrome server first
// 2. If content found in local library, marks as local and includes immediately
// 3. Simultaneously fans out to configured external sources (Tidal, Spotify, Apple, Deezer, etc.)
// 4. Applies quality-based filtering (drops tracks below min_quality threshold)
// 5. Caches the unified result for sub-100ms subsequent queries
func (s *Service) Search(ctx context.Context, req plugins.SearchRequest) (*UnifiedSearchResponse, error) {
	logger.Debug("Initiating unified search for query: '%s' (type: %s, minQuality: %s)", req.Query, req.Type, req.MinQuality)
	start := time.Now()
	cfg := s.configMgr.Get()

	// Apply configured minimum quality if not overridden in request
	if req.MinQuality <= 0 {
		req.MinQuality = cfg.MinQuality
	}

	cacheKey := fmt.Sprintf("search:%s:%s:%d", req.Query, req.Type, req.MinQuality)
	logger.Debug("Checking cache for key: %s", cacheKey)
	var cachedResp UnifiedSearchResponse
	if s.cache.Get(ctx, cacheKey, &cachedResp) {
		cachedResp.Cached = true
		cachedResp.TookMs = time.Since(start).Milliseconds()
		return &cachedResp, nil
	}

	var allTracks []plugins.MusicTrack
	var sourcesQueried []SearchResultStats

	// STEP 1: Proxy Check - Query local Navidrome library first
	if naviPlugin, ok := s.registry.Get("navidrome"); ok {
		naviStart := time.Now()
		naviTracks, err := naviPlugin.Search(ctx, req)
		naviTook := time.Since(naviStart).Milliseconds()

		status := "ok"
		if err != nil {
			status = "error: " + err.Error()
		}
		sourcesQueried = append(sourcesQueried, SearchResultStats{
			Source: "navidrome",
			Count:  len(naviTracks),
			TookMs: naviTook,
			Status: status,
		})

		for i := range naviTracks {
			naviTracks[i].InLocalLibrary = true
		}
		allTracks = append(allTracks, naviTracks...)
	}

	// STEP 2: Query configured external sources simultaneously
	searchCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	externalResults := s.registry.SearchConcurrent(searchCtx, req)
	for sourceID, tracks := range externalResults {
		sourcesQueried = append(sourcesQueried, SearchResultStats{
			Source: sourceID,
			Count:  len(tracks),
			TookMs: time.Since(start).Milliseconds(),
			Status: "ok",
		})
		allTracks = append(allTracks, tracks...)
	}

	// STEP 3: Quality-Based Filtering
	qFilter := quality.NewQualityFilter(req.MinQuality)
	qualifiedTracks, filteredOutCount := qFilter.FilterTracks(allTracks)

	// STEP 4: Unified Sorting (Navidrome local library first, then highest audio fidelity)
	quality.SortByQualityDescending(qualifiedTracks)

	resp := &UnifiedSearchResponse{
		Query:            req.Query,
		Type:             string(req.Type),
		MinQuality:       req.MinQuality.String(),
		TotalFound:       len(qualifiedTracks),
		FilteredOutCount: filteredOutCount,
		TookMs:           time.Since(start).Milliseconds(),
		Cached:           false,
		Results:          qualifiedTracks,
		SourcesQueried:   sourcesQueried,
	}

	// Cache result for 15 minutes
	s.cache.Set(ctx, cacheKey, resp, 15*time.Minute)

	return resp, nil
}

// GetStream retrieves stream from specified source plugin
func (s *Service) GetStream(ctx context.Context, sourceID string, trackID string) (*plugins.StreamInfo, error) {
	logger.Debug("Initiating stream request for source: %s, track: %s", sourceID, trackID)
	plugin, ok := s.registry.Get(sourceID)
	if !ok {
		return nil, fmt.Errorf("source plugin %s is not active or not found", sourceID)
	}

	// Trigger async background download if configured
	cfg := s.configMgr.Get()
	if cfg.AutoTriggerDownload && sourceID != "navidrome" {
		go func() {
			track := plugins.MusicTrack{
				ID:       fmt.Sprintf("%s:%s", sourceID, trackID),
				Source:   sourceID,
				SourceID: trackID,
			}
			s.downloader.Queue(track)
		}()
	}

	return plugin.GetStream(ctx, trackID)
}
