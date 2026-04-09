import { execFile as execFileCb } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { parse, parseDocument } from 'yaml';
import type { Plugin } from '@/lib/types/plugin';
import { getEffectiveHome, getHermesHome } from '@/server/hermes/paths';

const execFile = promisify(execFileCb);

// Validate owner/repo or pip package identifiers
const OWNER_REPO_RE = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
const PIP_PACKAGE_RE = /^[a-zA-Z0-9_-]+$/;

type PluginYaml = {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  required_env?: string[];
  provided_tools?: string[];
  provided_hooks?: string[];
  git_url?: string;
};

type PluginsConfigShape = {
  plugins?: {
    disabled?: string[];
  };
};

async function readYaml<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return (parse(raw) || null) as T | null;
  } catch {
    return null;
  }
}

async function getDisabledPlugins(): Promise<Set<string>> {
  const home = getEffectiveHome();
  const configPath = path.join(home, 'config.yaml');
  const config = await readYaml<PluginsConfigShape>(configPath);
  return new Set(config?.plugins?.disabled || []);
}

async function validatePluginDirectory(pluginDir: string): Promise<PluginYaml> {
  const yamlPath = path.join(pluginDir, 'plugin.yaml');
  const initPath = path.join(pluginDir, '__init__.py');

  const manifest = await readYaml<PluginYaml>(yamlPath);
  if (!manifest) {
    throw new Error('Repository does not contain a valid plugin.yaml manifest.');
  }

  try {
    const stat = await fs.stat(initPath);
    if (!stat.isFile()) {
      throw new Error('Plugin entrypoint is not a file.');
    }
  } catch {
    throw new Error('Repository does not contain the required __init__.py plugin entrypoint.');
  }

  return manifest;
}

function parsePluginYaml(raw: PluginYaml, pluginDir: string, source: Plugin['source']): Omit<Plugin, 'enabled'> {
  const id = path.basename(pluginDir);
  return {
    id,
    name: raw.name || id,
    version: raw.version || '0.0.0',
    description: raw.description || '',
    author: raw.author,
    source,
    installed: true,
    requiredEnv: Array.isArray(raw.required_env) ? raw.required_env.map(String) : [],
    providedTools: Array.isArray(raw.provided_tools) ? raw.provided_tools.map(String) : [],
    providedHooks: Array.isArray(raw.provided_hooks) ? raw.provided_hooks.map(String) : [],
    gitUrl: raw.git_url,
    path: pluginDir,
  };
}

async function discoverPlugins(root: string, source: Plugin['source']): Promise<Omit<Plugin, 'enabled'>[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return [];
  }

  const plugins: Omit<Plugin, 'enabled'>[] = [];

  for (const entry of entries) {
    const pluginDir = path.join(root, entry);
    const yamlPath = path.join(pluginDir, 'plugin.yaml');
    try {
      const stat = await fs.stat(pluginDir);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    const raw = await readYaml<PluginYaml>(yamlPath);
    if (!raw) continue;

    plugins.push(parsePluginYaml(raw, pluginDir, source));
  }

  return plugins;
}

export async function listRealPlugins(): Promise<Plugin[]> {
  const home = getEffectiveHome();
  const hermesHome = getHermesHome();

  const userRoot = path.join(home, 'plugins');
  const builtinRoot = path.join(hermesHome, 'hermes-agent', 'plugins');

  const [userPlugins, builtinPlugins, disabled] = await Promise.all([
    discoverPlugins(userRoot, 'user'),
    discoverPlugins(builtinRoot, 'builtin'),
    getDisabledPlugins(),
  ]);

  const seen = new Set<string>();
  const results: Plugin[] = [];

  // User plugins take precedence over builtins
  for (const collection of [userPlugins, builtinPlugins]) {
    for (const plugin of collection) {
      if (seen.has(plugin.id)) continue;
      seen.add(plugin.id);
      results.push({ ...plugin, enabled: !disabled.has(plugin.id) });
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPluginDetail(id: string): Promise<Plugin | null> {
  const plugins = await listRealPlugins();
  return plugins.find((p) => p.id === id) || null;
}

export async function installPlugin(identifier: string): Promise<void> {
  // Determine if this is a git repo (owner/repo) or pip package
  if (OWNER_REPO_RE.test(identifier)) {
    const home = getEffectiveHome();
    const pluginsDir = path.join(home, 'plugins');
    await fs.mkdir(pluginsDir, { recursive: true });
    const repoName = identifier.split('/')[1];
    const targetDir = path.join(pluginsDir, repoName);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pan-plugin-'));
    const cloneDir = path.join(tempDir, repoName);

    try {
      await fs.access(targetDir).then(
        () => Promise.reject(new Error(`Plugin "${repoName}" is already installed.`)),
        () => Promise.resolve(),
      );
      await execFile('git', ['clone', '--depth', '1', `https://github.com/${identifier}.git`, cloneDir]);
      await validatePluginDirectory(cloneDir);
      await fs.rename(cloneDir, targetDir);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
    return;
  }

  if (PIP_PACKAGE_RE.test(identifier)) {
    await execFile('pip', ['install', '--user', identifier]);
    const plugin = await getPluginDetail(identifier);
    if (!plugin) {
      await execFile('pip', ['uninstall', '-y', identifier]).catch(() => undefined);
      throw new Error(
        `Package "${identifier}" installed but did not provide a discoverable Hermes plugin. ` +
          'Pan currently requires a real plugin manifest and entrypoint.',
      );
    }
    return;
  }

  throw new Error(`Invalid plugin identifier: "${identifier}". Expected owner/repo or pip package name.`);
}

export async function removePlugin(id: string): Promise<void> {
  const plugin = await getPluginDetail(id);
  if (!plugin) throw new Error(`Plugin "${id}" not found`);

  if (plugin.source === 'pip') {
    if (!PIP_PACKAGE_RE.test(id)) throw new Error(`Invalid pip package name: "${id}"`);
    await execFile('pip', ['uninstall', '-y', id]);
  } else {
    // Remove the plugin directory
    await fs.rm(plugin.path, { recursive: true, force: true });
  }
}

export async function togglePluginEnabled(id: string, enabled: boolean): Promise<void> {
  const home = getEffectiveHome();
  const configPath = path.join(home, 'config.yaml');

  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf-8');
  } catch {
    raw = '';
  }

  const doc = parseDocument(raw);

  // Ensure plugins.disabled exists as a sequence
  if (!doc.has('plugins')) {
    doc.set('plugins', { disabled: [] });
  }
  const pluginsNode = doc.get('plugins') as any;
  if (!pluginsNode || typeof pluginsNode !== 'object') {
    doc.set('plugins', { disabled: [] });
  }

  const pluginsMap = doc.get('plugins', true) as any;
  let disabledSeq: string[] = [];
  if (pluginsMap && pluginsMap.get) {
    const val = pluginsMap.get('disabled');
    if (Array.isArray(val)) {
      disabledSeq = val.map(String);
    } else if (val && typeof val.toJSON === 'function') {
      disabledSeq = (val.toJSON() as string[]) || [];
    }
  }

  const disabledSet = new Set(disabledSeq);

  if (enabled) {
    disabledSet.delete(id);
  } else {
    disabledSet.add(id);
  }

  const sorted = Array.from(disabledSet).sort();

  if (pluginsMap && pluginsMap.set) {
    pluginsMap.set('disabled', sorted);
  } else {
    doc.set('plugins', { disabled: sorted });
  }

  await fs.writeFile(configPath, doc.toString(), 'utf-8');
}
