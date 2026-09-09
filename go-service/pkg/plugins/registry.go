package plugins

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// PluginStatus tracks current state and metrics of an enabled plugin
type PluginStatus struct {
	Plugin       SourcePlugin  `json:"-"`
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Enabled      bool          `json:"enabled"`
	Priority     int           `json:"priority"` // lower number = higher priority
	AvgLatencyMs int64         `json:"avg_latency_ms"`
	LastError    string        `json:"last_error,omitempty"`
	LastChecked  time.Time     `json:"last_checked"`
	SuccessCount int64         `json:"success_count"`
	FailureCount int64         `json:"failure_count"`
}

// Registry manages source plugins with thread safety
type Registry struct {
	mu      sync.RWMutex
	plugins map[string]*PluginStatus
}

func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[string]*PluginStatus),
	}
}

// Register adds or updates a plugin in the registry
func (r *Registry) Register(plugin SourcePlugin, priority int, enabled bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.plugins[plugin.ID()] = &PluginStatus{
		Plugin:      plugin,
		ID:          plugin.ID(),
		Name:        plugin.Name(),
		Enabled:     enabled,
		Priority:    priority,
		LastChecked: time.Now(),
	}
}

// Get returns a plugin by ID
func (r *Registry) Get(id string) (SourcePlugin, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	ps, exists := r.plugins[id]
	if !exists || !ps.Enabled {
		return nil, false
	}
	return ps.Plugin, true
}

// SetEnabled enables or disables a plugin
func (r *Registry) SetEnabled(id string, enabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	ps, exists := r.plugins[id]
	if !exists {
		return fmt.Errorf("plugin %s not found", id)
	}
	ps.Enabled = enabled
	return nil
}

// SetPriority updates a plugin's execution priority
func (r *Registry) SetPriority(id string, priority int) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	ps, exists := r.plugins[id]
	if !exists {
		return fmt.Errorf("plugin %s not found", id)
	}
	ps.Priority = priority
	return nil
}

// ListStatuses returns all registered plugin statuses ordered by priority
func (r *Registry) ListStatuses() []*PluginStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*PluginStatus, 0, len(r.plugins))
	for _, ps := range r.plugins {
		copy := *ps
		result = append(result, &copy)
	}
	return result
}

// SearchConcurrent runs concurrent searches against all enabled plugins within a timeout deadline
func (r *Registry) SearchConcurrent(ctx context.Context, req SearchRequest) map[string][]MusicTrack {
	r.mu.RLock()
	activePlugins := make([]SourcePlugin, 0)
	for _, ps := range r.plugins {
		if ps.Enabled && ps.ID != "navidrome" { // navidrome is handled first by proxy
			activePlugins = append(activePlugins, ps.Plugin)
		}
	}
	r.mu.RUnlock()

	resultsMap := make(map[string][]MusicTrack)
	var mapMu sync.Mutex
	var wg sync.WaitGroup

	for _, p := range activePlugins {
		wg.Add(1)
		go func(plugin SourcePlugin) {
			defer wg.Done()

			start := time.Now()
			tracks, err := plugin.Search(ctx, req)
			duration := time.Since(start)

			r.mu.Lock()
			if ps, ok := r.plugins[plugin.ID()]; ok {
				ps.LastChecked = time.Now()
				ps.AvgLatencyMs = (ps.AvgLatencyMs*4 + duration.Milliseconds()) / 5
				if err != nil {
					ps.FailureCount++
					ps.LastError = err.Error()
				} else {
					ps.SuccessCount++
					ps.LastError = ""
				}
			}
			r.mu.Unlock()

			if err == nil && len(tracks) > 0 {
				mapMu.Lock()
				resultsMap[plugin.ID()] = tracks
				mapMu.Unlock()
			}
		}(p)
	}

	wg.Wait()
	return resultsMap
}
