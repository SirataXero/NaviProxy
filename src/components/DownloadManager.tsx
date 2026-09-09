import React, { useState } from 'react';
import {
  Download,
  Folder,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FolderSync,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { AppConfig, DownloadTask } from '../types';

interface DownloadManagerProps {
  tasks: DownloadTask[];
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
  onClearCompleted?: () => void;
}

export const DownloadManager: React.FC<DownloadManagerProps> = ({
  tasks,
  config,
  onUpdateConfig,
}) => {
  const [downloadFolder, setDownloadFolder] = useState(config.downloads.folder);
  const [autoTriggerOnStream, setAutoTriggerOnStream] = useState(
    config.downloads.autoTriggerOnStream
  );
  const [concurrentLimit, setConcurrentLimit] = useState(config.downloads.concurrentLimit);
  const [saving, setSaving] = useState(false);
  const [scanTriggered, setScanTriggered] = useState(false);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated: AppConfig = {
        ...config,
        downloads: {
          ...config.downloads,
          folder: downloadFolder,
          autoTriggerOnStream,
          concurrentLimit,
        },
      };
      await onUpdateConfig(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerNavidromeScan = () => {
    setScanTriggered(true);
    setTimeout(() => setScanTriggered(false), 3000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const activeCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'queued').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Folder Settings Banner */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Storage & Download Pipeline Configuration
              </h2>
              <p className="text-xs text-zinc-400">
                Configure destination folder and automated background caching
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerNavidromeScan}
              disabled={scanTriggered}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <FolderSync className={`w-3.5 h-3.5 ${scanTriggered ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{scanTriggered ? 'Navidrome Scanning...' : 'Trigger Navidrome Library Scan'}</span>
            </button>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Download Destination Folder</label>
            <input
              type="text"
              value={downloadFolder}
              onChange={(e) => setDownloadFolder(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Concurrent Download Workers</label>
            <input
              type="number"
              min={1}
              max={16}
              value={concurrentLimit}
              onChange={(e) => setConcurrentLimit(parseInt(e.target.value) || 4)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTriggerOnStream}
                onChange={(e) => setAutoTriggerOnStream(e.target.checked)}
                className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-amber-500 focus:ring-amber-500/20"
              />
              <div>
                <span className="text-zinc-200 font-medium">Simultaneous Stream & Download</span>
                <p className="text-[11px] text-zinc-500">Auto-save played external tracks to Navidrome</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Queue Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-zinc-400 font-medium">Download Queue:</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
            {activeCount} Active
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
            {completedCount} Completed
          </span>
        </div>
      </div>

      {/* Download Tasks List */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 space-y-2">
            <HardDrive className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-sm">Download queue is empty.</p>
            <p className="text-xs text-zinc-500">
              Click the download button on any search result or enable 'Simultaneous Stream & Download' to populate this queue.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isDownloading = task.status === 'downloading';
            const isFailed = task.status === 'failed';

            return (
              <div
                key={task.id}
                className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-zinc-100 truncate">
                        {task.track.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded font-mono uppercase bg-zinc-800 text-zinc-400">
                        {task.track.source}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded font-mono bg-amber-500/15 text-amber-300">
                        {task.track.quality?.label || 'FLAC Lossless'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {task.track.artist} — {task.targetFilePath}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 ml-3">
                    {isDownloading && (
                      <span className="text-xs font-mono text-cyan-400">
                        {(task.downloadSpeedBytesPerSec / 1024 / 1024).toFixed(1)} MB/s
                      </span>
                    )}

                    <div className="flex items-center space-x-1.5">
                      {isCompleted ? (
                        <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Saved to Navidrome</span>
                        </span>
                      ) : isDownloading ? (
                        <span className="flex items-center space-x-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{task.progress}%</span>
                        </span>
                      ) : isFailed ? (
                        <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-xs text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Queued</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800/80">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isFailed
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>
                    {formatBytes(task.downloadedBytes)} of {formatBytes(task.totalBytes)}
                  </span>
                  <span>Started: {new Date(task.startedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
