/**
 * Linear GraphQL client for the AI team
 */

import { readFileSync, existsSync } from 'fs';

// ─── Config ───────────────────────────────────────────────────────────────────

const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Team ID for the AI team
const AI_TEAM_ID = '097e59de-e354-4f3c-b8b2-02a09dd1d873';

// State IDs
export const LINEAR_STATES = {
  backlog: '85d8b76c-a393-42c2-b6b5-8d6e9bcbb2a3',
  todo: '6eacfb48-625c-4cec-b1a5-2f9cc7b585fa',
  inProgress: '2136e685-64aa-4ef8-a685-5ee397379212',
  inReview: '0ee2759b-edf9-469f-be48-5043fc9e4679',
  done: '5d79ddd3-00bf-403a-8025-b0ce0f039895',
  canceled: 'eae0da5f-b840-40a0-96c9-e1c45f030c57',
} as const;

// Label IDs
export const LINEAR_LABELS = {
  superclaw: '538ae5e5-a7b5-4576-b936-249a10abde2c',
  marketing: '581ea7ac-52df-4956-8c6e-ae2fa8219dca',
  platform: '66b57ac3-2443-4da1-9400-ccf2aa90cfc4',
  feature: '4218ab7d-b5fe-4ddd-8c50-8d5fef7b9e58',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinearIssue {
  id: string;
  identifier: string; // e.g. "AI-47"
  title: string;
  url: string;
  state: { name: string; type: string };
  priority: number;
  labels: { nodes: Array<{ name: string; color: string }> };
  createdAt: string;
}

interface LinearApiResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// ─── API Key ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  // Try environment variable first
  if (process.env.LINEAR_API_KEY) {
    return process.env.LINEAR_API_KEY;
  }

  // Read from credentials file
  const credPath = '/root/.openclaw/workspace/credentials/linear-api.json';
  if (existsSync(credPath)) {
    try {
      const creds = JSON.parse(readFileSync(credPath, 'utf8'));
      if (creds.api_key) {
        return creds.api_key;
      }
    } catch {
      // Fall through to error
    }
  }

  throw new Error('Linear API key not found. Set LINEAR_API_KEY env or create /root/.openclaw/workspace/credentials/linear-api.json');
}

// ─── GraphQL Client ───────────────────────────────────────────────────────────

async function linearRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API request failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json() as LinearApiResponse<T>;

  if (result.errors && result.errors.length > 0) {
    throw new Error(`Linear API error: ${result.errors.map(e => e.message).join(', ')}`);
  }

  if (!result.data) {
    throw new Error('Linear API returned no data');
  }

  return result.data;
}

// ─── Exported Functions ───────────────────────────────────────────────────────

/**
 * Fetch open AI-team issues (backlog + unstarted only)
 * NOT in progress, done, or canceled
 */
export async function getOpenLinearIssues(): Promise<LinearIssue[]> {
  const query = `
    query GetOpenIssues($teamId: String!, $stateIds: [String!]!) {
      issues(
        filter: {
          team: { id: { eq: $teamId } }
          state: { id: { in: $stateIds } }
        }
        first: 100
        orderBy: priority
      ) {
        nodes {
          id
          identifier
          title
          url
          state {
            name
            type
          }
          priority
          labels {
            nodes {
              name
              color
            }
          }
          createdAt
        }
      }
    }
  `;

  const variables = {
    teamId: AI_TEAM_ID,
    stateIds: [LINEAR_STATES.backlog, LINEAR_STATES.todo],
  };

  const data = await linearRequest<{ issues: { nodes: LinearIssue[] } }>(query, variables);
  return data.issues.nodes;
}

/**
 * Create a new issue in the AI team
 */
export async function createLinearIssue(params: {
  title: string;
  description?: string;
  priority?: number; // 0=none, 1=urgent, 2=high, 3=medium, 4=low
  labelIds?: string[];
  stateId?: string; // defaults to Backlog state
}): Promise<{ id: string; identifier: string; url: string }> {
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
    teamId: AI_TEAM_ID,
    title: params.title,
    stateId: params.stateId || LINEAR_STATES.backlog,
  };

  if (params.description) {
    input.description = params.description;
  }

  if (params.priority !== undefined) {
    input.priority = params.priority;
  }

  if (params.labelIds && params.labelIds.length > 0) {
    input.labelIds = params.labelIds;
  }

  const data = await linearRequest<{
    issueCreate: {
      success: boolean;
      issue: { id: string; identifier: string; url: string };
    };
  }>(query, { input });

  if (!data.issueCreate.success) {
    throw new Error('Failed to create Linear issue');
  }

  return data.issueCreate.issue;
}

/**
 * Update issue state (e.g. mark Done)
 */
export async function updateLinearIssueState(issueId: string, stateId: string): Promise<void> {
  const query = `
    mutation UpdateIssueState($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }
  `;

  const data = await linearRequest<{ issueUpdate: { success: boolean } }>(query, {
    id: issueId,
    stateId,
  });

  if (!data.issueUpdate.success) {
    throw new Error('Failed to update Linear issue state');
  }
}

/**
 * Map suggestion category to Linear label ID
 */
export function getCategoryLabelId(category: string): string {
  switch (category) {
    case 'marketing':
      return LINEAR_LABELS.marketing;
    case 'research':
      return LINEAR_LABELS.platform;
    default:
      return LINEAR_LABELS.superclaw;
  }
}

/**
 * Map suggestion priority (1-4) to Linear priority (1=urgent, 2=high, 3=medium, 4=low)
 */
export function mapPriorityToLinear(priority: number): number {
  // Both use same scale
  return Math.min(Math.max(priority, 1), 4);
}
