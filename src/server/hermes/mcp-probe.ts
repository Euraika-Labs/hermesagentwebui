import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execCli } from '@/server/core/cli';
import { getProfileConfigPath } from '@/server/hermes/paths';
import { deleteMcpProbeResults, getMcpProbeResult, persistMcpProbeResult } from '@/server/runtime/runtime-store';

export type McpTool = { name: string; description: string };
export type McpProbeResult = {
  cacheKey: string;
  profileId?: string | null;
  serverName: string;
  success: boolean;
  tools: McpTool[];
  errorText?: string | null;
  probedAt?: string;
};

export type McpProbeOutcome = {
  success: boolean;
  tools: McpTool[];
  errorText?: string;
  source: 'live' | 'cache' | 'persisted' | 'failed';
  cacheKey: string;
  remediation: string[];
  probedAt?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __hermesWorkspaceMcpProbeCache: Map<string, McpProbeOutcome> | undefined;
}

const probeCache = globalThis.__hermesWorkspaceMcpProbeCache ?? new Map<string, McpProbeOutcome>();
globalThis.__hermesWorkspaceMcpProbeCache = probeCache;

function buildProbeCacheKey(configPath: string, serverName: string) {
  const contents = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const digest = crypto.createHash('sha1').update(contents).digest('hex');
  return `v3:${configPath}:${serverName}:${digest}`;
}

function getHermesProbePython() {
  const candidates = [
    path.join(os.homedir(), '.hermes', 'hermes-agent', 'venv', 'bin', 'python3'),
    path.join(os.homedir(), '.hermes', 'hermes-agent', '.venv', 'bin', 'python3'),
    'python3',
  ];
  return candidates.find((candidate) => candidate === 'python3' || fs.existsSync(candidate)) || 'python3';
}

function remediationHints(errorText?: string) {
  const message = (errorText || '').toLowerCase();
  const hints = new Set<string>();
  if (!message) {
    hints.add('Run a live probe after saving transport details to capture concrete diagnostics.');
  }
  if (message.includes('401') || message.includes('403') || message.includes('auth') || message.includes('token')) {
    hints.add('Check auth type, token, and any required headers or environment variables.');
  }
  if (message.includes('timeout')) {
    hints.add('Increase server startup time or verify the command stays running long enough to answer the probe.');
  }
  if (message.includes('connection') || message.includes('refused') || message.includes('dns')) {
    hints.add('Verify the command or URL is reachable from the Hermes host environment.');
  }
  if (message.includes('streamable http') || message.includes('transport')) {
    hints.add('Confirm the configured MCP transport is supported by the installed Hermes CLI dependencies.');
  }
  hints.add('Validate config.yaml values for command, URL, and referenced environment variables.');
  return Array.from(hints);
}

export function invalidateMcpProbe(profileId: string | null | undefined, serverName: string) {
  const configPath = getProfileConfigPath(profileId);
  const prefix = `v3:${configPath}:${serverName}:`;
  for (const key of probeCache.keys()) {
    if (key.startsWith(prefix)) probeCache.delete(key);
  }
  deleteMcpProbeResults(profileId, serverName);
}

export function probeMcpServer(profileId: string | null | undefined, serverName: string, options?: { force?: boolean }): McpProbeOutcome {
  const configPath = getProfileConfigPath(profileId);
  const cacheKey = buildProbeCacheKey(configPath, serverName);
  if (!options?.force && probeCache.has(cacheKey)) {
    return { ...probeCache.get(cacheKey)!, source: 'cache' };
  }
  const persisted = getMcpProbeResult(cacheKey) as McpProbeResult | null;
  if (!options?.force && persisted && Array.isArray(persisted.tools)) {
    const outcome: McpProbeOutcome = {
      success: persisted.success,
      tools: persisted.tools,
      errorText: persisted.errorText || undefined,
      source: persisted.success ? 'persisted' : 'failed',
      cacheKey,
      remediation: remediationHints(persisted.errorText || undefined),
      probedAt: persisted.probedAt,
    };
    probeCache.set(cacheKey, outcome);
    return outcome;
  }
  if (process.env.HERMES_MOCK_MODE === 'true') {
    const outcome: McpProbeOutcome = {
      success: true,
      tools: [{ name: 'mock_mcp_tool', description: 'Mock MCP tool surfaced while WebUI mock mode is active.' }],
      source: 'live',
      cacheKey,
      remediation: remediationHints(),
      probedAt: new Date().toISOString(),
    };
    probeCache.set(cacheKey, outcome);
    persistMcpProbeResult({ cacheKey, profileId, serverName, success: true, tools: outcome.tools, errorText: undefined });
    return outcome;
  }

  try {
    const out = execCli(
      getHermesProbePython(),
      [
        '-c',
        `import json, sys, yaml
from pathlib import Path
sys.path.insert(0, str(Path.home()/'.hermes'/'hermes-agent'))
from hermes_cli.mcp_config import _probe_single_server
cfg = yaml.safe_load(Path(sys.argv[1]).read_text()) or {}
server = (cfg.get('mcp_servers') or {}).get(sys.argv[2])
if not server:
    print('[]')
    raise SystemExit
print(json.dumps([{'name': n, 'description': d} for n,d in _probe_single_server(sys.argv[2], server)]))
`,
        configPath,
        serverName,
      ],
      { timeout: 15000, suppressStderr: true },
    );
    const parsed = JSON.parse(out) as McpTool[];
    const outcome: McpProbeOutcome = {
      success: true,
      tools: parsed,
      source: 'live',
      cacheKey,
      remediation: remediationHints(),
      probedAt: new Date().toISOString(),
    };
    probeCache.set(cacheKey, outcome);
    persistMcpProbeResult({ cacheKey, profileId, serverName, success: true, tools: parsed });
    return outcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown MCP probe error';
    const outcome: McpProbeOutcome = {
      success: false,
      tools: [],
      errorText: message,
      source: 'failed',
      cacheKey,
      remediation: remediationHints(message),
      probedAt: new Date().toISOString(),
    };
    persistMcpProbeResult({ cacheKey, profileId, serverName, success: false, tools: [], errorText: message });
    probeCache.set(cacheKey, outcome);
    return outcome;
  }
}

export function probeMcpTools(profileId: string | null | undefined, serverName: string, options?: { force?: boolean }): McpTool[] {
  return probeMcpServer(profileId, serverName, options).tools;
}
