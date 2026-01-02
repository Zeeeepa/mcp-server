import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

import { loadConfig } from './config.js';
import { ContextStreamClient } from './client.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { SessionManager } from './session-manager.js';
import { VERSION } from './version.js';
import { runWithAuthOverride, type AuthOverride } from './auth-context.js';

type SessionEntry = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  sessionManager: SessionManager;
  client: ContextStreamClient;
  authOverride: AuthOverride | null;
  createdAt: number;
  lastSeenAt: number;
};

const HOST = process.env.MCP_HTTP_HOST || '0.0.0.0';
const PORT = Number.parseInt(process.env.MCP_HTTP_PORT || '8787', 10);
const MCP_PATH = process.env.MCP_HTTP_PATH || '/mcp';
const REQUIRE_AUTH = (process.env.MCP_HTTP_REQUIRE_AUTH || 'true').toLowerCase() !== 'false';
const ENABLE_JSON_RESPONSE = (process.env.MCP_HTTP_JSON_RESPONSE || 'false').toLowerCase() === 'true';

const sessions = new Map<string, SessionEntry>();

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function extractAuthOverride(req: IncomingMessage, fallback: AuthOverride | null): { override: AuthOverride | null; tokenType?: 'api_key' | 'jwt' } {
  const apiKey = normalizeHeaderValue(req.headers['x-api-key']) ||
    normalizeHeaderValue(req.headers['x-contextstream-api-key']);
  const jwtHeader = normalizeHeaderValue(req.headers['x-contextstream-jwt']);
  const authHeader = normalizeHeaderValue(req.headers['authorization']);

  let token: string | undefined;
  if (authHeader) {
    const [type, ...rest] = authHeader.split(' ');
    if (type && type.toLowerCase() === 'bearer' && rest.length > 0) {
      token = rest.join(' ').trim();
    }
  }

  const workspaceId = normalizeHeaderValue(req.headers['x-contextstream-workspace-id']) ||
    normalizeHeaderValue(req.headers['x-workspace-id']);
  const projectId = normalizeHeaderValue(req.headers['x-contextstream-project-id']) ||
    normalizeHeaderValue(req.headers['x-project-id']);

  if (jwtHeader) {
    return { override: { jwt: jwtHeader, workspaceId, projectId }, tokenType: 'jwt' };
  }

  if (apiKey) {
    return { override: { apiKey, workspaceId, projectId }, tokenType: 'api_key' };
  }

  if (token) {
    if (looksLikeJwt(token)) {
      return { override: { jwt: token, workspaceId, projectId }, tokenType: 'jwt' };
    }
    return { override: { apiKey: token, workspaceId, projectId }, tokenType: 'api_key' };
  }

  if (workspaceId || projectId) {
    return { override: { workspaceId, projectId }, tokenType: undefined };
  }

  return { override: fallback, tokenType: undefined };
}

function attachAuthInfo(req: IncomingMessage & { auth?: AuthInfo }, token: string, tokenType: 'api_key' | 'jwt') {
  req.auth = {
    token,
    clientId: 'contextstream-mcp-http',
    scopes: [],
    extra: { tokenType },
  };
}

async function createSession(): Promise<SessionEntry> {
  const config = loadConfig();
  const client = new ContextStreamClient(config);
  const server = new McpServer({
    name: 'contextstream-mcp',
    version: VERSION,
  });

  const sessionManager = new SessionManager(server, client);
  registerTools(server, client, sessionManager);
  registerResources(server, client, config.apiUrl);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: ENABLE_JSON_RESPONSE,
    onsessionclosed: (sessionId) => {
      sessions.delete(sessionId);
    },
  });

  await server.connect(transport);

  const now = Date.now();
  return {
    server,
    transport,
    sessionManager,
    client,
    authOverride: null,
    createdAt: now,
    lastSeenAt: now,
  };
}

function writeJson(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function handleMcpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = normalizeHeaderValue(req.headers['mcp-session-id']);
  const existingSession = sessionId ? sessions.get(sessionId) : undefined;

  const { override, tokenType } = extractAuthOverride(req, existingSession?.authOverride ?? null);
  const token = override?.jwt || override?.apiKey;

  if (REQUIRE_AUTH && !token) {
    writeJson(res, 401, { error: 'Missing authorization token. Use Authorization: Bearer <API_KEY> or X-API-Key.' });
    return;
  }

  if (sessionId && !existingSession) {
    writeJson(res, 404, { error: 'Unknown MCP session. Re-initialize your MCP connection.' });
    return;
  }

  let entry = existingSession;
  if (!entry) {
    entry = await createSession();
  }

  entry.lastSeenAt = Date.now();
  if (override) {
    entry.authOverride = override;
  }
  if (token && tokenType) {
    attachAuthInfo(req as IncomingMessage & { auth?: AuthInfo }, token, tokenType);
  }

  await runWithAuthOverride(override ?? null, async () => {
    await entry!.transport.handleRequest(req as IncomingMessage & { auth?: AuthInfo }, res);
  });

  const newSessionId = entry.transport.sessionId;
  if (!existingSession && newSessionId) {
    sessions.set(newSessionId, entry);
  }
}

export async function runHttpGateway(): Promise<void> {
  const config = loadConfig();
  console.error(`[ContextStream] MCP HTTP gateway v${VERSION} starting...`);
  console.error(`[ContextStream] API URL: ${config.apiUrl}`);
  console.error(`[ContextStream] Auth: ${config.apiKey ? 'API Key' : config.jwt ? 'JWT' : 'Header-based'}`);
  console.error(`[ContextStream] MCP endpoint: http://${HOST}:${PORT}${MCP_PATH}`);

  const server = createServer(async (req, res) => {
    if (!req.url) {
      writeJson(res, 404, { error: 'Not found' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health') {
      writeJson(res, 200, { status: 'ok', version: VERSION });
      return;
    }

    if (url.pathname !== MCP_PATH) {
      writeJson(res, 404, { error: 'Not found' });
      return;
    }

    if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
      writeJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      await handleMcpRequest(req, res);
    } catch (error: any) {
      writeJson(res, 500, { error: error?.message || 'Internal server error' });
    }
  });

  server.listen(PORT, HOST, () => {
    console.error(`[ContextStream] MCP HTTP gateway listening on http://${HOST}:${PORT}${MCP_PATH}`);
  });
}
