const modelLabels: Record<string, string> = {
  'claude-opus-4-6': 'Claude Opus 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  'claude-opus-4-5-20250514': 'Claude Opus 4.5',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-haiku-3-5-20241022': 'Claude Haiku 3.5',
};

interface HealthProps {
  health: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: string;
    lastHeartbeat: string;
    gatewayVersion: string;
    defaultModel?: string;
  };
}

export function HealthCard({ health }: HealthProps) {
  const statusColors = {
    healthy: 'bg-green-500/20 text-green-400 border-green-500/30',
    degraded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    offline: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const modelDisplay = health.defaultModel
    ? modelLabels[health.defaultModel] || health.defaultModel
    : 'Unknown';

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold">System Health</h2>
        <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium border self-start sm:self-auto ${statusColors[health.status]}`}>
          {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-zinc-400 mb-1">Uptime</div>
          <div className="text-lg sm:text-xl font-mono">{health.uptime}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-zinc-400 mb-1">Last Heartbeat</div>
          <div className="text-lg sm:text-xl font-mono">{health.lastHeartbeat}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-zinc-400 mb-1">Default Model</div>
          <div className="text-base sm:text-lg font-mono">{modelDisplay}</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-zinc-400 mb-1">Gateway Version</div>
          <div className="text-base sm:text-lg font-mono">{health.gatewayVersion}</div>
        </div>
      </div>
    </div>
  );
}
