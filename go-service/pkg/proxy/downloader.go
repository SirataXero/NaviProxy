package proxy

import (
	"context"
	"github.com/navidrome/naviproxy/pkg/logger"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/navidrome/naviproxy/pkg/config"
	"github.com/navidrome/naviproxy/pkg/plugins"
)

type DownloadTask struct {
	ID             string             `json:"id"`
	Track          plugins.MusicTrack `json:"track"`
	Status         string             `json:"status"` // queued, downloading, completed, failed
	Progress       float64            `json:"progress"`
	BytesTotal     int64              `json:"bytes_total"`
	BytesRead      int64              `json:"bytes_read"`
	SpeedBps       int64              `json:"speed_bps"`
	TargetFilePath string             `json:"target_file_path"`
	Error          string             `json:"error,omitempty"`
	StartedAt      time.Time          `json:"started_at"`
	CompletedAt    *time.Time         `json:"completed_at,omitempty"`
}

type Downloader struct {
	mu         sync.RWMutex
	tasks      map[string]*DownloadTask
	queue      chan *DownloadTask
	registry   *plugins.Registry
	configMgr  *config.Manager
	onProgress func(task *DownloadTask)
}

func NewDownloader(r *plugins.Registry, cfg *config.Manager, workers int) *Downloader {
	d := &Downloader{
		tasks:     make(map[string]*DownloadTask),
		queue:     make(chan *DownloadTask, 100),
		registry:  r,
		configMgr: cfg,
	}

	for i := 0; i < workers; i++ {
		go d.workerLoop()
	}

	return d
}

func (d *Downloader) SetProgressCallback(cb func(task *DownloadTask)) {
	d.mu.Lock()
	d.onProgress = cb
	d.mu.Unlock()
}

func (d *Downloader) Queue(track plugins.MusicTrack) (*DownloadTask, error) {
	logger.Debug("Queueing download for track: %s - %s", track.Artist, track.Title)
	d.mu.Lock()
	defer d.mu.Unlock()

	taskID := fmt.Sprintf("dl_%s_%s_%d", track.Source, track.SourceID, time.Now().Unix())
	cfg := d.configMgr.Get()

	folder := cfg.DownloadFolder
	if folder == "" {
		folder = "/music/downloads"
	}

	ext := "flac"
	if track.Quality.Format != "" {
		ext = track.Quality.Format
	}
	filename := fmt.Sprintf("%s - %s.%s", sanitizeFilename(track.Artist), sanitizeFilename(track.Title), ext)
	targetPath := filepath.Join(folder, filename)

	task := &DownloadTask{
		ID:             taskID,
		Track:          track,
		Status:         "queued",
		TargetFilePath: targetPath,
		StartedAt:      time.Now(),
	}

	d.tasks[taskID] = task

	select {
	case d.queue <- task:
		return task, nil
	default:
		task.Status = "failed"
		task.Error = "download queue full"
		return task, fmt.Errorf("download queue is full")
	}
}

func (d *Downloader) workerLoop() {
	for task := range d.queue {
		d.executeDownload(task)
	}
}

func (d *Downloader) executeDownload(task *DownloadTask) {
	logger.Debug("Executing download task: %s", task.ID)
	d.mu.Lock()
	task.Status = "downloading"
	d.mu.Unlock()

	plugin, ok := d.registry.Get(task.Track.Source)
	if !ok {
		d.mu.Lock()
		task.Status = "failed"
		task.Error = "source plugin unavailable"
		d.mu.Unlock()
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	reader, totalBytes, err := plugin.GetDownloadStream(ctx, task.Track.SourceID)
	if err != nil {
		d.mu.Lock()
		task.Status = "failed"
		task.Error = err.Error()
		d.mu.Unlock()
		return
	}
	defer reader.Close()

	os.MkdirAll(filepath.Dir(task.TargetFilePath), 0755)
	outFile, err := os.Create(task.TargetFilePath + ".part")
	if err != nil {
		d.mu.Lock()
		task.Status = "failed"
		task.Error = err.Error()
		d.mu.Unlock()
		return
	}
	defer outFile.Close()

	task.BytesTotal = totalBytes
	buf := make([]byte, 64*1024)
	var bytesDownloaded int64
	startTime := time.Now()

	for {
		n, rErr := reader.Read(buf)
		if n > 0 {
			outFile.Write(buf[:n])
			bytesDownloaded += int64(n)
			d.mu.Lock()
			task.BytesRead = bytesDownloaded
			if totalBytes > 0 {
				task.Progress = float64(bytesDownloaded) / float64(totalBytes) * 100.0
			}
			elapsed := time.Since(startTime).Seconds()
			if elapsed > 0 {
				task.SpeedBps = int64(float64(bytesDownloaded) / elapsed)
			}
			cb := d.onProgress
			d.mu.Unlock()

			if cb != nil {
				cb(task)
			}
		}
		if rErr != nil {
			if rErr == io.EOF {
				break
			}
			d.mu.Lock()
			task.Status = "failed"
			task.Error = rErr.Error()
			d.mu.Unlock()
			return
		}
	}

	outFile.Close()
	os.Rename(task.TargetFilePath+".part", task.TargetFilePath)

	now := time.Now()
	d.mu.Lock()
	logger.Debug("Download task %s completed successfully", task.ID)
	task.Status = "completed"
	task.Progress = 100.0
	task.CompletedAt = &now
	d.mu.Unlock()
}

func (d *Downloader) ListTasks() []*DownloadTask {
	d.mu.RLock()
	defer d.mu.RUnlock()

	tasks := make([]*DownloadTask, 0, len(d.tasks))
	for _, t := range d.tasks {
		tasks = append(tasks, t)
	}
	return tasks
}

func sanitizeFilename(s string) string {
	if s == "" {
		return "Unknown"
	}
	for _, c := range []string{"/", "\\", ":", "*", "?", "\"", "<", ">", "|"} {
		s = strings.ReplaceAll(s, c, "_")
	}
	s = filepath.Clean(s)
	return s
}
