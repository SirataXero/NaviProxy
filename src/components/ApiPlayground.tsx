import React, { useState } from 'react';
import { Terminal, Play, Copy, Check, Server, Radio, Download, Settings, Activity } from 'lucide-react';

interface EndpointDefinition {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  defaultParams?: Record<string, string>;
  body?: string;
}

const ENDPOINTS: EndpointDefinition[] = [
  {
    method: 'GET',
    path: '/search',
    desc: 'Intelligent multi-source search with quality threshold filtering',
    defaultParams: { q: 'Daft Punk - Get Lucky', type: 'song', quality: 'HIGH_MP3_320' },
  },
  {
    method: 'GET',
    path: '/stream/tidal/demo-track-1',
    desc: 'Stream audio from source with chunked transfer encoding (Returns audio stream)',
  },
  {
    method: 'GET',
    path: '/download/tidal/demo-track-1',
    desc: 'Trigger async download to library folder',
    defaultParams: { title: 'Get Lucky', artist: 'Daft Punk' },
  },
  {
    method: 'GET',
    path: '/config',
    desc: 'Retrieve current configuration, source credentials, and thresholds',
  },
  {
    method: 'POST',
    path: '/auth/tidal',
    desc: 'Test source authentication and credentials',
    body: JSON.stringify({ access_token: 'sample_bearer_token' }, null, 2),
  },
  {
    method: 'GET',
    path: '/health',
    desc: 'Healthcheck endpoint for container orchestrators',
  },
  {
    method: 'GET',
    path: '/metrics',
    desc: 'Operational performance counters (<100ms latency, cache hit ratio)',
  },
  {
    method: 'GET',
    path: '/rest/search3.view',
    desc: 'Subsonic API compatibility for third-party clients (Symfonium, DSub, Feishin)',
    defaultParams: { query: 'Pink Floyd' },
  },
];

export const ApiPlayground: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDefinition>(ENDPOINTS[0]);
  const [queryParams, setQueryParams] = useState<Record<string, string>>(
    ENDPOINTS[0].defaultParams || {}
  );
  const [requestBody, setRequestBody] = useState<string>(ENDPOINTS[0].body || '');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectEndpoint = (ep: EndpointDefinition) => {
    setSelectedEndpoint(ep);
    setQueryParams(ep.defaultParams || {});
    setRequestBody(ep.body || '');
    setResponseBody('');
    setResponseStatus(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const url = new URL(selectedEndpoint.path, window.location.origin);
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, String(v));
      });

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {},
      };

      if (selectedEndpoint.method === 'POST' && requestBody) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = requestBody;
      }

      const res = await fetch(url.toString(), options);
      setResponseStatus(res.status);

      const headers: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headers[key] = val;
      });
      setResponseHeaders(headers);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setResponseBody(JSON.stringify(json, null, 2));
      } else if (contentType.includes('audio/')) {
        setResponseBody(`[Binary Audio Stream Received: ${contentType} - Transfer-Encoding: chunked]`);
      } else {
        const text = await res.text();
        setResponseBody(text);
      }
    } catch (err: any) {
      setResponseBody(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateCurl = () => {
    const url = new URL(selectedEndpoint.path, window.location.origin);
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, String(v));
    });

    if (selectedEndpoint.method === 'POST') {
      return `curl -X POST "${url.toString()}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody || "{}"}'`;
    }
    return `curl -s "${url.toString()}"`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <span>Interactive REST API & Subsonic Compatibility Tester</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Directly execute and test all NaviProxy endpoints defined in the specification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Endpoints List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Available Endpoints
          </h3>
          <div className="space-y-1.5">
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => selectEndpoint(ep)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/80 text-zinc-100'
                      : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        ep.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-semibold text-zinc-200 truncate">{ep.path}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{ep.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Request & Response Inspector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 font-mono text-sm">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                  {selectedEndpoint.method}
                </span>
                <span className="text-zinc-100 font-bold">{selectedEndpoint.path}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={copyCurl}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy cURL'}</span>
                </button>

                <button
                  onClick={handleExecute}
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Executing...' : 'Execute'}</span>
                </button>
              </div>
            </div>

            {/* Query Parameters Inputs */}
            {Object.keys(queryParams).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/80 text-xs">
                <span className="font-semibold text-zinc-300">Query Parameters</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(queryParams).map(([k, v]) => (
                    <div key={k}>
                      <label className="block text-[11px] font-mono text-zinc-400 mb-1">{k}</label>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) => setQueryParams({ ...queryParams, [k]: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body for POST */}
            {selectedEndpoint.method === 'POST' && (
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
                <span className="font-semibold text-zinc-300">Request Body (JSON)</span>
                <textarea
                  rows={4}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 font-mono text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Response Area */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">HTTP Response</span>
                {responseStatus && (
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    Status: {responseStatus}
                  </span>
                )}
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-xs max-h-72 overflow-y-auto text-zinc-300 scrollbar-thin">
                {responseBody ? (
                  <pre className="whitespace-pre-wrap">{responseBody}</pre>
                ) : (
                  <span className="text-zinc-600">Click 'Execute' to send request to NaviProxy</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
