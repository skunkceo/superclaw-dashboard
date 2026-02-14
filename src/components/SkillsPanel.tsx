import Link from 'next/link';

interface SkillsProps {
  skills: Array<{
    name: string;
    enabled: boolean;
    description: string;
  }>;
}

export function SkillsPanel({ skills }: SkillsProps) {
  const enabledCount = skills.filter(s => s.enabled).length;

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
        <h2 className="text-base sm:text-lg font-semibold">Skills & Capabilities</h2>
        <span className="text-xs sm:text-sm text-zinc-400">
          {enabledCount} of {skills.length} enabled
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {skills.map((skill) => (
          <div 
            key={skill.name}
            className={`p-3 sm:p-4 rounded-lg border transition ${
              skill.enabled 
                ? 'bg-orange-500/10 border-orange-500/30' 
                : 'bg-zinc-800/50 border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="font-medium text-sm sm:text-base flex-1 truncate">{skill.name}</div>
              <div className={`w-7 h-4 sm:w-8 sm:h-5 rounded-full relative cursor-pointer transition flex-shrink-0 ${
                skill.enabled ? 'bg-orange-500' : 'bg-zinc-600'
              }`}>
                <div className={`absolute w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white top-0.5 transition-all ${
                  skill.enabled ? 'left-3 sm:left-3.5' : 'left-0.5'
                }`} />
              </div>
            </div>
            <div className="text-xs sm:text-sm text-zinc-400 line-clamp-2">{skill.description}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 text-center">
        <Link 
          href="/skills"
          className="w-full sm:w-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition inline-block text-sm sm:text-base"
        >
          Browse More Skills
        </Link>
      </div>
    </div>
  );
}
