import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ContextStreamClient } from './client.js';

function wrapText(uri: string, text: string) {
  return { contents: [{ uri, text }] };
}

function wrapResource(resource: { uri: string; name: string; title?: string; description?: string; mimeType?: string }) {
  return { resources: [resource] };
}

function extractItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const direct = (payload as Record<string, unknown>).items;
  if (Array.isArray(direct)) return direct as T[];
  const nested = (payload as Record<string, unknown>).data;
  if (nested && typeof nested === 'object') {
    const nestedItems = (nested as Record<string, unknown>).items;
    if (Array.isArray(nestedItems)) return nestedItems as T[];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
}

export function registerResources(server: McpServer, client: ContextStreamClient, apiUrl: string) {
  // OpenAPI resource
  server.registerResource(
    'contextstream-openapi',
    new ResourceTemplate('contextstream:openapi', {
      list: () => wrapResource({
        uri: 'contextstream:openapi',
        name: 'contextstream-openapi',
        title: 'ContextStream OpenAPI',
        description: 'Machine-readable OpenAPI from the configured API endpoint',
        mimeType: 'application/json',
      }),
    }),
    {
      title: 'ContextStream OpenAPI spec',
      description: 'Machine-readable OpenAPI from the configured API endpoint',
      mimeType: 'application/json',
    },
    async () => {
      const uri = `${apiUrl.replace(/\/$/, '')}/api-docs/openapi.json`;
      const res = await fetch(uri);
      const text = await res.text();
      return wrapText('contextstream:openapi', text);
    }
  );

  // Workspaces list resource
  server.registerResource(
    'contextstream-workspaces',
    new ResourceTemplate('contextstream:workspaces', {
      list: () => wrapResource({
        uri: 'contextstream:workspaces',
        name: 'contextstream-workspaces',
        title: 'Workspaces',
        description: 'List of accessible workspaces',
        mimeType: 'application/json',
      }),
    }),
    { title: 'Workspaces', description: 'List of accessible workspaces' },
    async () => {
      const data = await client.listWorkspaces();
      return wrapText('contextstream:workspaces', JSON.stringify(data, null, 2));
    }
  );

  // Projects by workspace resource template
  server.registerResource(
    'contextstream-projects',
    new ResourceTemplate('contextstream:projects/{workspaceId}', {
      list: async () => {
        try {
          const workspaces = await client.listWorkspaces({ page_size: 50 });
          const items = extractItems<{ id: string; name?: string }>(workspaces);
          return {
            resources: items.map((workspace) => ({
              uri: `contextstream:projects/${workspace.id}`,
              name: `contextstream-projects-${workspace.id}`,
              title: workspace.name ? `Projects in ${workspace.name}` : 'Projects in workspace',
              description: 'Projects in the specified workspace',
              mimeType: 'application/json',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
      complete: {
        workspaceId: async () => {
          try {
            const workspaces = await client.listWorkspaces({ page_size: 50 });
            const items = extractItems<{ id: string }>(workspaces);
            return items.map((workspace) => workspace.id);
          } catch {
            return [];
          }
        },
      },
    }),
    { title: 'Projects for workspace', description: 'Projects in the specified workspace' },
    async (uri: URL, { workspaceId }: { workspaceId: string | string[] }) => {
      const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
      const data = await client.listProjects({ workspace_id: wsId });
      return wrapText(uri.href, JSON.stringify(data, null, 2));
    }
  );
}
