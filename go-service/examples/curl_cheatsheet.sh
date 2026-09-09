#!/usr/bin/env bash
# NaviProxy API cURL Cheatsheet

PROXY_HOST="http://localhost:8080"

echo "=== 1. Healthcheck ==="
curl -s "${PROXY_HOST}/health" | jq .

echo -e "\n=== 2. Search (Music Proxy with Quality Threshold) ==="
curl -s "${PROXY_HOST}/search?q=Radiohead+Karma+Police&type=song&quality=CD_FLAC_16_44" | jq .

echo -e "\n=== 3. Get Configuration ==="
curl -s "${PROXY_HOST}/config" | jq .

echo -e "\n=== 4. Test Source Authentication (Tidal) ==="
curl -s -X POST "${PROXY_HOST}/auth/tidal" \
  -H "Content-Type: application/json" \
  -d '{"access_token":"sample_tidal_oauth_bearer_token"}' | jq .

echo -e "\n=== 5. Trigger Background Download ==="
curl -s -X POST "${PROXY_HOST}/download/tidal/sample-track-1?title=Karma+Police&artist=Radiohead" | jq .

echo -e "\n=== 6. Check Performance Metrics ==="
curl -s "${PROXY_HOST}/metrics" | jq .

echo -e "\n=== 7. Audio Stream (Streaming Chunked Transfer) ==="
curl -I "${PROXY_HOST}/stream/tidal/sample-track-1"
