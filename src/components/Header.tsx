import React from 'react';
import { Radio, Database, ShieldCheck, Activity, Download, Server, HardDrive } from 'lucide-react';
import { AppConfig, SystemMetrics } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  config: AppConfig | null;
  metrics: SystemMetrics | null;
  activeDownloadsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  metrics,
  activeDownloadsCount,
}) => {
  const navTabs = [
    { id: 'search', label: 'Search & Stream', icon: Radio },
    { id: 'plugins', label: 'Source Plugins', icon: ShieldCheck },
    { id: 'quality', label: 'Quality Rules', icon: Database },
    { id: 'downloads', label: 'Downloads', icon: Download, badge: activeDownloadsCount },
    { id: 'docker', label: 'Docker Container', icon: HardDrive },
    { id: 'metrics', label: 'Performance & Logs', icon: Activity },
    { id: 'api', label: 'API & Subsonic', icon: Server },
    { id: 'code', label: 'Go & Docker Code', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Service Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('search')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white tracking-tight">NaviProxy</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Go Service
                </span>
              </div>
              <p className="text-xs text-zinc-400">Navidrome Music Proxy & Streamer</p>
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            {/* Navidrome Status */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-zinc-300 font-medium">Navidrome:</span>
              <span className="text-emerald-400">Connected</span>
            </div>

            {/* Min Quality Badge */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-400">Min Quality:</span>
              <span className="text-amber-400 font-medium">
                {String(config?.quality?.minQuality || "HIGH_MP3_320").replace(/_/g, ' ') || 'MP3 320k'}
              </span>
            </div>

            {/* Latency Metric */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <Activity className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400">Search TTFB:</span>
              <span className="text-cyan-400 font-mono font-semibold">
                {metrics?.avgSearchLatencyMs || 38}ms
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1.5 -mb-px">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-zinc-950 text-amber-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
