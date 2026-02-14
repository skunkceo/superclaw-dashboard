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
  };
}

export function ActiveTasks({ tasks }: TasksProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold">Active Tasks</h2>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
          <span className="text-orange-400">{tasks.active} active</span>
          <span className="text-zinc-500">{tasks.completed} completed</span>
        </div>
      </div>

      {tasks.subAgents.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-zinc-500">
          <div className="text-3xl sm:text-4xl mb-2">🦞</div>
          <div className="text-sm sm:text-base">No active sub-agents</div>
          <div className="text-xs sm:text-sm">All quiet on the AI front</div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.subAgents.map((agent) => (
            <div key={agent.id} className="p-3 sm:p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-2 sm:gap-4">
                <div className="font-medium text-sm sm:text-base line-clamp-2 flex-1">{agent.task}</div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium self-start whitespace-nowrap ${
                  agent.status === 'running' ? 'bg-orange-500/20 text-orange-400' :
                  agent.status === 'completed' ? 'bg-green-500/20 text-green-400' :
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
    </div>
  );
}
