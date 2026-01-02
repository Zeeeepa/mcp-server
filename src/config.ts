import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z.string().url(),
  apiKey: z.string().min(1).optional(),
  jwt: z.string().min(1).optional(),
  defaultWorkspaceId: z.string().uuid().optional(),
  defaultProjectId: z.string().uuid().optional(),
  userAgent: z.string().default('contextstream-mcp/0.1.0'),
  allowHeaderAuth: z.boolean().optional(),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const allowHeaderAuth =
    process.env.CONTEXTSTREAM_ALLOW_HEADER_AUTH === '1' ||
    process.env.CONTEXTSTREAM_ALLOW_HEADER_AUTH === 'true' ||
    process.env.CONTEXTSTREAM_ALLOW_HEADER_AUTH === 'yes';
  const parsed = configSchema.safeParse({
    apiUrl: process.env.CONTEXTSTREAM_API_URL,
    apiKey: process.env.CONTEXTSTREAM_API_KEY,
    jwt: process.env.CONTEXTSTREAM_JWT,
    defaultWorkspaceId: process.env.CONTEXTSTREAM_WORKSPACE_ID,
    defaultProjectId: process.env.CONTEXTSTREAM_PROJECT_ID,
    userAgent: process.env.CONTEXTSTREAM_USER_AGENT,
    allowHeaderAuth,
  });

  if (!parsed.success) {
    const missing = parsed.error.errors.map((e) => e.path.join('.')).join(', ');
    throw new Error(
      `Invalid configuration. Set CONTEXTSTREAM_API_URL (and API key or JWT). Missing/invalid: ${missing}`
    );
  }

  if (!parsed.data.apiKey && !parsed.data.jwt && !parsed.data.allowHeaderAuth) {
    throw new Error('Set CONTEXTSTREAM_API_KEY or CONTEXTSTREAM_JWT for authentication (or CONTEXTSTREAM_ALLOW_HEADER_AUTH=true for header-based auth).');
  }

  return parsed.data;
}
