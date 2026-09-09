#!/usr/bin/env python3
"""
Example Third-Party Application Integration with NaviProxy
Demonstrates searching, filtering by minimum quality, streaming audio, and downloading.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8080"

def search_music(query: str, min_quality: str = "CD_FLAC_16_44"):
    """Search music across Navidrome, Tidal, Spotify, etc. with quality filtering."""
    params = {
        "q": query,
        "type": "song",
        "quality": min_quality
    }
    start = time.time()
    resp = requests.get(f"{BASE_URL}/search", params=params)
    took = (time.time() - start) * 1000
    
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} - {resp.text}")
        return None
        
    data = resp.json()
    print(f"\n[Search Results for '{query}'] Took: {took:.1f}ms (Cache: {data.get('cached')})")
    print(f"Found: {data.get('total_found')} tracks (Filtered out: {data.get('filtered_out_count')})")
    print("-" * 75)
    
    for idx, track in enumerate(data.get("results", [])[:5], 1):
        quality = track.get("quality", {})
        loc = "[LOCAL NAVIDROME]" if track.get("in_local_library") else f"[{track.get('source').upper()}]"
        print(f"{idx}. {loc} {track.get('artist')} - {track.get('title')}")
        print(f"   Album: {track.get('album')} | Format: {quality.get('label')} ({quality.get('bitrate_kbps')} kbps)")
        print(f"   Stream: {BASE_URL}{track.get('stream_url')}")
    
    return data.get("results", [])

def trigger_download(source: str, track_id: str, title: str, artist: str):
    """Trigger background download to Navidrome library directory."""
    url = f"{BASE_URL}/download/{source}/{track_id}"
    resp = requests.post(url, params={"title": title, "artist": artist})
    if resp.status_code in (200, 202):
        task = resp.json()
        print(f"\nDownload queued: Task ID {task.get('id')} -> {task.get('target_file_path')}")
    else:
        print(f"Failed to queue download: {resp.text}")

def check_metrics():
    """Retrieve NaviProxy operational performance metrics."""
    resp = requests.get(f"{BASE_URL}/metrics")
    if resp.status_code == 200:
        m = resp.json()
        print(f"\n[NaviProxy Performance Metrics]")
        print(f"Uptime: {m.get('uptime_seconds')}s | Searches: {m.get('total_searches')}")
        print(f"Cache Hit Ratio: {m.get('cache_hit_ratio'):.1f}% | Memory: {m.get('memory_alloc_mb')} MB")

if __name__ == "__main__":
    print("Connecting to NaviProxy...")
    results = search_music("Daft Punk - Get Lucky", min_quality="CD_FLAC_16_44")
    if results:
        best_track = results[0]
        trigger_download(best_track["source"], best_track["source_id"], best_track["title"], best_track["artist"])
    check_metrics()
