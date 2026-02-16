'use client';

import { useEffect, useState } from 'react';

interface Skill {
  name: string;
  source: 'openclaw-bundled' | 'openclaw-workspace' | 'custom';
  location: string;
  description: string;
  enabled: boolean;
  files: Array<{ name: string; path: string; size: number }>;
}

interface SkillDetail {
  name: string;
  location: string;
  skillMd: string;
  files: string[];
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingFile, setViewingFile] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewSkill = async (skillName: string) => {
    try {
      const res = await fetch(`/api/skills/${skillName}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSkill(data);
        setSelectedFile(null);
        setViewingFile(false);
      }
    } catch (err) {
      console.error('Failed to load skill:', err);
    }
  };

  const viewFile = async (skillName: string, fileName: string) => {
    try {
      const res = await fetch(`/api/skills/${skillName}?file=${encodeURIComponent(fileName)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(data);
        setViewingFile(true);
      }
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  const closeModal = () => {
    setSelectedSkill(null);
    setSelectedFile(null);
    setViewingFile(false);
  };

  const groupedSkills = {
    bundled: skills.filter(s => s.source === 'openclaw-bundled'),
    workspace: skills.filter(s => s.source === 'openclaw-workspace'),
    custom: skills.filter(s => s.source === 'custom'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-lg">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Skills</h1>
            <p className="text-zinc-400">Browse and manage OpenClaw skills</p>
          </div>
          <a
            href="https://github.com/skunkceo/openclaw-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors border border-orange-500/30"
          >
            Browse More Skills →
          </a>
        </div>

        {/* OpenClaw Bundled Skills */}
        {groupedSkills.bundled.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">OpenClaw Bundled Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSkills.bundled.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => viewSkill(skill.name)}
                  className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{skill.name}</h3>
                    <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">bundled</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{skill.description}</p>
                  <div className="mt-3 text-xs text-zinc-500">{skill.files.length} files</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Workspace Skills */}
        {groupedSkills.workspace.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Workspace Skills</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSkills.workspace.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => viewSkill(skill.name)}
                  className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-orange-500/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{skill.name}</h3>
                    <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded">workspace</span>
                  </div>
                  <p className="text-sm text-zinc-400 line-clamp-2">{skill.description}</p>
                  <div className="mt-3 text-xs text-zinc-500">{skill.files.length} files</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* External Skills Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-500 mb-1">Installing External Skills</h3>
              <p className="text-sm text-zinc-300 mb-2">
                Skills from external sources can include malicious code. Only install skills from trusted sources.
              </p>
              <p className="text-xs text-zinc-400">
                Always review the skill's code before installing. Bundled skills are verified by the OpenClaw team.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                <div>
                  <h2 className="text-2xl font-bold">{selectedSkill.name}</h2>
                  <p className="text-sm text-zinc-500 mt-1 font-mono">{selectedSkill.location}</p>
                </div>
                <button onClick={closeModal} className="text-zinc-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-12 gap-0 h-full">
                  {/* File List */}
                  <div className="col-span-3 border-r border-zinc-800 p-4">
                    <h3 className="text-sm font-semibold text-zinc-400 mb-3">FILES</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => setViewingFile(false)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                          !viewingFile
                            ? 'bg-orange-500/10 text-orange-400'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        SKILL.md
                      </button>
                      {selectedSkill.files.filter(f => f !== 'SKILL.md').map((file) => (
                        <button
                          key={file}
                          onClick={() => viewFile(selectedSkill.name, file)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition truncate ${
                            viewingFile && selectedFile?.name === file
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          {file}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="col-span-9 p-6">
                    {viewingFile && selectedFile ? (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">{selectedFile.name}</h3>
                        <pre className="bg-zinc-950 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{selectedFile.content}</code>
                        </pre>
                      </div>
                    ) : (
                      <div className="prose prose-invert prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {selectedSkill.skillMd}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
