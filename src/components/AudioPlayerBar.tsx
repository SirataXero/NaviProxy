import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Disc3, ShieldAlert, Sparkles } from 'lucide-react';
import { MusicTrack } from '../types';

interface AudioPlayerBarProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onDownload: (track: MusicTrack) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onDownload,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBufferProgress, setAudioBufferProgress] = useState(100);

  // Sync audio source when track changes
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    const streamUrl = (currentTrack.streamUrl || currentTrack.stream_url) || `/stream/${currentTrack.source}/${(currentTrack.sourceId || currentTrack.source_id)}`;
    audioRef.current.src = streamUrl;
    audioRef.current.volume = volume;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentTrack]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
      // Calculate buffer progress
      if (audioRef.current.buffered.length > 0) {
        const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
        const dur = audioRef.current.duration || 120;
        setAudioBufferProgress(Math.min(100, Math.round((bufferedEnd / dur) * 100)));
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
      setIsMuted(v === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 border-t border-zinc-800/80 px-4 py-3 text-center text-xs text-zinc-500 backdrop-blur-md">
        Select any track to stream audio directly through the NaviProxy chunked transfer pipeline
      </div>
    );
  }

  const isLossless = currentTrack.quality?.isLossless;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800 shadow-2xl backdrop-blur-lg">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => onTogglePlay()}
      />

      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Track Information & Badges */}
          <div className="flex items-center space-x-3 w-full sm:w-1/3 min-w-0">
            <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800">
              {(currentTrack.coverArtUrl || currentTrack.cover_art_url) ? (
                <img
                  src={(currentTrack.coverArtUrl || currentTrack.cover_art_url)}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                  <Disc3 className="w-6 h-6 animate-spin" />
                </div>
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="flex items-end space-x-0.5 h-4">
                    <span className="w-1 bg-amber-400 animate-pulse h-2"></span>
                    <span className="w-1 bg-amber-400 animate-pulse h-4 delay-75"></span>
                    <span className="w-1 bg-amber-400 animate-pulse h-3 delay-150"></span>
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-semibold text-zinc-100 truncate">
                  {currentTrack.title}
                </span>
                {(currentTrack.inLocalLibrary || currentTrack.in_local_library) && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Navidrome
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {currentTrack.artist} • {currentTrack.album}
              </p>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isLossless ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {currentTrack.quality?.label || '320kbps'}
                </span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Source: {currentTrack.source}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Controls & Time Progress Bar */}
          <div className="flex flex-col items-center w-full sm:w-1/3">
            <div className="flex items-center space-x-4">
              <button
                onClick={onTogglePlay}
                className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button
                onClick={() => onDownload(currentTrack)}
                className="p-2 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                title="Download to library folder"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full flex items-center space-x-2 mt-1.5 text-[11px] font-mono text-zinc-400">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 120}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
              <span className="w-8">{formatTime(duration || currentTrack.duration || 120)}</span>
            </div>
          </div>

          {/* Right: Audio Engine Metrics & Volume Slider */}
          <div className="hidden sm:flex items-center justify-end space-x-4 w-1/3">
            <div className="text-right">
              <div className="text-[11px] text-zinc-300 font-mono flex items-center justify-end space-x-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{currentTrack.quality?.bitrateKbps || 1411} kbps</span>
              </div>
              <div className="text-[10px] text-zinc-500">
                Buffer: <span className="text-cyan-400 font-mono">{audioBufferProgress}%</span> • Chunked HTTP
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
