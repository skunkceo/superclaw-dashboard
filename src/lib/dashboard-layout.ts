export type WidgetSize = 'full' | 'half';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  defaultOrder: number;
  defaultSize: WidgetSize;
}

export interface WidgetLayout {
  id: string;
  enabled: boolean;
  order: number;
  size: WidgetSize;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  { id: 'health', name: 'Status Bar', description: 'Gateway health and model info', defaultEnabled: true, defaultOrder: 0, defaultSize: 'full' },
  { id: 'files', name: 'File Shortcuts', description: 'Quick links to key workspace files', defaultEnabled: true, defaultOrder: 1, defaultSize: 'full' },
  { id: 'proactivity', name: 'Proactivity', description: 'Overnight tasks and intel feed', defaultEnabled: true, defaultOrder: 2, defaultSize: 'half' },
  { id: 'token-usage', name: 'Token Usage', description: 'API usage and cost tracking', defaultEnabled: true, defaultOrder: 3, defaultSize: 'half' },
  { id: 'work-log', name: 'Work Log', description: 'Recent agent activity log', defaultEnabled: true, defaultOrder: 4, defaultSize: 'half' },
  { id: 'skills', name: 'Skills', description: 'Enabled capabilities', defaultEnabled: true, defaultOrder: 5, defaultSize: 'half' },
];

const STORAGE_KEY = 'superclaw-dashboard-layout';

export function loadLayout(): WidgetLayout[] {
  const defaults = WIDGET_REGISTRY.map(w => ({ id: w.id, enabled: w.defaultEnabled, order: w.defaultOrder, size: w.defaultSize }));
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WidgetLayout[];
      // Merge: add any new widgets from registry that aren't stored yet
      const merged = defaults.map(d => parsed.find(p => p.id === d.id) ?? d);
      return merged;
    }
  } catch {}
  return defaults;
}

export function saveLayout(layout: WidgetLayout[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {}
}

export function resetLayout(): WidgetLayout[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return WIDGET_REGISTRY.map(w => ({ id: w.id, enabled: w.defaultEnabled, order: w.defaultOrder, size: w.defaultSize }));
}
