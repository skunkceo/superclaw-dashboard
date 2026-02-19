/**
 * Linear GraphQL client for Superclaw.
 * Reads API key from /root/.openclaw/workspace/credentials/linear-api.json
 */

import { readFileSync, existsSync } from 'fs';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

// State IDs for Skunk Global workspace
export const LINEAR_STATES = {
  backlog: '5a1c2e3d-4f5b-6c7a-8b9d-0e1f2a3b4c5d', // Placeholder - will be fetched
  todo: '6b2d3f4e-5g6c-7d8b-9c0e-1f2g3h4i5j6k',
  inProgress: '7c3e4g5f-6h7d-8e9c-0d1f-2g3h4i5j6k7l',
  done: '8d4f5h6g-7i8e-9f0d-1e2g-3h4i5j6k7l8m',
};

// Label IDs for categorization
export const LINEAR_LABELS = {
  proactivity: 'proactivity-auto',
  content: 'content',
  seo: 'seo',
  research: 'research',
  marketing: 'marketing',
  product: 'product',
  code: 'code',
};

interface LinearConfig {
  apiKey: string;
  teamId: string;
  projectId?: string;
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: { id: string; name: string };
  priority: number;
  labels: { nodes: Array<{ id: string; name: string }> };
  createdAt: string;
}

interface LinearCreateIssueResponse {
  issueCreate: {
    success: boolean;
    issue?: LinearIssue;
  };
}

interface LinearIssuesResponse {
  team: {
    issues: {
      nodes: LinearIssue[];
    };
  };
}

function getLinearConfig(): LinearConfig | null {
  const credPath = '/root/.openclaw/workspace/credentials/linear-api.json';
  if (!existsSync(credPath)) {
    console.error('Linear credentials not found at', credPath);
    return null;
  }
  try {
    const cred = JSON.parse(readFileSync(credPath, 'utf8'));
    return {
      apiKey: cred.apiKey || cred.api_key,
      teamId: cred.teamId || cred.team_id,
      projectId: cred.projectId || cred.project_id,
    };
  } catch (err) {
    console.error('Failed to parse Linear credentials:', err);
    return null;
  }
}

async function linearQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  const config = getLinearConfig();
  if (!config) return null;

  try {
    const res = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      console.error('Linear API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.errors) {
      console.error('Linear GraphQL errors:', data.errors);
      return null;
    }

    return data.data as T;
  } catch (err) {
    console.error('Linear request failed:', err);
    return null;
  }
}

export async function getOpenLinearIssues(): Promise<LinearIssue[]> {
  const config = getLinearConfig();
  if (!config) return [];

  const query = `
    query TeamIssues($teamId: String!) {
      team(id: $teamId) {
        issues(
          filter: {
            state: { type: { nin: ["completed", "canceled"] } }
          }
          first: 50
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            state { id name }
            labels { nodes { id name } }
            createdAt
          }
        }
      }
    }
  `;

  const result = await linearQuery<LinearIssuesResponse>(query, { teamId: config.teamId });
  return result?.team?.issues?.nodes || [];
}

export async function createLinearIssue(params: {
  title: string;
  description?: string;
  priority?: number;
  labelIds?: string[];
  stateId?: string;
}): Promise<{ id: string; identifier: string; url: string } | null> {
  const config = getLinearConfig();
  if (!config) return null;

  const query = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
  `;

  const input: Record<string, unknown> = {
    teamId: config.teamId,
    title: params.title,
    description: params.description || '',
    priority: params.priority ?? 3,
  };

  if (config.projectId) {
    input.projectId = config.projectId;
  }
  if (params.labelIds && params.labelIds.length > 0) {
    input.labelIds = params.labelIds;
  }
  if (params.stateId) {
    input.stateId = params.stateId;
  }

  const result = await linearQuery<LinearCreateIssueResponse>(query, { input });
  if (result?.issueCreate?.success && result.issueCreate.issue) {
    const issue = result.issueCreate.issue;
    return { id: issue.id, identifier: issue.identifier, url: issue.url };
  }
  return null;
}

export async function updateLinearIssueState(issueId: string, stateId: string): Promise<boolean> {
  const query = `
    mutation UpdateIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }
  `;

  const result = await linearQuery<{ issueUpdate: { success: boolean } }>(query, { id: issueId, stateId });
  return result?.issueUpdate?.success ?? false;
}

// Helper to get label ID by category
export async function getCategoryLabelId(category: string): Promise<string | null> {
  const config = getLinearConfig();
  if (!config) return null;

  const query = `
    query TeamLabels($teamId: String!) {
      team(id: $teamId) {
        labels {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  const result = await linearQuery<{ team: { labels: { nodes: Array<{ id: string; name: string }> } } }>(query, { teamId: config.teamId });
  const labels = result?.team?.labels?.nodes || [];
  const label = labels.find((l: { id: string; name: string }) => l.name.toLowerCase() === category.toLowerCase());
  return label?.id || null;
}

// Map suggestion priority (1-4) to Linear priority (0-4, where 0=none, 1=urgent, 4=low)
export function mapPriorityToLinear(sugPriority: number): number {
  // Suggestion priority: 1=highest, 4=lowest
  // Linear priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low
  if (sugPriority === 1) return 1; // urgent
  if (sugPriority === 2) return 2; // high
  if (sugPriority === 3) return 3; // medium
  return 4; // low
}
