interface TasksProps {
  tasks: {
    active: number;
    completed: number;
    subAgents: Array<{
      id: string;
      task: string;
      model: string;
      status: string;
    }>;
    mainSession?: {
      status: 'active' | 'idle';
      lastActive: string;
      recentMessages: number;
    };
  };
}

export function ActiveTasks({ tasks }: TasksProps) {
  const main = tasks.mainSession;
  
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold">Activity</h2>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <span className="text-zinc-400">{tasks.completed} sessions</span>
        </div>
      </div>

      {/* Main Session Status */}
      {main && (
        <div className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦞</span>
              <span className="font-medium text-sm sm:text-base">Main Session</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              main.status === 'active' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-zinc-700/50 text-zinc-400'
            }`}>
              {main.status === 'active' ? 'Active' : 'Idle'}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-zinc-400">
            <span>Last active: {main.lastActive}</span>
            {main.recentMessages > 0 && (
              <>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span>{main.recentMessages} messages this hour</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sub-agents */}
      {tasks.subAgents.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wide px-1">
            Sub-agents ({tasks.subAgents.length})
          </div>
          {tasks.subAgents.map((agent) => (
            <div key={agent.id} className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2 sm:gap-4">
                <div className="font-medium text-sm sm:text-base line-clamp-2 flex-1">{agent.task}</div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium self-start whitespace-nowrap ${
                  agent.status === 'running' ? 'bg-orange-500/20 text-orange-400' :
                  agent.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {agent.status}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-zinc-400">
                <span className="font-mono">{agent.model}</span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="font-mono text-xs truncate">{agent.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No sub-agents message - only show if main session is idle */}
      {tasks.subAgents.length === 0 && main?.status === 'idle' && (
        <div className="text-center py-4 text-zinc-500 text-sm">
          No sub-agents running
        </div>
      )}
    </div>
  );
}
