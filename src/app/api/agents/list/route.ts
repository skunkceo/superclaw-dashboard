import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getOpenClawWorkspace } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

interface AgentWorkspace {
  label: string;
  name: string;
  emoji: string;
  workspacePath: string;
  hasMemory: boolean;
  memorySize: number;
}

interface AgentSession {
  label: string;
  sessionKey: string;
  status: 'active' | 'idle' | 'waiting';
  lastActive: string;
  messageCount: number;
  model: string;
}

export async function GET() {
  try {
    const openclawWorkspace = getOpenClawWorkspace();
    const agentsDir = path.join(openclawWorkspace, 'agents');

    // Get configured agent workspaces
    const workspaces: AgentWorkspace[] = [];
    
    if (fs.existsSync(agentsDir)) {
      const agentDirs = fs.readdirSync(agentsDir).filter(name => {
        const fullPath = path.join(agentsDir, name);
        return fs.statSync(fullPath).isDirectory() && name !== 'shared';
      });

      for (const label of agentDirs) {
        const agentPath = path.join(agentsDir, label);
        const identityPath = path.join(agentPath, 'IDENTITY.md');
        const memoryPath = path.join(agentPath, 'MEMORY.md');
        
        let name = label;
        let emoji = '🤖';
        
        // Read identity if exists
        if (fs.existsSync(identityPath)) {
          const identity = fs.readFileSync(identityPath, 'utf-8');
          const nameMatch = identity.match(/\*\*Name:\*\*\s*(.+)/);
          const emojiMatch = identity.match(/\*\*Emoji:\*\*\s*(.+)/);
          if (nameMatch) name = nameMatch[1].trim();
          if (emojiMatch) emoji = emojiMatch[1].trim();
        }
        
        let memorySize = 0;
        if (fs.existsSync(memoryPath)) {
          const stats = fs.statSync(memoryPath);
          memorySize = stats.size;
        }
        
        workspaces.push({
          label,
          name,
          emoji,
          workspacePath: agentPath,
          hasMemory: fs.existsSync(memoryPath),
          memorySize
        });
      }
    }

    // Get active agent sessions from OpenClaw
    const sessions: AgentSession[] = [];
    
    try {
      const sessionsRaw = execSync('openclaw sessions list --json', { 
        encoding: 'utf-8',
        timeout: 5000 
      });
      
      const sessionsData = JSON.parse(sessionsRaw);
      
      // Filter for agent sessions (have labels matching our workspaces)
      if (Array.isArray(sessionsData)) {
        for (const session of sessionsData) {
          // Check if this session matches an agent workspace
          const workspace = workspaces.find(w => w.label === session.label);
          if (workspace) {
            sessions.push({
              label: session.label,
              sessionKey: session.key,
              status: session.status || 'idle',
              lastActive: session.lastActive || 'never',
              messageCount: session.messages?.length || 0,
              model: session.model || 'claude-sonnet-4'
            });
          }
        }
      }
    } catch (e) {
      // OpenClaw might not be running or sessions command failed
      console.error('Failed to get sessions from OpenClaw:', e);
    }

    // Transform workspaces into agents list
    const agents = workspaces.map(w => {
      
      // Extract description from AGENTS.md if exists
      let description = 'AI agent';
      const agentsPath = path.join(w.workspacePath, 'AGENTS.md');
      if (fs.existsSync(agentsPath)) {
        const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
        
        // Try to find "Primary Focus" line (better description)
        const focusMatch = agentsContent.match(/\*\*Primary Focus:\*\*\s*(.+)/);
        if (focusMatch) {
          // Remove emoji from description
          description = focusMatch[1].trim().replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().substring(0, 150);
        } else {
          // Fall back to first paragraph after headers, but skip Identity section
          const lines = agentsContent.split('\n');
          let inIdentitySection = false;
          
          for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and headers
            if (!trimmed || trimmed.startsWith('#')) {
              // Check if this is the Identity section header
              if (trimmed.toLowerCase().includes('## identity')) {
                inIdentitySection = true;
              } else if (trimmed.startsWith('##')) {
                inIdentitySection = false;
              }
              continue;
            }
            
            // Skip lines in Identity section
            if (inIdentitySection) continue;
            
            // Skip markdown bullets/lists
            if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
            
            // Found a good description line - remove emoji
            description = trimmed.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().substring(0, 150);
            break;
          }
        }
      }
      
      return {
        label: w.label,
        name: w.name,
        emoji: w.emoji,
        description,
        hasMemory: w.hasMemory,
        memorySize: w.memorySize
      };
    });

    return NextResponse.json({
      agents,
      workspaces,
      sessions,
      agentsDir
    });

  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      { error: 'Failed to list agents' },
      { status: 500 }
    );
  }
}
