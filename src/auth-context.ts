import { AsyncLocalStorage } from 'node:async_hooks';

export type AuthOverride = {
  apiKey?: string;
  jwt?: string;
  workspaceId?: string;
  projectId?: string;
};

const authContext = new AsyncLocalStorage<AuthOverride | null>();

export function runWithAuthOverride<T>(
  override: AuthOverride | null,
  fn: () => Promise<T>
): Promise<T> {
  return authContext.run(override, fn);
}

export function getAuthOverride(): AuthOverride | null {
  return authContext.getStore() ?? null;
}
