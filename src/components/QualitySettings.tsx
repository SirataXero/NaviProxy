import React, { useState } from 'react';
import { Database, ShieldCheck, Check, Sparkles, Sliders, Music, Info, Save } from 'lucide-react';
import { AppConfig, QualityTier } from '../types';

interface QualitySettingsProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
}

const QUALITY_TIERS: {
  tier: QualityTier;
  title: string;
  bitrate: string;
  sampleRate: string;
  format: string;
  desc: string;
  color: string;
  audiophileLevel: string;
}[] = [
  {
    tier: 'LOW_MP3_128',
    title: 'Low Bandwidth (MP3 128k)',
    bitrate: '128 kbps CBR',
    sampleRate: '44.1 kHz',
    format: 'MP3',
    desc: 'Lowest bandwidth usage. Highly compressed, noticeable high-frequency cutoffs above 15kHz.',
    color: 'border-zinc-700 text-zinc-400',
    audiophileLevel: 'Budget / Cellular Saver',
  },
  {
    tier: 'MID_MP3_256',
    title: 'Standard (MP3/AAC 256k)',
    bitrate: '256 kbps VBR/CBR',
    sampleRate: '44.1 - 48 kHz',
    format: 'AAC / Opus / MP3',
    desc: 'Standard quality used by YouTube Music and Apple Music compressed streaming.',
    color: 'border-zinc-700 text-zinc-300',
    audiophileLevel: 'Consumer Standard',
  },
  {
    tier: 'HIGH_MP3_320',
    title: 'High Quality (MP3 320k)',
    bitrate: '320 kbps CBR',
    sampleRate: '44.1 kHz',
    format: 'MP3 / OGG Vorbis',
    desc: 'Maximum compressed quality. Transparent for 98% of general listening equipment.',
    color: 'border-amber-500/40 text-amber-300',
    audiophileLevel: 'High Quality Compressed',
  },
  {
    tier: 'CD_FLAC_16_44',
    title: 'CD Quality Lossless (16/44.1)',
    bitrate: '~800 - 1,411 kbps',
    sampleRate: '44.1 kHz / 16-bit',
    format: 'FLAC / ALAC',
    desc: 'Exact 1:1 bit-for-bit Redbook Audio CD fidelity. Zero compression artifacts.',
    color: 'border-emerald-500/50 text-emerald-300',
    audiophileLevel: 'Lossless HiFi',
  },
  {
    tier: 'HIRES_FLAC_24_96',
    title: 'Hi-Res Lossless (24/96)',
    bitrate: '~2,500 - 4,608 kbps',
    sampleRate: '96.0 kHz / 24-bit',
    format: 'FLAC / ALAC',
    desc: 'Studio Master quality with expanded dynamic range (>144dB) and ultrasonic headroom.',
    color: 'border-cyan-500/50 text-cyan-300',
    audiophileLevel: 'Audiophile Studio Master',
  },
  {
    tier: 'HIRES_FLAC_24_192',
    title: 'Master Audio (24/192)',
    bitrate: '~4,500 - 9,216 kbps',
    sampleRate: '192.0 kHz / 24-bit',
    format: 'FLAC Master',
    desc: 'Direct analog-to-digital studio archive master resolution.',
    color: 'border-purple-500/50 text-purple-300',
    audiophileLevel: 'Ultimate Archive Grade',
  },
];

export const QualitySettings: React.FC<QualitySettingsProps> = ({ config, onUpdateConfig }) => {
  const [minQuality, setMinQuality] = useState<QualityTier>(config.quality.minQuality);
  const [allowLowerIfUnavailable, setAllowLowerIfUnavailable] = useState(
    config.quality.allowLowerIfUnavailable
  );
  const [preferredFormat, setPreferredFormat] = useState(config.quality.preferredFormat);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: AppConfig = {
        ...config,
        quality: {
          minQuality,
          allowLowerIfUnavailable,
          preferredFormat,
        },
      };
      await onUpdateConfig(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <span>Audio Quality Threshold Rules</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Control the minimum acceptable audio fidelity. Any search results below this threshold are automatically dropped.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Quality Rules'}</span>
        </button>
      </div>

      {/* Interactive Quality Hierarchy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {QUALITY_TIERS.map((tier) => {
          const isCurrentMin = minQuality === tier.tier;

          return (
            <div
              key={tier.tier}
              onClick={() => setMinQuality(tier.tier)}
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                isCurrentMin
                  ? 'bg-amber-500/10 border-amber-500 shadow-xl shadow-amber-500/10'
                  : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {isCurrentMin && (
                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Current Minimum</span>
                </div>
              )}

              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                {tier.audiophileLevel}
              </div>

              <h3 className="text-sm font-bold text-zinc-100 mt-1">{tier.title}</h3>

              <div className="flex items-center space-x-2 my-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-300">
                  {tier.bitrate}
                </span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400">{tier.sampleRate}</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">{tier.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Auxiliary Quality & Transcoding Behaviors */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-zinc-200">Playback & Download Pipeline Policies</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowLowerIfUnavailable}
                onChange={(e) => setAllowLowerIfUnavailable(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20"
              />
              <span className="font-semibold text-zinc-200">
                Fallback to Highest Available if Quality Unavailable
              </span>
            </label>
            <p className="text-zinc-400 text-[11px] pl-7">
              If an obscure track is only available on YouTube Music at 256kbps and cannot meet CD FLAC, allow serving it rather than returning 0 results.
            </p>
          </div>

          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-2">
            <label className="block font-semibold text-zinc-200">Preferred Local Container</label>
            <select
              value={preferredFormat}
              onChange={(e) => setPreferredFormat(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-amber-500"
            >
              <option value="flac">FLAC (Free Lossless Audio Codec - Recommended)</option>
              <option value="alac">ALAC (Apple Lossless Audio Codec)</option>
              <option value="mp3">MP3 320kbps (LAME CBR)</option>
              <option value="opus">Opus (High Efficiency)</option>
            </select>
            <p className="text-zinc-400 text-[11px]">
              When writing downloaded tracks to the Navidrome library folder, files will be packaged into this container with full ID3v2 / Vorbis metadata tags.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
