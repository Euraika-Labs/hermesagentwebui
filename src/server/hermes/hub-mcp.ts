import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { getEffectiveHome } from '@/server/hermes/paths';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpHubServer {
  id: string;
  name: string;
  title: string;
  description: string;
  author: string;
  transport: 'stdio' | 'http';
  version: string;
  repository?: string;
  websiteUrl?: string;
  installCommand?: string;
  npmPackage?: string;
  category: string;
  verified: boolean;
  requiredEnv?: Array<{ name: string; description?: string }>;
  tools: string[];
  icons?: { light?: string; dark?: string };
}

export type McpHubSearchResult = {
  servers: McpHubServer[];
  total: number;
  filtered: number;
};

// ---------------------------------------------------------------------------
// Registry types (raw API shapes)
// ---------------------------------------------------------------------------

type RegistryPackage = {
  registryType?: string;
  identifier?: string;
  version?: string;
  transport?: { type?: string; url?: string };
  environmentVariables?: Array<{
    name?: string;
    description?: string;
    isRequired?: boolean;
    isSecret?: boolean;
  }>;
};

type RegistryServer = {
  server?: {
    name?: string;
    title?: string;
    description?: string;
    repository?: { url?: string; source?: string };
    websiteUrl?: string;
    version?: string;
    remotes?: Array<{ type?: string; url?: string }>;
    packages?: RegistryPackage[];
    tools?: Array<{ name?: string }>;
    tags?: string[];
    categories?: string[];
    icons?: Array<{ src?: string }>;
  };
  _meta?: {
    'io.modelcontextprotocol.registry/official'?: {
      isLatest?: boolean;
      status?: string;
      publishedAt?: string;
      updatedAt?: string;
    };
  };
};

type RegistryResponse = {
  servers?: RegistryServer[];
  metadata?: { nextCursor?: string | null; total?: number };
};

// ---------------------------------------------------------------------------
// Cache paths
// ---------------------------------------------------------------------------

const CACHE_DIR = () => path.join(getEffectiveHome(), '.mcp-hub-cache');
const CACHE_FILE = () => path.join(CACHE_DIR(), 'servers.json');
const SYNC_STATE_FILE = () => path.join(CACHE_DIR(), 'sync-state.json');

// ---------------------------------------------------------------------------
// Fuse.js singleton
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __hermesMcpHubFuse: Fuse<McpHubServer> | undefined;
  // eslint-disable-next-line no-var
  var __hermesMcpHubFuseMtime: number | undefined;
  // eslint-disable-next-line no-var
  var __hermesMcpHubSyncTimer: ReturnType<typeof setInterval> | undefined;
}

const FUSE_OPTIONS: IFuseOptions<McpHubServer> = {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'title', weight: 0.35 },
    { name: 'description', weight: 0.25 },
  ],
  threshold: 0.4,
  includeScore: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR(), { recursive: true });
}

async function readCacheFile(): Promise<McpHubServer[]> {
  try {
    const raw = await fs.readFile(CACHE_FILE(), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCacheFile(servers: McpHubServer[]): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE(), JSON.stringify(servers, null, 2), 'utf-8');
}

async function readSyncState(): Promise<{ lastSync?: string }> {
  try {
    const raw = await fs.readFile(SYNC_STATE_FILE(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeSyncState(state: { lastSync: string }): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(SYNC_STATE_FILE(), JSON.stringify(state), 'utf-8');
}

function deriveInstallCommand(packages?: RegistryPackage[]): {
  installCommand?: string;
  npmPackage?: string;
  requiredEnv?: Array<{ name: string; description?: string }>;
} {
  if (!packages?.length) return {};
  for (const pkg of packages) {
    const name = pkg.identifier;
    const registryType = pkg.registryType?.toLowerCase();
    if (!name) continue;
    const requiredEnv = (pkg.environmentVariables || [])
      .filter((variable) => variable?.name && variable.isRequired)
      .map((variable) => ({
        name: String(variable.name),
        description: variable.description,
      }));

    if (registryType === 'npm' && pkg.transport?.type === 'stdio') {
      return { installCommand: `npx -y ${name}`, npmPackage: name, requiredEnv };
    }
    if (registryType === 'pypi' && pkg.transport?.type === 'stdio') {
      return { installCommand: `uvx ${name}`, requiredEnv };
    }
    if (registryType === 'docker' && pkg.transport?.type === 'stdio') {
      return { installCommand: `docker run -i --rm ${name}`, requiredEnv };
    }
  }
  return {};
}

function mapRegistryServer(raw: RegistryServer): McpHubServer {
  const server = raw.server || {};
  const officialMeta = raw._meta?.['io.modelcontextprotocol.registry/official'];
  const { installCommand, npmPackage, requiredEnv } = deriveInstallCommand(server.packages);
  const remoteTypes = (server.remotes || []).map((remote) => remote.type || '');
  const packageTransports = (server.packages || []).map((pkg) => pkg.transport?.type || '');
  const transport = packageTransports.includes('stdio')
    ? 'stdio'
    : remoteTypes.includes('http') || remoteTypes.includes('streamable-http') || remoteTypes.includes('sse')
      ? 'http'
      : 'stdio';
  const primaryIcon = server.icons?.find((icon) => icon.src)?.src;

  return {
    id: server.name || '',
    name: server.name || '',
    title: server.title || server.name || '',
    description: server.description || '',
    author: server.repository?.source || '',
    transport: transport as 'stdio' | 'http',
    version: server.version || server.packages?.[0]?.version || '0.0.0',
    repository: server.repository?.url,
    websiteUrl: server.websiteUrl,
    installCommand,
    npmPackage,
    category: server.categories?.[0] || server.tags?.[0] || 'uncategorized',
    verified: officialMeta?.status === 'active',
    requiredEnv,
    tools: (server.tools || []).map((t) => t.name || '').filter(Boolean),
    icons: primaryIcon ? { light: primaryIcon, dark: primaryIcon } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Registry fetch with cursor pagination
// ---------------------------------------------------------------------------

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io/v0.1/servers';

async function fetchRegistryPage(cursor?: string, updatedSince?: string): Promise<RegistryResponse> {
  const url = new URL(REGISTRY_BASE);
  url.searchParams.set('limit', '100');
  if (cursor) url.searchParams.set('cursor', cursor);
  if (updatedSince) url.searchParams.set('updated_since', updatedSince);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Registry responded ${res.status}`);
  return (await res.json()) as RegistryResponse;
}

async function fetchAllServers(updatedSince?: string): Promise<RegistryServer[]> {
  const all: RegistryServer[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchRegistryPage(cursor, updatedSince);
    const servers = page.servers || [];
    // Filter to latest & active entries
    const filtered = servers.filter(
      (s) => {
        const official = s._meta?.['io.modelcontextprotocol.registry/official'];
        return (official?.isLatest ?? true) && (official?.status ?? 'active') === 'active';
      },
    );
    all.push(...filtered);
    cursor = page.metadata?.nextCursor ?? undefined;
  } while (cursor);

  return all;
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

let syncInProgress = false;

async function syncRegistry(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const syncState = await readSyncState();
    const existingServers = await readCacheFile();
    const existingById = new Map(existingServers.map((s) => [s.id, s]));

    const rawServers = await fetchAllServers(syncState.lastSync);
    const now = new Date().toISOString();

    if (rawServers.length === 0 && existingServers.length > 0) {
      // No updates since last sync — just update the timestamp
      await writeSyncState({ lastSync: now });
      return;
    }

    // Merge: update existing + add new
    for (const raw of rawServers) {
      const mapped = mapRegistryServer(raw);
      if (mapped.id) existingById.set(mapped.id, mapped);
    }

    const merged = Array.from(existingById.values());
    await writeCacheFile(merged);
    await writeSyncState({ lastSync: now });
  } catch {
    // Silently fail — we'll retry on the next interval
  } finally {
    syncInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Fuse index management
// ---------------------------------------------------------------------------

async function getFuseIndex(servers: McpHubServer[]): Promise<Fuse<McpHubServer>> {
  let mtime = 0;
  try {
    const stat = await fs.stat(CACHE_FILE());
    mtime = stat.mtimeMs;
  } catch {
    // File doesn't exist yet
  }

  if (globalThis.__hermesMcpHubFuse && globalThis.__hermesMcpHubFuseMtime === mtime) {
    return globalThis.__hermesMcpHubFuse;
  }

  const index = new Fuse(servers, FUSE_OPTIONS);
  globalThis.__hermesMcpHubFuse = index;
  globalThis.__hermesMcpHubFuseMtime = mtime;
  return index;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all cached MCP hub servers.
 */
export async function listHubMcpServers(): Promise<McpHubServer[]> {
  let servers = await readCacheFile();
  if (servers.length === 0) {
    await syncRegistry();
    servers = await readCacheFile();
  }
  return servers;
}

/**
 * Fuse.js search across name/title/description.
 */
export async function searchHubMcpServers(query: string): Promise<McpHubSearchResult> {
  const servers = await listHubMcpServers();
  if (!query.trim()) {
    return { servers, total: servers.length, filtered: servers.length };
  }

  const fuse = await getFuseIndex(servers);
  const results = fuse.search(query);
  const matched = results.map((r) => r.item);
  return { servers: matched, total: servers.length, filtered: matched.length };
}

/**
 * Install an MCP server by identifier.
 * Derives the shell command from the server's installCommand or npmPackage.
 */
export async function installHubMcpServer(
  identifier: string,
  config: { env?: Record<string, string> } = {},
): Promise<{ success: boolean; error?: string }> {
  const servers = await readCacheFile();
  const server = servers.find((s) => s.id === identifier || s.name === identifier);

  if (!server?.installCommand) {
    return { success: false, error: `No install command found for "${identifier}"` };
  }

  const [cmd, ...args] = server.installCommand.split(/\s+/);
  if (!cmd) return { success: false, error: 'Empty install command' };

  try {
    await execFileAsync(cmd, args, {
      timeout: 30_000,
      env: { ...process.env, ...config.env },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Manually trigger a registry sync.
 */
export async function refreshMcpHubCache(): Promise<{ success: boolean; count: number }> {
  await syncRegistry();
  const servers = await readCacheFile();
  return { success: true, count: servers.length };
}

// ---------------------------------------------------------------------------
// Background sync — starts on first import, runs every 6 hours
// ---------------------------------------------------------------------------

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

if (!globalThis.__hermesMcpHubSyncTimer) {
  // Fire initial sync after a short delay so module load isn't blocked
  setTimeout(() => syncRegistry(), 5_000);
  globalThis.__hermesMcpHubSyncTimer = setInterval(() => syncRegistry(), SIX_HOURS_MS);
  // Allow the process to exit even if the timer is still running
  if (globalThis.__hermesMcpHubSyncTimer.unref) {
    globalThis.__hermesMcpHubSyncTimer.unref();
  }
}
