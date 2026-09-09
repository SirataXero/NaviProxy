package plugins

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type NavidromePlugin struct {
	serverURL string
	username  string
	token     string
	salt      string
	client    *http.Client
}

func NewNavidromePlugin() *NavidromePlugin {
	return &NavidromePlugin{
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

func (n *NavidromePlugin) ID() string          { return "navidrome" }
func (n *NavidromePlugin) Name() string        { return "Navidrome Local Server" }
func (n *NavidromePlugin) Description() string { return "Direct integration with local Navidrome Subsonic API" }
func (n *NavidromePlugin) MaxQuality() QualityTier { return QualityHiResLossless192 }

func (n *NavidromePlugin) Configure(cfg map[string]string) error {
	n.serverURL = strings.TrimRight(cfg["server_url"], "/")
	n.username = cfg["username"]
	password := cfg["password"]
	if password != "" {
		n.salt = fmt.Sprintf("%x", rand.Int63())
		hash := md5.Sum([]byte(password + n.salt))
		n.token = hex.EncodeToString(hash[:])
	} else if cfg["token"] != "" {
		n.token = cfg["token"]
		n.salt = cfg["salt"]
	}
	return nil
}

func (n *NavidromePlugin) Authenticate(ctx context.Context) (bool, error) {
	if n.serverURL == "" || n.username == "" {
		return false, fmt.Errorf("navidrome server URL and username required")
	}
	pingURL := fmt.Sprintf("%s/rest/ping.view?u=%s&t=%s&s=%s&v=1.16.1&c=NaviProxy&f=json",
		n.serverURL, url.QueryEscape(n.username), n.token, n.salt)

	req, err := http.NewRequestWithContext(ctx, "GET", pingURL, nil)
	if err != nil {
		return false, err
	}
	resp, err := n.client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK, nil
}

func (n *NavidromePlugin) Search(ctx context.Context, req SearchRequest) ([]MusicTrack, error) {
	if n.serverURL == "" {
		return nil, nil
	}
	searchURL := fmt.Sprintf("%s/rest/search3.view?u=%s&t=%s&s=%s&v=1.16.1&c=NaviProxy&f=json&query=%s",
		n.serverURL, url.QueryEscape(n.username), n.token, n.salt, url.QueryEscape(req.Query))

	httpReq, err := http.NewRequestWithContext(ctx, "GET", searchURL, nil)
	if err != nil {
		return nil, err
	}

	start := time.Now()
	resp, err := n.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var subsonicResp struct {
		SubsonicResponse struct {
			Status  string `json:"status"`
			Search3 struct {
				Song []struct {
					ID          string `json:"id"`
					Title       string `json:"title"`
					Artist      string `json:"artist"`
					Album       string `json:"album"`
					Duration    int    `json:"duration"`
					BitRate     int    `json:"bitRate"`
					ContentType string `json:"contentType"`
					Suffix      string `json:"suffix"`
					Year        int    `json:"year"`
					CoverArt    string `json:"coverArt"`
					Size        int64  `json:"size"`
				} `json:"song"`
			} `json:"searchResult3"`
		} `json:"subsonic-response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&subsonicResp); err != nil {
		return nil, err
	}

	tracks := make([]MusicTrack, 0)
	for _, s := range subsonicResp.SubsonicResponse.Search3.Song {
		tier := QualityHighMP3320
		isLossless := false
		suffix := strings.ToLower(s.Suffix)
		if suffix == "flac" || suffix == "alac" || suffix == "wav" {
			tier = QualityCDLossless
			isLossless = true
			if s.BitRate > 2000 {
				tier = QualityHiResLossless96
			}
		}

		coverURL := ""
		if s.CoverArt != "" {
			coverURL = fmt.Sprintf("%s/rest/getCoverArt.view?u=%s&t=%s&s=%s&v=1.16.1&c=NaviProxy&id=%s",
				n.serverURL, n.username, n.token, n.salt, s.CoverArt)
		}

		tracks = append(tracks, MusicTrack{
			ID:          "navidrome:" + s.ID,
			Source:      "navidrome",
			SourceID:    s.ID,
			Title:       s.Title,
			Artist:      s.Artist,
			Album:       s.Album,
			Duration:    s.Duration,
			Year:        s.Year,
			CoverArtURL: coverURL,
			Quality: AudioQuality{
				Tier:         tier,
				Label:        strings.ToUpper(s.Suffix) + fmt.Sprintf(" %dkbps", s.BitRate),
				Format:       s.Suffix,
				BitrateKbps:  s.BitRate,
				SampleRateHz: 44100,
				IsLossless:   isLossless,
			},
			StreamURL:      fmt.Sprintf("/stream/navidrome/%s", s.ID),
			InLocalLibrary: true,
			NavidromeID:    s.ID,
			SearchLatency:  time.Since(start).Milliseconds(),
			FileSizeEst:    s.Size,
		})
	}

	return tracks, nil
}

func (n *NavidromePlugin) GetStream(ctx context.Context, trackID string) (*StreamInfo, error) {
	streamURL := fmt.Sprintf("%s/rest/stream.view?u=%s&t=%s&s=%s&v=1.16.1&c=NaviProxy&id=%s",
		n.serverURL, url.QueryEscape(n.username), n.token, n.salt, trackID)

	req, err := http.NewRequestWithContext(ctx, "GET", streamURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := n.client.Do(req)
	if err != nil {
		return nil, err
	}

	return &StreamInfo{
		Reader:        resp.Body,
		ContentType:   resp.Header.Get("Content-Type"),
		ContentLength: resp.ContentLength,
		Seekable:      true,
		Format:        "flac",
	}, nil
}

func (n *NavidromePlugin) GetDownloadStream(ctx context.Context, trackID string) (io.ReadCloser, int64, error) {
	streamInfo, err := n.GetStream(ctx, trackID)
	if err != nil {
		return nil, 0, err
	}
	return streamInfo.Reader, streamInfo.ContentLength, nil
}

func (n *NavidromePlugin) IsHealthy(ctx context.Context) (bool, time.Duration) {
	start := time.Now()
	ok, err := n.Authenticate(ctx)
	return ok && err == nil, time.Since(start)
}
