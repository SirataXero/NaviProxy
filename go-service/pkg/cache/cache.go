package cache

import (
	"context"
	"encoding/json"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheItem struct {
	Value      []byte
	Expiration time.Time
}

// Service provides hybrid in-memory and Redis caching for ultra-fast response (<100ms)
type Service struct {
	mu          sync.RWMutex
	memoryItems map[string]CacheItem
	redisClient *redis.Client
	defaultTTL  time.Duration
	hits        int64
	misses      int64
}

func NewService(redisAddr string, defaultTTL time.Duration) *Service {
	s := &Service{
		memoryItems: make(map[string]CacheItem),
		defaultTTL:  defaultTTL,
	}

	if redisAddr != "" {
		s.redisClient = redis.NewClient(&redis.Options{
			Addr:        redisAddr,
			DialTimeout: 2 * time.Second,
		})
	}

	// Periodic cache cleanup
	go s.evictionLoop()

	return s
}

func (s *Service) evictionLoop() {
	ticker := time.NewTicker(2 * time.Minute)
	for range ticker.C {
		now := time.Now()
		s.mu.Lock()
		for k, item := range s.memoryItems {
			if !item.Expiration.IsZero() && now.After(item.Expiration) {
				delete(s.memoryItems, k)
			}
		}
		s.mu.Unlock()
	}
}

func (s *Service) Get(ctx context.Context, key string, dest interface{}) bool {
	// Check memory cache first (sub-microsecond)
	s.mu.RLock()
	item, ok := s.memoryItems[key]
	s.mu.RUnlock()

	if ok {
		if item.Expiration.IsZero() || time.Now().Before(item.Expiration) {
			atomic.AddInt64(&s.hits, 1)
			if err := json.Unmarshal(item.Value, dest); err == nil {
				return true
			}
		} else {
			s.mu.Lock()
			delete(s.memoryItems, key)
			s.mu.Unlock()
		}
	}

	// Fallback to Redis if configured
	if s.redisClient != nil {
		val, err := s.redisClient.Get(ctx, key).Bytes()
		if err == nil {
			atomic.AddInt64(&s.hits, 1)
			if err := json.Unmarshal(val, dest); err == nil {
				// Populate back to memory
				s.mu.Lock()
				s.memoryItems[key] = CacheItem{
					Value:      val,
					Expiration: time.Now().Add(s.defaultTTL),
				}
				s.mu.Unlock()
				return true
			}
		}
	}

	atomic.AddInt64(&s.misses, 1)
	return false
}

func (s *Service) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	bytes, err := json.Marshal(value)
	if err != nil {
		return err
	}

	if ttl <= 0 {
		ttl = s.defaultTTL
	}

	s.mu.Lock()
	s.memoryItems[key] = CacheItem{
		Value:      bytes,
		Expiration: time.Now().Add(ttl),
	}
	s.mu.Unlock()

	if s.redisClient != nil {
		return s.redisClient.Set(ctx, key, bytes, ttl).Err()
	}

	return nil
}

func (s *Service) Flush() {
	s.mu.Lock()
	s.memoryItems = make(map[string]CacheItem)
	s.mu.Unlock()

	if s.redisClient != nil {
		s.redisClient.FlushDB(context.Background())
	}
}

func (s *Service) Stats() (hits int64, misses int64, size int, hitRatio float64) {
	h := atomic.LoadInt64(&s.hits)
	m := atomic.LoadInt64(&s.misses)
	s.mu.RLock()
	sz := len(s.memoryItems)
	s.mu.RUnlock()

	total := h + m
	ratio := 0.0
	if total > 0 {
		ratio = float64(h) / float64(total) * 100.0
	}
	return h, m, sz, ratio
}
