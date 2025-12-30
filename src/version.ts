import { createRequire } from 'module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export function getVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json') as { version?: string } | undefined;
    const version = pkg?.version;
    if (typeof version === 'string' && version.trim()) return version.trim();
  } catch {
    // ignore
  }
  return 'unknown';
}

export const VERSION = getVersion();

/**
 * Compare two semver version strings.
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
}

interface VersionCache {
  latestVersion: string;
  checkedAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheFilePath(): string {
  return join(homedir(), '.contextstream', 'version-cache.json');
}

function readCache(): VersionCache | null {
  try {
    const cacheFile = getCacheFilePath();
    if (!existsSync(cacheFile)) return null;
    const data = JSON.parse(readFileSync(cacheFile, 'utf-8')) as VersionCache;
    // Check if cache is expired
    if (Date.now() - data.checkedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(latestVersion: string): void {
  try {
    const configDir = join(homedir(), '.contextstream');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    const cacheFile = getCacheFilePath();
    writeFileSync(cacheFile, JSON.stringify({
      latestVersion,
      checkedAt: Date.now(),
    }));
  } catch {
    // ignore cache write errors
  }
}

/**
 * Check npm registry for the latest version and compare against current.
 * Shows a warning to stderr if a newer version is available.
 * Uses a 24-hour cache to avoid hitting npm on every startup.
 */
export async function checkForUpdates(): Promise<void> {
  const currentVersion = VERSION;
  if (currentVersion === 'unknown') return;

  try {
    // Check cache first
    const cached = readCache();
    if (cached) {
      if (compareVersions(currentVersion, cached.latestVersion) < 0) {
        showUpdateWarning(currentVersion, cached.latestVersion);
      }
      return;
    }

    // Fetch latest version from npm registry
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('https://registry.npmjs.org/@contextstream/mcp-server/latest', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = await response.json() as { version?: string };
    const latestVersion = data.version;

    if (typeof latestVersion !== 'string') return;

    // Cache the result
    writeCache(latestVersion);

    // Compare versions
    if (compareVersions(currentVersion, latestVersion) < 0) {
      showUpdateWarning(currentVersion, latestVersion);
    }
  } catch {
    // Silently ignore network errors - don't block startup
  }
}

function showUpdateWarning(currentVersion: string, latestVersion: string): void {
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`⚠️  Update available: v${currentVersion} → v${latestVersion}`);
  console.error('');
  console.error('   Run: npm update -g @contextstream/mcp-server');
  console.error('');
  console.error('   Then restart your AI tool to use the new version.');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
}
