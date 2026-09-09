package main

import (
	"context"
	"github.com/navidrome/naviproxy/pkg/logger"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/navidrome/naviproxy/pkg/api"
	"github.com/navidrome/naviproxy/pkg/cache"
	"github.com/navidrome/naviproxy/pkg/config"
	"github.com/navidrome/naviproxy/pkg/plugins"
	"github.com/navidrome/naviproxy/pkg/proxy"
	"github.com/rs/cors"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	configPath := os.Getenv("CONFIG_PATH")
	if configPath == "" {
		configPath = "./data/config"
	}

	redisAddr := os.Getenv("REDIS_ADDR")

	logger.Init()
	logger.Info("Initializing Navidrome Music Proxy Service...")

	// 1. Initialize Configuration Manager
	cfgMgr, err := config.NewManager(configPath)
	if err != nil {
		logger.Fatal("Failed to initialize config manager: %v", err)
	}

	// 2. Initialize Cache Service (Hybrid LRU in-memory + Redis)
	cacheSvc := cache.NewService(redisAddr, 30*time.Minute)

	// 3. Initialize Source Plugins Registry
	registry := plugins.NewRegistry()

	// Register all source plugins
	registry.Register(plugins.NewNavidromePlugin(), 1, true)
	registry.Register(plugins.NewTidalPlugin(), 2, true)
	registry.Register(plugins.NewSpotifyPlugin(), 3, true)
	registry.Register(plugins.NewAppleMusicPlugin(), 4, true)
	registry.Register(plugins.NewDeezerPlugin(), 5, true)
	registry.Register(plugins.NewYTMusicPlugin(), 6, true)
	registry.Register(plugins.NewDebridPlugin(), 7, true)
	registry.Register(plugins.NewUsenetPlugin(), 8, true)

	logger.Info("8 source plugins loaded (Navidrome, Tidal, Spotify, Apple Music, Deezer, YouTube Music, Debrid, Usenet)")

	// 4. Initialize Async Downloader
	downloader := proxy.NewDownloader(registry, cfgMgr, 4)

	// 5. Initialize Core Proxy Service
	proxySvc := proxy.NewService(registry, cacheSvc, cfgMgr, downloader)

	// 6. Initialize Router and API Handlers
	router := mux.NewRouter()
	apiHandler := api.NewAPIHandler(proxySvc, cfgMgr, registry, cacheSvc, downloader)
	apiHandler.RegisterRoutes(router)

	// Enable CORS for web-based frontends
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	handler := c.Handler(router)

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown handling
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		logger.Info("[NaviProxy] HTTP Web Service listening on :%s\n", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed: %v", err)
		}
	}()

	<-stop
	logger.Info("Shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Info("Forced shutdown error: %v", err)
	}

	logger.Info("Server exited cleanly.")
}
