import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Copy,
  Check,
  Download,
  ExternalLink,
  HelpCircle,
  Layers,
  Settings,
  Folder,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const UnraidTemplateView: React.FC = () => {
  const [copiedWget, setCopiedWget] = useState(false);
  const [copiedXml, setCopiedXml] = useState(false);
  const [copiedSmbPath, setCopiedSmbPath] = useState(false);

  // Dynamic template customization parameters
  const [webPort, setWebPort] = useState('8080');
  const [musicHostPath, setMusicHostPath] = useState('/mnt/user/music');
  const [appdataHostPath, setAppdataHostPath] = useState('/mnt/user/appdata/naviproxy');
  const [navidromeUrl, setNavidromeUrl] = useState('http://192.168.1.100:4533');
  const [navidromeUser, setNavidromeUser] = useState('admin');
  const [navidromeToken, setNavidromeToken] = useState('');
  const [redisUrl, setRedisUrl] = useState('redis://192.168.1.100:6379');
  const [minQuality, setMinQuality] = useState('HIGH_MP3_320');

  // Compute origin URL for the wget command
  const [originUrl, setOriginUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const generatedXml = `<?xml version="1.0"?>
<Container version="2">
  <Name>naviproxy</Name>
  <Repository>ghcr.io/your-username/naviproxy:latest</Repository>
  <Registry>https://github.com/your-username/naviproxy/pkgs/container/naviproxy</Registry>
  <Network>bridge</Network>
  <MyIP/>
  <Shell>sh</Shell>
  <Privileged>false</Privileged>
  <Support>https://github.com/your-username/naviproxy/issues</Support>
  <Project>https://github.com/your-username/naviproxy</Project>
  <Overview>NaviProxy is an intelligent music proxy between third-party applications (Symfonium, Feishin, DSub, Ultrasonic) and your Navidrome music server. It features multi-source concurrent search (Tidal, Spotify, Apple Music, Deezer, Debrid, Usenet), quality-based threshold filtering, and simultaneous background library caching into your Navidrome storage directory.</Overview>
  <Category>MediaApp:Music MediaApp:Other Tools:</Category>
  <WebUI>http://[IP]:[PORT:${webPort}]/</WebUI>
  <TemplateURL>false</TemplateURL>
  <Icon>https://raw.githubusercontent.com/deluan/navidrome/master/resources/logo-192.png</Icon>
  <ExtraParams>--restart unless-stopped</ExtraParams>
  <PostArgs/>
  <CPUset/>
  <DateInstalled>${Math.floor(Date.now() / 1000)}</DateInstalled>
  <DonateText/>
  <DonateLink/>
  <Requires/>
  <Config Name="Web UI &amp; API Port" Target="8080" Default="8080" Mode="tcp" Description="Web UI &amp; Subsonic API proxy port" Type="Port" Display="always" Required="true" Mask="false">${webPort}</Config>
  <Config Name="Music Library Path" Target="/music" Default="/mnt/user/music" Mode="rw" Description="Shared Navidrome music directory where downloaded tracks are persisted and scanned" Type="Path" Display="always" Required="true" Mask="false">${musicHostPath}</Config>
  <Config Name="AppData Config Storage" Target="/config" Default="/mnt/user/appdata/naviproxy" Mode="rw" Description="Persistent configuration and plugin credentials directory" Type="Path" Display="always" Required="true" Mask="false">${appdataHostPath}</Config>
  <Config Name="Navidrome Server URL" Target="NAVIDROME_URL" Default="http://[IP]:4533" Description="Full URL to your Navidrome server instance" Type="Variable" Display="always" Required="true" Mask="false">${navidromeUrl}</Config>
  <Config Name="Navidrome Username" Target="NAVIDROME_USER" Default="admin" Description="Navidrome username for local library checks" Type="Variable" Display="always" Required="true" Mask="false">${navidromeUser}</Config>
  <Config Name="Navidrome Auth Token / Salt" Target="NAVIDROME_TOKEN" Default="" Description="Navidrome auth token or user password" Type="Variable" Display="always" Required="false" Mask="true">${navidromeToken}</Config>
  <Config Name="Redis Cache URL" Target="REDIS_URL" Default="redis://[IP]:6379" Description="Redis cache URL for L2 sub-millisecond search caching (optional)" Type="Variable" Display="always" Required="false" Mask="false">${redisUrl}</Config>
  <Config Name="Download Subfolder" Target="DOWNLOAD_DIR" Default="/music/downloads" Description="Container path for saving newly downloaded audio tracks" Type="Variable" Display="advanced" Required="false" Mask="false">/music/downloads</Config>
  <Config Name="Minimum Audio Quality" Target="MIN_QUALITY" Default="HIGH_MP3_320" Description="Minimum audio quality threshold (LOW_MP3_128, MID_MP3_256, HIGH_MP3_320, CD_FLAC_16_44, HIRES_FLAC_24_96, HIRES_FLAC_24_192)" Type="Variable" Display="advanced" Required="false" Mask="false">${minQuality}</Config>
</Container>`;

  const wgetPath = '/boot/config/plugins/dockerMan/templates-user/my-naviproxy.xml';
  const downloadUrl = `${originUrl}/unraid-template.xml`;
  const wgetSelectedCmd = `wget -O ${wgetPath} ${downloadUrl}`;

  const copyWget = () => {
    navigator.clipboard.writeText(wgetSelectedCmd);
    setCopiedWget(true);
    setTimeout(() => setCopiedWget(false), 2500);
  };

  const copyXml = () => {
    navigator.clipboard.writeText(generatedXml);
    setCopiedXml(true);
    setTimeout(() => setCopiedXml(false), 2500);
  };

  const copySmbPath = () => {
    navigator.clipboard.writeText(wgetPath);
    setCopiedSmbPath(true);
    setTimeout(() => setCopiedSmbPath(false), 2500);
  };

  const downloadXmlFile = () => {
    const blob = new Blob([generatedXml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-naviproxy.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-zinc-100">Unraid Manual Template Import</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Docker XML Specification v2
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Import NaviProxy directly into your Unraid server using a single <code className="text-amber-400 font-mono">wget</code> command into Unraid's user templates directory. Once downloaded, it will appear instantly under <strong>Docker → Add Container → Select Template</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={downloadXmlFile}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-colors cursor-pointer border border-zinc-700"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download my-naviproxy.xml</span>
            </button>

            <button
              onClick={copyWget}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {copiedWget ? <Check className="w-4 h-4 text-zinc-950" /> : <Terminal className="w-4 h-4" />}
              <span>{copiedWget ? 'Command Copied!' : 'Copy wget Command'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick wget Command Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Immediate Unraid Terminal Import Command
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">Run in Unraid WebGUI Terminal as root</span>
        </div>

        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs text-amber-300 overflow-x-auto">
          <span className="select-all pr-4 whitespace-nowrap">{wgetSelectedCmd}</span>
          <button
            onClick={copyWget}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-sans flex items-center space-x-1.5 transition-colors flex-shrink-0 cursor-pointer"
          >
            {copiedWget ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedWget ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <p className="text-[11px] text-zinc-400">
          Target template directory on Unraid flash drive: <code className="text-zinc-300 font-mono">{wgetPath}</code>
        </p>
      </div>

      {/* 4-Step Step-by-Step Tutorial Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Step-by-Step Manual Import Guide (Unraid Workflow)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Step 1 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/30">
                1
              </span>
              <span className="font-bold text-zinc-200">Open Terminal</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              In your Unraid WebGUI header, click the <strong>Terminal icon (&gt;_)</strong> in the top right, or connect via SSH to your Unraid server as root.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/30">
                2
              </span>
              <span className="font-bold text-zinc-200">Run wget Command</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Paste the <code className="text-amber-400 font-mono">wget</code> command above to save <code className="text-zinc-300 font-mono">my-naviproxy.xml</code> into <code className="text-zinc-300 font-mono">/boot/config/plugins/dockerMan/templates-user/</code>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/30">
                3
              </span>
              <span className="font-bold text-zinc-200">Select Template</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Navigate to the <strong>Docker</strong> tab on Unraid. Scroll to the bottom and click <strong>Add Container</strong>. In the <strong>Template</strong> dropdown, select <strong>my-naviproxy</strong>.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center border border-amber-500/30">
                4
              </span>
              <span className="font-bold text-zinc-200">Verify &amp; Apply</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Verify your music path (<code className="text-zinc-300 font-mono">/mnt/user/music</code>) and Navidrome server IP, then click <strong>Apply</strong> to pull and launch the container.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Template Customizer & XML Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Customizer Fields */}
        <div className="space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Customize Template Parameters</span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              Modifying these fields dynamically updates the XML template preview in real-time.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Web UI &amp; API Host Port</label>
                <input
                  type="text"
                  value={webPort}
                  onChange={(e) => setWebPort(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Unraid Music Share Path</label>
                <input
                  type="text"
                  value={musicHostPath}
                  onChange={(e) => setMusicHostPath(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">AppData Configuration Path</label>
                <input
                  type="text"
                  value={appdataHostPath}
                  onChange={(e) => setAppdataHostPath(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Navidrome Server URL</label>
                <input
                  type="text"
                  value={navidromeUrl}
                  onChange={(e) => setNavidromeUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Navidrome Username</label>
                <input
                  type="text"
                  value={navidromeUser}
                  onChange={(e) => setNavidromeUser(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Navidrome Token (Optional)</label>
                <input
                  type="password"
                  value={navidromeToken}
                  onChange={(e) => setNavidromeToken(e.target.value)}
                  placeholder="Optional auth token"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Default Audio Minimum Quality</label>
                <select
                  value={minQuality}
                  onChange={(e) => setMinQuality(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value="LOW_MP3_128">MP3 128 kbps</option>
                  <option value="MID_MP3_256">MP3/AAC 256 kbps</option>
                  <option value="HIGH_MP3_320">MP3 320 kbps (Recommended)</option>
                  <option value="CD_FLAC_16_44">CD FLAC (16-bit / 44.1 kHz)</option>
                  <option value="HIRES_FLAC_24_96">Hi-Res FLAC (24-bit / 96 kHz)</option>
                  <option value="HIRES_FLAC_24_192">Master FLAC (24-bit / 192 kHz)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: XML Code Viewer */}
        <div className="lg:col-span-2 space-y-2">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-zinc-200">my-naviproxy.xml</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400">
                  Unraid Container v2
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={copyXml}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copiedXml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedXml ? 'Copied' : 'Copy XML'}</span>
                </button>

                <button
                  onClick={downloadXmlFile}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-200 overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
              <pre className="leading-relaxed">
                <code>{generatedXml}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
