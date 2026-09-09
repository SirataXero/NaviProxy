package api

import (
	"encoding/json"
	"github.com/navidrome/naviproxy/pkg/logger"
	"fmt"
	"io"
	"net/http"
	"runtime"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/navidrome/naviproxy/pkg/cache"
	"github.com/navidrome/naviproxy/pkg/config"
	"github.com/navidrome/naviproxy/pkg/plugins"
	"github.com/navidrome/naviproxy/pkg/proxy"
	"github.com/navidrome/naviproxy/pkg/quality"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type APIHandler struct {
	proxySvc      *proxy.Service
	configMgr     *config.Manager
	registry      *plugins.Registry
	cacheSvc      *cache.Service
	downloader    *proxy.Downloader
	startTime     time.Time
	searchCounter int64
	streamCounter int64
	wsClients     map[*websocket.Conn]bool
}

func NewAPIHandler(
	p *proxy.Service,
	cfg *config.Manager,
	r *plugins.Registry,
	c *cache.Service,
	d *proxy.Downloader,
) *APIHandler {
	h := &APIHandler{
		proxySvc:   p,
		configMgr:  cfg,
		registry:   r,
		cacheSvc:   c,
		downloader: d,
		startTime:  time.Now(),
		wsClients:  make(map[*websocket.Conn]bool),
	}

	d.SetProgressCallback(func(task *proxy.DownloadTask) {
		h.broadcastWS(map[string]interface{}{
			"type": "download_progress",
			"task": task,
		})
	})

	return h
}

func (h *APIHandler) RegisterRoutes(router *mux.Router) {
	// API routes defined in project specification
	router.HandleFunc("/search", h.HandleSearch).Methods("GET")
	router.HandleFunc("/stream/{source}/{id}", h.HandleStream).Methods("GET")
	router.HandleFunc("/download/{source}/{id}", h.HandleDownload).Methods("GET", "POST")
	router.HandleFunc("/config", h.HandleGetConfig).Methods("GET")
	router.HandleFunc("/config", h.HandleUpdateConfig).Methods("POST")
	router.HandleFunc("/auth/{source}", h.HandleAuthSource).Methods("POST")
	router.HandleFunc("/ws", h.HandleWebSocket)

	// Operational monitoring endpoints
	router.HandleFunc("/health", h.HandleHealth).Methods("GET")
	router.HandleFunc("/metrics", h.HandleMetrics).Methods("GET")
	router.HandleFunc("/tasks", h.HandleListTasks).Methods("GET")
	router.HandleFunc("/downloads", h.HandleListTasks).Methods("GET")
	router.HandleFunc("/api/downloads", h.HandleListTasks).Methods("GET")

	// Subsonic API Compatibility Mode (for Symfonium, DSub, Ultrasonic, Feishin)
	router.HandleFunc("/rest/search3.view", h.HandleSubsonicSearch).Methods("GET")
	router.HandleFunc("/rest/stream.view", h.HandleSubsonicStream).Methods("GET")
	router.HandleFunc("/rest/ping.view", h.HandleSubsonicPing).Methods("GET")

	// Dev mode / UI specific endpoints (Returns mock or disabled in prod)
	router.HandleFunc("/api/docker-compose", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error": "Docker config is managed via Unraid/Host in production."}`, http.StatusNotFound)
	}).Methods("GET", "POST")
	
	router.HandleFunc("/api/go-project", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"error": "Code explorer not available in production."}`, http.StatusNotFound)
	}).Methods("GET")

	// Serve static frontend files
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("/app/public")))
}

// HandleSearch implements GET /search?q={query}&type={song|artist|album}&quality={min_quality}
func (h *APIHandler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Received API search request: %s", r.URL.String())
	atomic.AddInt64(&h.searchCounter, 1)

	q := r.URL.Query().Get("q")
	if q == "" {
		http.Error(w, `{"error": "parameter 'q' is required"}`, http.StatusBadRequest)
		return
	}

	searchType := plugins.SearchItemType(r.URL.Query().Get("type"))
	if searchType == "" {
		searchType = plugins.TypeSong
	}

	minQualityStr := r.URL.Query().Get("quality")
	minQuality := quality.ParseTier(minQualityStr)

	req := plugins.SearchRequest{
		Query:      q,
		Type:       searchType,
		MinQuality: minQuality,
		Limit:      50,
	}

	result, err := h.proxySvc.Search(r.Context(), req)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Proxy-Took-Ms", strconv.FormatInt(result.TookMs, 10))
	json.NewEncoder(w).Encode(result)
}

// HandleStream implements GET /stream/{source}/{id} - Stream from source with chunked transfer
func (h *APIHandler) HandleStream(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Retrieving streaming proxy chunks for: %s", r.URL.Path)
	logger.Debug("Received API stream request: %s", r.URL.String())
	atomic.AddInt64(&h.streamCounter, 1)
	vars := mux.Vars(r)
	source := vars["source"]
	id := vars["id"]

	streamInfo, err := h.proxySvc.GetStream(r.Context(), source, id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "%s"}`, err.Error()), http.StatusNotFound)
		return
	}
	defer streamInfo.Reader.Close()

	if streamInfo.ContentType != "" {
		w.Header().Set("Content-Type", streamInfo.ContentType)
	} else {
		w.Header().Set("Content-Type", "audio/mpeg")
	}

	w.Header().Set("Transfer-Encoding", "chunked")
	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("X-Audio-Source", source)
	w.Header().Set("X-Audio-Format", streamInfo.Format)

	w.WriteHeader(http.StatusOK)
	io.Copy(w, streamInfo.Reader)
}

// HandleDownload implements GET /download/{source}/{id} - Trigger download
func (h *APIHandler) HandleDownload(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	source := vars["source"]
	id := vars["id"]

	track := plugins.MusicTrack{
		ID:       fmt.Sprintf("%s:%s", source, id),
		Source:   source,
		SourceID: id,
		Title:    r.URL.Query().Get("title"),
		Artist:   r.URL.Query().Get("artist"),
	}
	if track.Title == "" {
		track.Title = "Track " + id
	}
	if track.Artist == "" {
		track.Artist = "Various Artists"
	}

	task, err := h.downloader.Queue(track)
	if err != nil {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(task)
}

// HandleGetConfig implements GET /config - Retrieve current configuration
func (h *APIHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Serving config to client")
	cfg := h.configMgr.Get()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cfg)
}

// HandleUpdateConfig implements POST /config - Update configuration
func (h *APIHandler) HandleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	logger.Debug("Updating proxy configuration")
	var newCfg config.AppConfig
	if err := json.NewDecoder(r.Body).Decode(&newCfg); err != nil {
		http.Error(w, `{"error": "invalid json body"}`, http.StatusBadRequest)
		return
	}

	if err := h.configMgr.Update(newCfg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Apply updated credentials to registered plugins
	for sourceID, srcCfg := range newCfg.Sources {
		if plugin, ok := h.registry.Get(sourceID); ok {
			plugin.Configure(srcCfg.Credentials)
			h.registry.SetEnabled(sourceID, srcCfg.Enabled)
			h.registry.SetPriority(sourceID, srcCfg.Priority)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "updated",
		"config": newCfg,
	})
}

// HandleAuthSource implements POST /auth/{source} - Handle authentication
func (h *APIHandler) HandleAuthSource(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	source := vars["source"]

	var body map[string]string
	json.NewDecoder(r.Body).Decode(&body)

	plugin, ok := h.registry.Get(source)
	if !ok {
		http.Error(w, fmt.Sprintf(`{"error": "plugin %s not found"}`, source), http.StatusNotFound)
		return
	}

	if len(body) > 0 {
		plugin.Configure(body)
		h.configMgr.SetSourceCredentials(source, body)
	}

	okAuth, err := plugin.Authenticate(r.Context())
	w.Header().Set("Content-Type", "application/json")
	if !okAuth || err != nil {
		errMsg := "auth failed"
		if err != nil {
			errMsg = err.Error()
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"source":        source,
			"authenticated": false,
			"error":         errMsg,
		})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"source":        source,
		"authenticated": true,
		"message":       "Source successfully authenticated",
	})
}

// HandleHealth returns service health and dependencies status
func (h *APIHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"service":   "naviproxy",
		"version":   "1.0.0",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

// HandleMetrics provides performance counters (<100ms response targets, cache hit ratio)
func (h *APIHandler) HandleMetrics(w http.ResponseWriter, r *http.Request) {
	hits, misses, size, ratio := h.cacheSvc.Stats()
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"uptime_seconds":    int64(time.Since(h.startTime).Seconds()),
		"total_searches":    atomic.LoadInt64(&h.searchCounter),
		"total_streams":     atomic.LoadInt64(&h.streamCounter),
		"cache_hits":        hits,
		"cache_misses":      misses,
		"cache_size":        size,
		"cache_hit_ratio":   ratio,
		"memory_alloc_mb":   m.Alloc / 1024 / 1024,
		"goroutines_active": runtime.NumGoroutine(),
		"plugins":           h.registry.ListStatuses(),
	})
}

func (h *APIHandler) HandleListTasks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.downloader.ListTasks())
}

// HandleWebSocket handles real-time updates for active streams and download progress
func (h *APIHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	h.wsClients[conn] = true
	defer delete(h.wsClients, conn)

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *APIHandler) broadcastWS(payload interface{}) {
	for conn := range h.wsClients {
		conn.WriteJSON(payload)
	}
}

// Subsonic API Compatibility
func (h *APIHandler) HandleSubsonicPing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"subsonic-response":{"status":"ok","version":"1.16.1"}}`))
}

func (h *APIHandler) HandleSubsonicSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("query")
	req := plugins.SearchRequest{
		Query:      q,
		Type:       plugins.TypeSong,
		MinQuality: plugins.QualityHighMP3320,
	}
	res, err := h.proxySvc.Search(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"subsonic-response": map[string]interface{}{
			"status":  "ok",
			"version": "1.16.1",
			"searchResult3": map[string]interface{}{
				"song": res.Results,
			},
		},
	})
}

func (h *APIHandler) HandleSubsonicStream(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	vars := mux.Vars(r)
	vars["source"] = "navidrome"
	vars["id"] = id
	h.HandleStream(w, r)
}
