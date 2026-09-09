package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/navidrome/naviproxy/pkg/plugins"
)

type SourceConfig struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Enabled     bool              `json:"enabled"`
	Priority    int               `json:"priority"`
	Credentials map[string]string `json:"credentials"`
}

type AppConfig struct {
	NavidromeServerURL  string                  `json:"navidrome_server_url"`
	NavidromeUsername   string                  `json:"navidrome_username"`
	NavidromeToken      string                  `json:"navidrome_token"`
	NavidromeSalt       string                  `json:"navidrome_salt"`
	DownloadFolder      string                  `json:"download_folder"`
	MinQuality          plugins.QualityTier     `json:"min_quality"`
	AutoTriggerDownload bool                    `json:"auto_trigger_download"`
	ConcurrentLimit     int                     `json:"concurrent_limit"`
	Sources             map[string]SourceConfig `json:"sources"`
	RedisAddr           string                  `json:"redis_addr"`
}

type Manager struct {
	mu       sync.RWMutex
	filePath string
	current  AppConfig
}

func NewManager(dbPath string) (*Manager, error) {
	os.MkdirAll(filepath.Dir(dbPath), 0755)

	defaultCfg := AppConfig{
		NavidromeServerURL: "http://localhost:4533",
		NavidromeUsername:  "admin",
		DownloadFolder:     "/music/downloads",
		MinQuality:         plugins.QualityHighMP3320,
		ConcurrentLimit:    4,
		Sources: map[string]SourceConfig{
			"navidrome":  {ID: "navidrome", Name: "Navidrome Local", Enabled: true, Priority: 1, Credentials: map[string]string{}},
			"tidal":      {ID: "tidal", Name: "Tidal HiFi/Master", Enabled: true, Priority: 2, Credentials: map[string]string{}},
			"spotify":    {ID: "spotify", Name: "Spotify Premium", Enabled: true, Priority: 3, Credentials: map[string]string{}},
			"applemusic": {ID: "applemusic", Name: "Apple Music", Enabled: true, Priority: 4, Credentials: map[string]string{}},
			"deezer":     {ID: "deezer", Name: "Deezer HiFi", Enabled: true, Priority: 5, Credentials: map[string]string{}},
			"ytmusic":    {ID: "ytmusic", Name: "YouTube Music", Enabled: true, Priority: 6, Credentials: map[string]string{}},
			"debrid":     {ID: "debrid", Name: "Real-Debrid / Torbox", Enabled: true, Priority: 7, Credentials: map[string]string{}},
			"usenet":     {ID: "usenet", Name: "Usenet Indexers", Enabled: true, Priority: 8, Credentials: map[string]string{}},
		},
	}

	mgr := &Manager{
		filePath: dbPath,
		current:  defaultCfg,
	}

	// Try reading existing config if exists
	if data, err := os.ReadFile(dbPath + ".json"); err == nil {
		json.Unmarshal(data, &mgr.current)
	}

	return mgr, nil
}

func (m *Manager) Get() AppConfig {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

func (m *Manager) Update(newCfg AppConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.current = newCfg
	data, err := json.MarshalIndent(newCfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.filePath+".json", data, 0644)
}

func (m *Manager) SetSourceCredentials(sourceID string, creds map[string]string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	src, exists := m.current.Sources[sourceID]
	if !exists {
		return fmt.Errorf("source %s not registered", sourceID)
	}
	src.Credentials = creds
	m.current.Sources[sourceID] = src

	data, err := json.MarshalIndent(m.current, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(m.filePath+".json", data, 0644)
}
