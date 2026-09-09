import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Music,
  ExternalLink,
  Sparkles,
  Info,
  Server,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { MusicTrack, QualityTier, SearchResponse, SourceType } from '../types';

interface MusicSearchProps {
  onPlayTrack: (track: MusicTrack) => void;
  onDownloadTrack: (track: MusicTrack) => void;
  currentPlayingTrack: MusicTrack | null;
  minQualitySetting: QualityTier;
}

const QUALITY_OPTIONS: { tier: QualityTier; label: string; desc: string }[] = [
  { tier: 'LOW_MP3_128', label: 'MP3 128k', desc: 'Any format / Low bandwidth' },
  { tier: 'MID_MP3_256', label: 'MP3/AAC 256k', desc: 'Standard streaming quality' },
  { tier: 'HIGH_MP3_320', label: 'MP3 320kbps', desc: 'High Quality Compressed' },
  { tier: 'CD_FLAC_16_44', label: 'CD FLAC (16/44.1)', desc: 'Lossless Redbook Audio' },
  { tier: 'HIRES_FLAC_24_96', label: 'Hi-Res FLAC (24/96)', desc: 'Audiophile Studio Master' },
  { tier: 'HIRES_FLAC_24_192', label: 'Master (24/192)', desc: 'Ultra Hi-Res Lossless' },
];

const SUGGESTED_QUERIES = [
  'Daft Punk - Get Lucky',
  'Pink Floyd - Time',
  'The Weeknd - Blinding Lights',
  'Miles Davis - So What',
  'Hans Zimmer - Time',
];

export const MusicSearch: React.FC<MusicSearchProps> = ({
  onPlayTrack,
  onDownloadTrack,
  currentPlayingTrack,
  minQualitySetting,
}) => {
  const [query, setQuery] = useState('Daft Punk - Get Lucky');
  const [searchType, setSearchType] = useState<'song' | 'artist' | 'album'>('song');
  const [selectedQuality, setSelectedQuality] = useState<QualityTier>(minQualitySetting || 'HIGH_MP3320');
  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [inspectTrack, setInspectTrack] = useState<MusicTrack | null>(null);

  // Sync prop changes
  useEffect(() => {
    if (minQualitySetting) {
      setSelectedQuality(minQualitySetting);
    }
  }, [minQualitySetting]);

  // Execute initial search on load
  useEffect(() => {
    performSearch(query, selectedQuality, searchType);
  }, []);

  const performSearch = async (
    q: string,
    qualityTier: QualityTier,
    type: 'song' | 'artist' | 'album'
  ) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/search?q=${encodeURIComponent(q)}&type=${type}&quality=${qualityTier}`
      );
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setSearchResponse(data);
      }
    } catch (err) {
      console.error('Search request failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, selectedQuality, searchType);
  };

  const handleQualityChange = (q: QualityTier) => {
    setSelectedQuality(q);
    performSearch(query, q, searchType);
  };

  // Filter tracks by active source filter if any
  const displayedTracks = (searchResponse?.results || []).filter((t) => {
    if (selectedSourceFilter === 'all') return true;
    if (selectedSourceFilter === 'navidrome') return t.inLocalLibrary;
    return t.source === selectedSourceFilter;
  });

  const getSourceBadgeColor = (source: SourceType, inLocal?: boolean) => {
    if (inLocal) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    switch (source) {
      case 'tidal':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'spotify':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'applemusic':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'deezer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'ytmusic':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'debrid':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'usenet':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Bar & Controls */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search music across Navidrome, Tidal, Spotify, Debrid..."
                className="w-full pl-11 pr-4 py-3 bg-zinc-950/80 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm sm:text-base font-medium transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
                {(['song', 'album', 'artist'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setSearchType(t);
                      performSearch(query, selectedQuality, t);
                    }}
                    className={`px-3 py-2 rounded-lg capitalize transition-colors ${
                      searchType === t ? 'bg-amber-500 text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                {loading ? 'Proxying...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Suggested Quick Queries */}
          <div className="flex items-center space-x-2 text-xs text-zinc-400 flex-wrap gap-y-1.5">
            <span className="text-zinc-500 font-medium">Suggested:</span>
            {SUGGESTED_QUERIES.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  performSearch(sq, selectedQuality, searchType);
                }}
                className="px-2 py-0.5 rounded-md bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Quality Requirement Filter Selector */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Audio Quality Threshold:
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
              {QUALITY_OPTIONS.map((opt) => {
                const isSelected = selectedQuality === opt.tier;
                return (
                  <button
                    key={opt.tier}
                    type="button"
                    onClick={() => handleQualityChange(opt.tier)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all whitespace-nowrap border ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </div>

      {/* Proxy Search Workflow Telemetry Banner */}
      {searchResponse && (
        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/60">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold text-zinc-200">Proxy Execution Summary:</span>
              <span className="text-zinc-400">
                Found <span className="text-amber-400 font-bold">{(searchResponse.totalResults || searchResponse.total_found || 0)}</span> matches in{' '}
                <span className="text-cyan-400 font-mono font-bold">{(searchResponse.tookMs || searchResponse.took_ms || 0)}ms</span>
                {searchResponse.cached && <span className="ml-1 text-emerald-400">(from cache)</span>}
              </span>
            </div>

            {(searchResponse.filteredOutCount || searchResponse.filtered_out_count || 0) > 0 && (
              <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                <Info className="w-3.5 h-3.5" />
                <span>
                  Filtered out <strong className="font-bold">{(searchResponse.filteredOutCount || searchResponse.filtered_out_count || 0)}</strong> tracks below threshold ({String(selectedQuality).replace(/_/g, ' ')})
                </span>
              </div>
            )}
          </div>

          {/* Sources Fan-Out Response Times */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-3">
            {(searchResponse.sourcesQueried || searchResponse.sources_queried || []).map((src) => (
              <div
                key={src.source}
                onClick={() =>
                  setSelectedSourceFilter(selectedSourceFilter === src.source ? 'all' : src.source)
                }
                className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                  selectedSourceFilter === src.source
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider truncate">
                  {src.source === 'navidrome' ? 'Navidrome (Local)' : src.source}
                </div>
                <div className="text-xs font-semibold text-zinc-200 mt-0.5">
                  {src.count} found
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {(src.tookMs || src.took_ms || 0)}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Header with Source Filter Chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Music className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Unified Music Results ({displayedTracks.length})
          </h2>
        </div>

        {/* Source Filter Filter */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-xs">
          <span className="text-zinc-500 font-medium">Filter Source:</span>
          {['all', 'navidrome', 'tidal', 'spotify', 'applemusic', 'deezer', 'ytmusic', 'debrid', 'usenet'].map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSourceFilter(s)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                selectedSourceFilter === s
                  ? 'bg-zinc-200 text-zinc-950 font-bold'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Track Results List */}
      {displayedTracks.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 space-y-3">
          <Server className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="text-sm">No results match your query and quality filter threshold.</p>
          <p className="text-xs text-zinc-500">
            Try adjusting the minimum audio quality to MP3 320k or MP3 256k to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {displayedTracks.map((track) => {
            const isPlaying = currentPlayingTrack?.id === track.id;
            const isLossless = track.quality?.isLossless;

            return (
              <div
                key={track.id}
                className={`group flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all ${
                  isPlaying
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Left: Album Art & Track Info */}
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className="relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
                    <img
                      src={(track.coverArtUrl || track.cover_art_url) || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&h=100&fit=crop'}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => onPlayTrack(track)}
                      className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity cursor-pointer ${
                        isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Play className="w-6 h-6 text-amber-400 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-sm sm:text-base font-semibold text-zinc-100 truncate group-hover:text-amber-400 transition-colors">
                        {track.title}
                      </span>
                      {(track.inLocalLibrary || track.in_local_library) ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>In Navidrome</span>
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${getSourceBadgeColor(
                            track.source
                          )}`}
                        >
                          {track.source}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 truncate mt-0.5">
                      <span className="font-medium text-zinc-300">{track.artist}</span> •{' '}
                      <span>{track.album}</span>
                      {track.year && <span className="text-zinc-500"> ({track.year})</span>}
                    </div>

                    {/* Audio Technical Badges */}
                    <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium border ${
                          isLossless
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {track.quality?.label}
                      </span>

                      {track.quality?.sampleRateHz && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {track.quality.sampleRateHz / 1000}kHz / {track.quality.bitDepth || 16}-bit
                        </span>
                      )}

                      <span className="text-[10px] text-zinc-500">
                        {Math.floor(track.duration / 60)}:{track.duration % 60 < 10 ? '0' : ''}
                        {track.duration % 60}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 ml-3">
                  <button
                    onClick={() => setInspectTrack(track)}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="View Audio Metadata"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDownloadTrack(track)}
                    className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Download to Navidrome storage"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onPlayTrack(track)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 font-medium text-xs rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Stream</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Metadata Inspector Modal */}
      {inspectTrack && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100">{inspectTrack.title}</h3>
                <p className="text-xs text-zinc-400">{inspectTrack.artist} — {inspectTrack.album}</p>
              </div>
              <button
                onClick={() => setInspectTrack(null)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500">Source Provider:</span>
                  <p className="font-semibold text-zinc-200 uppercase">{inspectTrack.source}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Local Status:</span>
                  <p className="font-semibold text-emerald-400">
                    {inspectTrack.inLocalLibrary ? 'Already in Navidrome' : 'External Stream'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500">Audio Container:</span>
                  <p className="font-mono text-zinc-200">{inspectTrack.quality.format.toUpperCase()}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Bitrate:</span>
                  <p className="font-mono text-amber-400">{inspectTrack.quality.bitrateKbps} kbps</p>
                </div>
                <div>
                  <span className="text-zinc-500">Sample Rate:</span>
                  <p className="font-mono text-zinc-200">{inspectTrack.quality.sampleRateHz} Hz</p>
                </div>
                <div>
                  <span className="text-zinc-500">Bit Depth:</span>
                  <p className="font-mono text-zinc-200">{inspectTrack.quality.bitDepth || 16}-bit</p>
                </div>
                <div>
                  <span className="text-zinc-500">Lossless Master:</span>
                  <p className="font-semibold text-zinc-200">{inspectTrack.quality.isLossless ? 'Yes (Audiophile)' : 'No (Lossy CBR)'}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Stream Protocol:</span>
                  <p className="font-mono text-cyan-400">HTTP Chunked Transfer</p>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                <strong>Proxy Routing:</strong> Requests to this track trigger NaviProxy to stream directly from {inspectTrack.source}. If auto-download is enabled in your configuration, a simultaneous async worker persists the track to your Navidrome music directory.
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  onPlayTrack(inspectTrack);
                  setInspectTrack(null);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs"
              >
                Stream Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
