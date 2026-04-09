import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getEffectiveHome, getHermesHome } from '@/server/hermes/paths';

const execFileAsync = promisify(execFile);

export type HubSkill = {
  id: string;
  name: string;
  description: string;
  source: string;
  identifier: string;
  trustLevel: string;
  repo: string;
  skillPath: string;
  tags: string[];
  installs?: number;
  detailUrl?: string;
  repoUrl?: string;
  /** Extra detail fetched from skills.sh */
  detail?: {
    title: string;
    summary: string;
    weeklyInstalls: string;
    installCommand: string;
    securityAudits?: Record<string, string>;
  };
};

const HUB_CACHE_DIR = () => path.join(getEffectiveHome(), 'skills', '.hub', 'index-cache');

function readCacheFile<T>(filename: string): T | null {
  const filePath = path.join(HUB_CACHE_DIR(), filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    // Empty arrays (from failed cache) return null
    if (Array.isArray(parsed) && parsed.length === 0) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

type RawHubEntry = {
  name: string;
  description: string;
  source: string;
  identifier: string;
  trust_level: string;
  repo: string;
  path: string;
  tags: string[];
  extra?: {
    installs?: number;
    detail_url?: string;
    repo_url?: string;
  };
};

function mapEntry(entry: RawHubEntry): HubSkill {
  return {
    id: entry.identifier,
    name: entry.name,
    description: entry.description,
    source: entry.source,
    identifier: entry.identifier,
    trustLevel: entry.trust_level,
    repo: entry.repo,
    skillPath: entry.path,
    tags: entry.tags ?? [],
    installs: entry.extra?.installs,
    detailUrl: entry.extra?.detail_url,
    repoUrl: entry.extra?.repo_url,
  };
}

/**
 * Load featured skills from the local cache (populated by `hermes skills browse`).
 */
export function loadFeaturedSkills(): HubSkill[] {
  const featured = readCacheFile<RawHubEntry[]>('skills_sh_featured.json');
  if (!featured) return [];
  return featured.map(mapEntry);
}

/**
 * Load ALL cached browse/search results from the hub index cache.
 * Reads any JSON file that contains an array of RawHubEntry objects,
 * including skills_sh_search_*, repo indexes (garrytan, anthropics, etc.),
 * and other cache files produced by `hermes skills browse`.
 */
export function loadCachedSearchResults(): HubSkill[] {
  const cacheDir = HUB_CACHE_DIR();
  if (!fs.existsSync(cacheDir)) return [];
  const seen = new Set<string>();
  const results: HubSkill[] = [];

  for (const file of fs.readdirSync(cacheDir)) {
    if (!file.endsWith('.json')) continue;
    // Skip featured (handled separately) and detail files
    if (file === 'skills_sh_featured.json') continue;
    if (file.startsWith('skills_sh_detail_')) continue;
    const entries = readCacheFile<RawHubEntry[]>(file);
    if (!entries || !Array.isArray(entries)) continue;
    for (const entry of entries) {
      // Validate it looks like a RawHubEntry (has identifier field)
      if (!entry?.identifier || !entry?.name) continue;
      if (seen.has(entry.identifier)) continue;
      seen.add(entry.identifier);
      results.push(mapEntry(entry));
    }
  }
  return results;
}

/**
 * Load cached detail pages.
 */
export function loadCachedDetails(): Map<string, HubSkill['detail']> {
  const cacheDir = HUB_CACHE_DIR();
  if (!fs.existsSync(cacheDir)) return new Map();
  const details = new Map<string, HubSkill['detail']>();

  for (const file of fs.readdirSync(cacheDir)) {
    if (!file.startsWith('skills_sh_detail_') || !file.endsWith('.json')) continue;
    type RawDetail = {
      install_skill?: string;
      page_title?: string;
      body_title?: string;
      body_summary?: string;
      weekly_installs?: string;
      install_command?: string;
      repo?: string;
      detail_url?: string;
      security_audits?: Record<string, string>;
    };
    const raw = readCacheFile<RawDetail>(file);
    if (!raw?.install_skill) continue;
    details.set(raw.install_skill, {
      title: raw.body_title ?? raw.page_title ?? '',
      summary: raw.body_summary ?? '',
      weeklyInstalls: raw.weekly_installs ?? '0',
      installCommand: raw.install_command ?? '',
      securityAudits: raw.security_audits,
    });
  }
  return details;
}

/**
 * Combine all sources into a single deduplicated hub skill list.
 * Merges featured + search results + detail data.
 */
export function listHubSkills(): HubSkill[] {
  const byId = new Map<string, HubSkill>();

  // Featured first (higher priority display)
  for (const skill of loadFeaturedSkills()) {
    byId.set(skill.id, skill);
  }

  // Search results fill in extras
  for (const skill of loadCachedSearchResults()) {
    if (!byId.has(skill.id)) {
      byId.set(skill.id, skill);
    } else {
      // Merge install count if the cached one has it
      const existing = byId.get(skill.id)!;
      if (!existing.installs && skill.installs) existing.installs = skill.installs;
      if (!existing.detailUrl && skill.detailUrl) existing.detailUrl = skill.detailUrl;
      if (!existing.repoUrl && skill.repoUrl) existing.repoUrl = skill.repoUrl;
    }
  }

  // Merge detail data
  const details = loadCachedDetails();
  for (const [name, detail] of details) {
    // Match by skill name (detail keys are just the skill name, not the full identifier)
    for (const [, skill] of byId) {
      if (skill.name === name && !skill.detail) {
        skill.detail = detail;
        // Also improve description if we have a real summary
        if (detail?.summary && (skill.description.startsWith('Featured on') || skill.description.startsWith('Indexed by'))) {
          skill.description = detail.summary;
        }
        break;
      }
    }
  }

  return Array.from(byId.values());
}

/**
 * Search skills.sh via the hermes CLI. Returns results from the live search.
 */
export async function searchHubSkills(query: string, source = 'skills-sh', limit = 20): Promise<HubSkill[]> {
  try {
    await execFileAsync('hermes', ['skills', 'search', query, '--source', source, '--limit', String(limit)], {
      encoding: 'utf-8',
      timeout: 15000,
    });
    // The CLI writes to cache but outputs human-readable text.
    // After the call, re-read cached results which now include the fresh search.
    return loadCachedSearchResults();
  } catch {
    // Fallback to cached data
    return loadCachedSearchResults();
  }
}

/**
 * Install a skill from the hub via hermes CLI.
 */
export async function installHubSkill(identifier: string, category?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const args = ['skills', 'install', identifier, '--yes'];
    if (category) args.push('--category', category);
    // Override HERMES_HOME to the root (~/.hermes) so skills install to the
    // global dir and survive profile resets.
    const env = { ...process.env, HERMES_HOME: getHermesHome() };
    await execFileAsync('hermes', args, {
      encoding: 'utf-8',
      timeout: 30000,
      env,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Uninstall a hub-installed skill.
 */
export async function uninstallHubSkill(identifier: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execFileAsync('hermes', ['skills', 'uninstall', identifier], {
      encoding: 'utf-8',
      timeout: 15000,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
