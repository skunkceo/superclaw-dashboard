import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ label: string }> }
) {
  try {
    const { label } = await params;
    const homeDir = require('os').homedir();
    const openclawWorkspace = process.env.OPENCLAW_WORKSPACE || path.join(homeDir, '.openclaw', 'workspace');
    const agentPath = path.join(openclawWorkspace, 'agents', label);

    if (!fs.existsSync(agentPath)) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Read agent identity
    let name = label;
    let emoji = '🤖';
    const identityPath = path.join(agentPath, 'IDENTITY.md');
    if (fs.existsSync(identityPath)) {
      const identity = fs.readFileSync(identityPath, 'utf-8');
      const nameMatch = identity.match(/\*\*Name:\*\*\s*(.+)/);
      const emojiMatch = identity.match(/\*\*Emoji:\*\*\s*(.+)/);
      if (nameMatch) name = nameMatch[1].trim();
      if (emojiMatch) emoji = emojiMatch[1].trim();
    }

    // Read agent description from AGENTS.md
    let description = '';
    const agentsPath = path.join(agentPath, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
      const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
      
      // Try to find "Primary Focus" line (better description)
      const focusMatch = agentsContent.match(/\*\*Primary Focus:\*\*\s*(.+)/);
      if (focusMatch) {
        // Remove emoji from description
        description = focusMatch[1].trim().replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
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
              inIdentitySection = false; // Moved to a different section
            }
            continue;
          }
          
          // Skip lines in Identity section (bullet points with Name, Label, etc.)
          if (inIdentitySection) continue;
          
          // Skip markdown bullets/lists
          if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
          
          // Found a good description line - remove emoji
          description = trimmed.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
          break;
        }
      }
    }

    // Read memory
    let memorySize = 0;
    const memoryFiles: string[] = [];
    const memoryPath = path.join(agentPath, 'MEMORY.md');
    if (fs.existsSync(memoryPath)) {
      const stats = fs.statSync(memoryPath);
      memorySize += stats.size;
      memoryFiles.push('MEMORY.md');
    }

    // Read daily memory files
    const memoryDir = path.join(agentPath, 'memory');
    if (fs.existsSync(memoryDir)) {
      const dailyFiles = fs.readdirSync(memoryDir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse()
        .slice(0, 7); // Last 7 days
      
      for (const file of dailyFiles) {
        const filePath = path.join(memoryDir, file);
        const stats = fs.statSync(filePath);
        memorySize += stats.size;
        memoryFiles.push(`memory/${file}`);
      }
    }

    // Check if this is a specialized (Pro) agent
    const specializedAgents = ['martech-engineer', 'crm-engineer', 'seo-specialist'];
    const isPro = specializedAgents.includes(label);

    // Format memory size
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    const agent = {
      label,
      name,
      emoji,
      description,
      isPro,
      memory: {
        size: formatSize(memorySize),
        bytes: memorySize,
        files: memoryFiles
      },
      workspacePath: agentPath,
      // TODO: Get session data from OpenClaw sessions API
      status: 'idle',
      messageCount: 0,
      lastActive: 'never',
      model: null
    };

    return NextResponse.json({ agent });

  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent details' },
      { status: 500 }
    );
  }
}
