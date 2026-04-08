import fs from 'node:fs';
import path from 'node:path';
import { execCli } from '@/server/core/cli';
import { execPythonJson } from '@/server/core/python-exec';
import { hermesConfig } from '@/server/hermes/config';
import { describeHermesProfileContext, detectHermesActiveProfileFromHome } from '@/server/hermes/profile-context';
import { getEffectiveHome, getHermesHome } from '@/server/hermes/paths';

type RuntimeSession = {
  id: string;
  title: string | null;
  preview: string | null;
  started_at: number;
  model: string | null;
};

type RuntimeModelOption = {
  id: string;
  label: string;
  provider: string;
  source: 'runtime-default' | 'catalog' | 'session-history';
};

type RuntimeApiStatus = {
  reachable: boolean;
  message: string;
  status?: number;
};

export type RuntimeStatus = {
  available: boolean;
  mockMode?: boolean;
  hermesPath?: string;
  hermesVersion?: string;
  hermesHome?: string;
  activeProfile?: string;
  configPath?: string;
  modelDefault?: string;
  provider?: string;
  memoryProvider?: string;
  apiBaseUrl: string;
  apiReachable: boolean;
  apiMessage: string;
  apiStatus?: number;
  modelOptions: RuntimeModelOption[];
  mcpServers: Array<{ name: string; command?: string; url?: string }>;
  profiles: string[];
  skillsCount: number;
  sessionsCount: number;
  recentSessions: RuntimeSession[];
  userMemoryPath?: string;
  agentMemoryPath?: string;
  profileContext?: {
    requestedProfile: string;
    activeProfile: string;
    usingRequestedProfile: boolean;
    label: string;
  };
  memoryFilesPresent?: string[];
  binaryDetected?: boolean;
  configDetected?: boolean;
  lastFailureText?: string;
  remediationHints?: string[];
};

function runPythonJson(script: string, args: string[] = []) {
  return execPythonJson(script, args);
}

function detectHermesPath() {
  try {
    return execCli('bash', ['-lc', 'command -v hermes']).trim();
  } catch {
    return null;
  }
}

async function probeHermesApi(): Promise<RuntimeApiStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(hermesConfig.timeoutMs, 5000));

  try {
    const response = await fetch(`${hermesConfig.baseUrl}/v1/models`, {
      method: 'GET',
      headers: {
        ...(hermesConfig.apiKey ? { Authorization: `Bearer ${hermesConfig.apiKey}` } : {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (response.ok) {
      return {
        reachable: true,
        status: response.status,
        message: 'Hermes API reachable.',
      };
    }

    if (response.status < 500) {
      return {
        reachable: true,
        status: response.status,
        message: `Hermes API responded with ${response.status}.`,
      };
    }

    return {
      reachable: false,
      status: response.status,
      message: `Hermes API returned ${response.status}.`,
    };
  } catch (error) {
    return {
      reachable: false,
      message: error instanceof Error ? error.message : 'Unable to reach Hermes API.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getRuntimeModelOptions(provider: string | undefined, modelDefault: string | undefined, recentSessions: RuntimeSession[]) {
  const options = new Map<string, RuntimeModelOption>();
  const resolvedProvider = provider || 'unknown';

  // Filter out placeholder/bogus model names that were hardcoded in earlier versions.
  const bogusModels = new Set(['hermes 3 405b', 'hermes fast', 'hermes-agent', 'default']);
  const isBogus = (id: string) => bogusModels.has(id.toLowerCase());

  if (modelDefault && !isBogus(modelDefault)) {
    options.set(modelDefault, {
      id: modelDefault,
      label: modelDefault,
      provider: resolvedProvider,
      source: 'runtime-default',
    });
  }

  for (const session of recentSessions) {
    if (!session.model) continue;
    if (isBogus(session.model)) continue;
    if (!options.has(session.model)) {
      options.set(session.model, {
        id: session.model,
        label: session.model,
        provider: resolvedProvider,
        source: 'session-history',
      });
    }
  }

  // Fetch available models from the provider using Hermes's own Python catalog.
  try {
    const providerModels = execPythonJson<string[]>(`
import json, sys
provider = sys.argv[1]
try:
    sys.path.insert(0, sys.argv[2])
    from hermes_cli.models import fetch_github_model_catalog, _PROVIDER_MODELS
    if provider == 'copilot':
        catalog = fetch_github_model_catalog(timeout=4.0)
        if catalog:
            models = [item.get('id','') for item in catalog if item.get('id')]
        else:
            models = _PROVIDER_MODELS.get('copilot', [])
    else:
        models = _PROVIDER_MODELS.get(provider, [])
    print(json.dumps(models))
except Exception as e:
    print(json.dumps([]))
`, [resolvedProvider, path.join(getHermesHome(), 'hermes-agent')], { timeout: 8000, suppressStderr: true });

    for (const modelId of providerModels) {
      if (!modelId || isBogus(modelId)) continue;
      if (!options.has(modelId)) {
        options.set(modelId, {
          id: modelId,
          label: modelId,
          provider: resolvedProvider,
          source: 'catalog',
        });
      }
    }
  } catch {
    // Provider catalog unavailable — fall through with what we have.
  }

  return Array.from(options.values());
}

export async function getHermesRuntimeStatus(): Promise<RuntimeStatus> {
  const mockMode = process.env.HERMES_MOCK_MODE === 'true';
  const hermesPath = detectHermesPath();
  const hermesHome = getHermesHome();
  const detectedActive = detectHermesActiveProfileFromHome();
  const effectiveHome = getEffectiveHome();

  if (!hermesPath || !fs.existsSync(effectiveHome)) {
    return {
      available: false,
      mockMode,
      apiBaseUrl: hermesConfig.baseUrl,
      apiReachable: false,
      apiMessage: 'Hermes runtime is not installed or HERMES_HOME is unavailable.',
      profiles: [],
      mcpServers: [],
      modelOptions: [],
      skillsCount: 0,
      sessionsCount: 0,
      recentSessions: [],
      binaryDetected: Boolean(hermesPath),
      configDetected: fs.existsSync(effectiveHome),
      profileContext: describeHermesProfileContext(null),
      remediationHints: [
        'Install the Hermes CLI and ensure `hermes` is on PATH.',
        'Set HERMES_HOME to a readable Hermes home directory.',
        'Open Settings → Health to inspect runtime detection details.',
      ],
    };
  }

  const configPath = path.join(effectiveHome, 'config.yaml');
  const memoriesDir = path.join(effectiveHome, 'memories');
  const skillsDir = path.join(effectiveHome, 'skills');
  const profilesDir = path.join(hermesHome, 'profiles');
  const stateDbPath = path.join(effectiveHome, 'state.db');

  const version = (() => {
    try {
      return execCli('hermes', ['--version']).split('\n')[0].trim();
    } catch {
      return undefined;
    }
  })();

  const config = fs.existsSync(configPath)
    ? (runPythonJson(
        "import json, sys, yaml; from pathlib import Path; p=Path(sys.argv[1]); data=yaml.safe_load(p.read_text()) or {}; print(json.dumps(data))",
        [configPath],
      ) as Record<string, unknown>)
    : {};

  const profiles = [detectedActive, ...((fs.existsSync(profilesDir) ? fs.readdirSync(profilesDir).filter((name) => fs.statSync(path.join(profilesDir, name)).isDirectory()) : []) as string[])].filter((value, index, array) => array.indexOf(value) === index);

  const recentSessions = fs.existsSync(stateDbPath)
    ? (runPythonJson(
        "import sqlite3, json, sys\nconn=sqlite3.connect(sys.argv[1])\ncur=conn.cursor()\ncur.execute(\"SELECT s.id, COALESCE(s.title, ''), s.started_at, s.model, (SELECT m.content FROM messages m WHERE m.session_id=s.id AND m.role='user' ORDER BY m.timestamp ASC LIMIT 1) FROM sessions s ORDER BY s.started_at DESC LIMIT 10\")\nrows=cur.fetchall()\nprint(json.dumps([{'id':r[0],'title':r[1] or None,'started_at':r[2],'model':r[3],'preview':(r[4][:160] if r[4] else None)} for r in rows]))",
        [stateDbPath],
      ) as RuntimeSession[])
    : [];

  const sessionsCount = fs.existsSync(stateDbPath)
    ? (runPythonJson(
        "import sqlite3, json, sys\nconn=sqlite3.connect(sys.argv[1])\ncur=conn.cursor()\ncur.execute('SELECT COUNT(*) FROM sessions')\nprint(json.dumps(cur.fetchone()[0]))",
        [stateDbPath],
      ) as number)
    : 0;

  const skillsCount = fs.existsSync(skillsDir)
    ? (runPythonJson(
        "import json, sys\nfrom pathlib import Path\nroot=Path(sys.argv[1])\ncount=sum(1 for p in root.rglob('SKILL.md'))\nprint(json.dumps(count))",
        [skillsDir],
      ) as number)
    : 0;

  const mcpServers = ((config.mcp_servers as Record<string, { command?: string; url?: string }> | undefined) || {});

  const activeProfile = detectedActive;
  const profileContext = describeHermesProfileContext(activeProfile);
  const modelDefault = (config.model as { default?: string } | undefined)?.default;
  const provider = (config.model as { provider?: string } | undefined)?.provider;
  const [apiStatus, modelOptions] = await Promise.all([
    probeHermesApi(),
    getRuntimeModelOptions(provider, modelDefault, recentSessions),
  ]);

  return {
    available: true,
    mockMode,
    hermesPath,
    hermesVersion: version,
    hermesHome,
    activeProfile,
    configPath,
    modelDefault,
    provider,
    memoryProvider: (config.memory as { provider?: string } | undefined)?.provider,
    apiBaseUrl: hermesConfig.baseUrl,
    apiReachable: apiStatus.reachable,
    apiMessage: apiStatus.message,
    apiStatus: apiStatus.status,
    modelOptions,
    mcpServers: Object.entries(mcpServers).map(([name, value]) => ({ name, command: value.command, url: value.url })),
    profiles,
    skillsCount,
    sessionsCount,
    recentSessions,
    userMemoryPath: path.join(memoriesDir, 'USER.md'),
    agentMemoryPath: path.join(memoriesDir, 'MEMORY.md'),
    profileContext,
    memoryFilesPresent: ['USER.md', 'MEMORY.md'].filter((file) => fs.existsSync(path.join(memoriesDir, file))),
    binaryDetected: Boolean(hermesPath),
    configDetected: fs.existsSync(configPath),
    lastFailureText: apiStatus.reachable ? undefined : apiStatus.message,
    remediationHints: [
      apiStatus.reachable ? 'Hermes API responded successfully on the last probe.' : 'Check that the Hermes API is running and reachable from the configured base URL.',
      Object.keys(mcpServers).length > 0 ? 'Review MCP diagnostics for per-server probe failures.' : 'No MCP servers are configured for the active runtime profile.',
      fs.existsSync(configPath) ? 'Runtime config.yaml was detected.' : 'Create or restore config.yaml for this Hermes home.',
    ],
  };
}
