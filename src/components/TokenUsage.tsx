interface ModelUsage {
  input: number;
  output: number;
  cost: number;
}

interface TokenProps {
  tokens: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    allTime?: number;
    estimatedCost: number;
    todayCost?: number;
    weekCost?: number;
    byModel?: {
      today?: Record<string, ModelUsage>;
      thisWeek?: Record<string, ModelUsage>;
      thisMonth?: Record<string, ModelUsage>;
    };
  };
  subscription?: {
    provider: string;
    plan: string;
    isSubscription?: boolean;
  } | null;
}

const modelLabels: Record<string, string> = {
  'claude-opus-4-5': 'Opus 4.5',
  'claude-opus-4-20250514': 'Opus 4',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-sonnet-4-5-20250514': 'Sonnet 4.5',
  'claude-haiku-3-5-20241022': 'Haiku 3.5',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
  'unknown': 'Unknown',
};

export function TokenUsage({ tokens, subscription }: TokenProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCost = (num: number) => {
    if (num < 0.01 && num > 0) return '<$0.01';
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Get model breakdown for this month
  const monthModels = tokens.byModel?.thisMonth || {};
  const sortedModels = Object.entries(monthModels)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 4);

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h2 className="text-base sm:text-lg font-semibold">Token Usage</h2>
          {subscription && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                {subscription.provider}
              </span>
              <span className="text-xs text-zinc-500">{subscription.plan}</span>
            </div>
          )}
        </div>
        <div className="text-left sm:text-right">
          <div className={`text-xl sm:text-2xl font-bold ${subscription?.isSubscription ? 'text-zinc-400' : 'text-green-400'}`}>
            {formatCost(tokens.estimatedCost)}
          </div>
          <div className="text-xs text-zinc-500">
            {subscription?.isSubscription ? 'equiv. API cost' : 'this month'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-mono font-bold text-orange-400">
            {formatNumber(tokens.today)}
          </div>
          <div className="text-xs sm:text-sm text-zinc-400 mt-1">Today</div>
          {tokens.todayCost !== undefined && (
            <div className="text-xs text-zinc-500">{formatCost(tokens.todayCost)}</div>
          )}
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400">
            {formatNumber(tokens.thisWeek)}
          </div>
          <div className="text-xs sm:text-sm text-zinc-400 mt-1">This Week</div>
          {tokens.weekCost !== undefined && (
            <div className="text-xs text-zinc-500">{formatCost(tokens.weekCost)}</div>
          )}
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-mono font-bold text-yellow-400">
            {formatNumber(tokens.thisMonth)}
          </div>
          <div className="text-xs sm:text-sm text-zinc-400 mt-1">This Month</div>
        </div>
      </div>

      {/* Model Breakdown */}
      {sortedModels.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Usage by Model (Month)</h3>
          <div className="space-y-2">
            {sortedModels.map(([model, usage]) => {
              const label = modelLabels[model] || model.split('-').slice(0, 2).join(' ');
              const totalTokens = usage.input + usage.output;
              const maxTokens = Math.max(...sortedModels.map(([, u]) => u.input + u.output));
              const widthPercent = (totalTokens / maxTokens) * 100;
              
              return (
                <div key={model} className="relative">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-300">{label}</span>
                    <span className="text-zinc-500 font-mono text-xs">
                      {formatNumber(totalTokens)} tokens · {formatCost(usage.cost)}
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Time */}
      {tokens.allTime !== undefined && tokens.allTime > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
          <div className="text-sm text-zinc-500">
            All time: <span className="text-zinc-300 font-mono">{formatNumber(tokens.allTime)}</span> tokens
          </div>
        </div>
      )}
    </div>
  );
}
