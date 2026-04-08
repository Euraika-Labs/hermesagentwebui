#!/usr/bin/env node

/**
 * pan-ui — CLI launcher with interactive setup wizard.
 *
 * Usage:
 *   pan-ui start                # start foreground (runs setup on first launch)
 *   pan-ui start --daemon       # start in background (daemonize)
 *   pan-ui start --port 8080    # custom port
 *   pan-ui stop                 # stop background daemon
 *   pan-ui status               # check if daemon is running
 *   pan-ui logs                 # tail daemon log output
 *   pan-ui setup                # re-run setup wizard
 *   pan-ui update               # check for and install updates
 *   pan-ui version              # show current version
 *   pan-ui service install      # install systemd user service
 *   pan-ui service remove       # remove systemd user service
 *   pan-ui help                 # show help
 */

import { createInterface } from 'node:readline';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, unlinkSync, openSync, cpSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { execSync, spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import crypto from 'node:crypto';

// ─── Paths ──────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..');
const ENV_PATH = join(PKG_ROOT, '.env.local');
const RUN_DIR = join(homedir(), '.pan-ui');
const PID_FILE = join(RUN_DIR, 'pan-ui.pid');
const LOG_FILE = join(RUN_DIR, 'pan-ui.log');

// ─── Helpers ────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

function banner() {
  console.log('');
  console.log(bold('  ╔══════════════════════════════════════════╗'));
  console.log(bold('  ║') + cyan('       ⚡ Pan UI — Setup Wizard            ') + bold('║'));
  console.log(bold('  ╚══════════════════════════════════════════╝'));
  console.log('');
}

function startBanner(port) {
  console.log('');
  console.log(bold('  ╔══════════════════════════════════════════╗'));
  console.log(bold('  ║') + green('            ⚡ Pan UI running              ') + bold('║'));
  console.log(bold('  ╚══════════════════════════════════════════╝'));
  console.log('');
  console.log(`  ${dim('Local:')}   ${cyan(`http://localhost:${port}`)}`);
  console.log(`  ${dim('Press')}   ${dim('Ctrl+C to stop')}`);
  console.log('');
}

// ─── Detection ──────────────────────────────────────────────────────────────

function loadHermesVersionConfig() {
  try {
    const cfgPath = join(PKG_ROOT, 'hermes.version.json');
    return JSON.parse(readFileSync(cfgPath, 'utf-8')).hermes;
  } catch { return null; }
}

const HERMES_VERSION_CONFIG = loadHermesVersionConfig();
const HERMES_FORK_REPO = HERMES_VERSION_CONFIG?.repo || 'https://github.com/Euraika-Labs/hermes-agent.git';
const HERMES_PINNED_TAG = HERMES_VERSION_CONFIG?.tag || 'main';
const HERMES_PINNED_VERSION = HERMES_VERSION_CONFIG?.version || null;
const HERMES_MIN_VERSION = HERMES_VERSION_CONFIG?.minVersion || '0.7.0';
// Fallback to upstream install script for manual instructions
const HERMES_INSTALL_URL = 'https://raw.githubusercontent.com/Euraika-Labs/hermes-agent/main/scripts/install.sh';

function detectHermesBinary() {
  try {
    const p = execSync('command -v hermes', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return p || null;
  } catch { return null; }
}

function detectHermesVersion(bin) {
  try {
    return execSync(`${bin} --version`, { encoding: 'utf-8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
}

/**
 * Parse semver-like version string. Extracts x.y.z from strings like "Hermes Agent v0.7.0 (2026.4.3)".
 * Returns the version as "x.y.z" string or null.
 */
function parseHermesVersion(str) {
  if (!str) return null;
  const m = str.match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

/**
 * Check if the installed hermes version is compatible with Pan's requirements.
 * - Below minVersion: incompatible (needs upgrade)
 * - At or above minVersion: compatible (newer versions are fine)
 * Returns { compatible, installed, required, needsUpgrade, message }.
 */
function checkHermesCompatibility(versionString) {
  const installed = parseHermesVersion(versionString);
  if (!installed) return { compatible: true, installed: null, needsUpgrade: false, message: null }; // can't check, assume ok

  if (HERMES_MIN_VERSION && compareVersions(installed, HERMES_MIN_VERSION) < 0) {
    return {
      compatible: false,
      installed,
      required: `>=${HERMES_MIN_VERSION}`,
      needsUpgrade: true,
      message: `Hermes ${installed} is too old. Pan requires >=${HERMES_MIN_VERSION}.`
    };
  }
  return { compatible: true, installed, needsUpgrade: false, message: null };
}

function detectHermesHome() {
  if (process.env.HERMES_HOME) return process.env.HERMES_HOME;
  const defaultPath = join(homedir(), '.hermes');
  return existsSync(defaultPath) ? defaultPath : null;
}

function detectHermesProfiles(hermesHome) {
  if (!hermesHome) return [];
  const profilesDir = join(hermesHome, 'profiles');
  if (!existsSync(profilesDir)) return [];
  try {
    const entries = readdirSync(profilesDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch { return []; }
}

function detectApiServer(baseUrl) {
  try {
    execSync(`curl -sf --max-time 2 ${baseUrl}/v1/models > /dev/null 2>&1`, { timeout: 5000 });
    return true;
  } catch { return false; }
}

function detectPython() {
  try {
    execSync('python3 --version', { stdio: 'ignore', timeout: 3000 });
    return true;
  } catch { return false; }
}

// ─── Update check ───────────────────────────────────────────────────────────

const PKG_NAME = '@euraika-labs/pan-ui';
const UPDATE_CHECK_FILE = join(RUN_DIR, 'update-check.json');

function getCurrentVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch { return '0.0.0'; }
}

/**
 * Check npm registry for the latest version. Caches result for 6 hours.
 * Returns { current, latest, updateAvailable, checkedAt } or null on error.
 */
function checkForUpdates(forceCheck = false) {
  const current = getCurrentVersion();

  // Return cached result if still fresh (6 hours)
  if (!forceCheck && existsSync(UPDATE_CHECK_FILE)) {
    try {
      const cached = JSON.parse(readFileSync(UPDATE_CHECK_FILE, 'utf-8'));
      const age = Date.now() - (cached.checkedAt || 0);
      if (age < 6 * 60 * 60 * 1000 && cached.current === current) {
        return cached;
      }
    } catch {}
  }

  try {
    const latest = execSync(`npm view ${PKG_NAME} version 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!latest) return null;

    const result = {
      current,
      latest,
      updateAvailable: latest !== current && compareVersions(latest, current) > 0,
      checkedAt: Date.now(),
    };

    // Cache result
    try {
      mkdirSync(RUN_DIR, { recursive: true });
      writeFileSync(UPDATE_CHECK_FILE, JSON.stringify(result), 'utf-8');
    } catch {}

    return result;
  } catch {
    return null;
  }
}

/** Simple semver comparison: returns >0 if a > b, <0 if a < b, 0 if equal */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Non-blocking startup update check — prints a notice if update is available */
function showUpdateNotice() {
  try {
    const result = checkForUpdates(false);
    if (result?.updateAvailable) {
      console.log(`  ${yellow('⬆')}  Update available: ${dim(result.current)} → ${green(result.latest)}`);
      console.log(`     ${dim('Run:')} ${cyan('pan-ui update')}`);
      console.log('');
    }
  } catch {}
}

/** Perform the update via npm */
async function performUpdate() {
  const result = checkForUpdates(true);
  if (!result) {
    console.log(`  ${yellow('!')} Could not check for updates (npm registry unreachable?)`);
    process.exit(1);
  }

  console.log('');
  console.log(`  ${dim('Current version:')} ${cyan(result.current)}`);
  console.log(`  ${dim('Latest version:')}  ${cyan(result.latest)}`);
  console.log('');

  if (!result.updateAvailable) {
    console.log(`  ${green('✓')} You're already on the latest version!`);
    process.exit(0);
  }

  console.log(`  ${cyan('⬆')}  Updating ${PKG_NAME} ${dim(result.current)} → ${green(result.latest)}...`);
  console.log('');

  try {
    execSync(`npm install -g ${PKG_NAME}@latest`, { stdio: 'inherit', timeout: 120_000 });
    console.log('');
    console.log(`  ${green('✓')} Updated to ${result.latest}!`);

    // Clear update cache
    try { unlinkSync(UPDATE_CHECK_FILE); } catch {}

    // Check if running as systemd service
    if (platform() === 'linux') {
      try {
        const status = execSync(`systemctl --user is-active ${SERVICE_NAME} 2>/dev/null`, {
          encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        if (status === 'active') {
          console.log(`  ${dim('Restarting service...')}`);
          execSync(`systemctl --user restart ${SERVICE_NAME}`, { stdio: 'ignore' });
          console.log(`  ${green('✓')} Service restarted`);
        }
      } catch {}
    }

    // Check if running as daemon
    const { running } = getDaemonStatus();
    if (running) {
      console.log(`  ${yellow('!')} A daemon is running. Restart it with: ${cyan('pan-ui stop && pan-ui start --daemon')}`);
    }

    console.log('');
  } catch (err) {
    console.log('');
    console.log(`  ${red('✗')} Update failed: ${err.message}`);
    console.log(`  ${dim('Try manually:')} ${cyan(`npm install -g ${PKG_NAME}@latest`)}`);
    process.exit(1);
  }
}

// ─── Sync Hermes ──────────────────────────────────────────────────────────

/**
 * Sync the local Hermes Agent install to Pan's pinned fork version.
 * - If no hermes install exists: fresh clone from fork
 * - If hermes exists: switch remote to fork, checkout pinned tag, reinstall
 * - With --force: reinstall even if already on the correct version
 */
async function syncHermes(force = false) {
  console.log('');
  console.log(bold('  Hermes Agent Sync'));
  console.log(dim(`  Fork:    ${HERMES_FORK_REPO}`));
  console.log(dim(`  Tag:     ${HERMES_PINNED_TAG}`));
  console.log(dim(`  Version: ${HERMES_PINNED_VERSION || 'unknown'}`));
  console.log('');

  const hermesHome = join(homedir(), '.hermes');
  const installDir = join(hermesHome, 'hermes-agent');

  // Check current version
  const hermesBin = detectHermesBinary();
  if (hermesBin && !force) {
    const version = detectHermesVersion(hermesBin);
    const parsed = parseHermesVersion(version);
    if (parsed) {
      if (parsed === HERMES_PINNED_VERSION) {
        console.log(`  ${green('✓')} Already on the pinned version (${parsed})`);
        console.log(`  ${dim('Use --force to reinstall anyway')}`);
        return;
      }
      if (compareVersions(parsed, HERMES_PINNED_VERSION) > 0) {
        console.log(`  ${green('✓')} Installed version (${parsed}) is newer than pinned (${HERMES_PINNED_VERSION}) — nothing to do`);
        console.log(`  ${dim('Use --force to downgrade to the pinned version')}`);
        return;
      }
      // Older than pinned — will upgrade
      console.log(`  ${dim('Current:')} ${yellow(parsed)} → ${green(HERMES_PINNED_VERSION)}`);
    }
  }

  // Step 1: ensure git repo is pointing at our fork
  if (existsSync(join(installDir, '.git'))) {
    console.log(`  ${cyan('→')} Switching to Euraika-Labs fork...`);
    try {
      const currentRemote = execSync('git remote get-url origin', {
        cwd: installDir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      if (currentRemote !== HERMES_FORK_REPO) {
        execSync(`git remote set-url origin ${HERMES_FORK_REPO}`, { cwd: installDir, stdio: 'ignore' });
        // Keep upstream as a secondary remote for reference
        try {
          execSync('git remote get-url upstream', { cwd: installDir, stdio: 'ignore' });
        } catch {
          execSync(`git remote add upstream ${HERMES_VERSION_CONFIG?.upstream || 'https://github.com/NousResearch/hermes-agent.git'}`, {
            cwd: installDir, stdio: 'ignore'
          });
        }
        console.log(`  ${green('✓')} Remote switched from ${dim(currentRemote)}`);
      } else {
        console.log(`  ${green('✓')} Already pointing at fork`);
      }
    } catch (e) {
      console.log(`  ${yellow('!')} Could not update remote: ${e.message}`);
    }

    // Step 2: fetch and checkout the pinned tag
    console.log(`  ${cyan('→')} Fetching ${HERMES_PINNED_TAG}...`);
    try {
      execSync(`git fetch origin --tags`, { cwd: installDir, stdio: 'inherit', timeout: 60_000 });
      execSync(`git checkout ${HERMES_PINNED_TAG}`, { cwd: installDir, stdio: 'inherit', timeout: 30_000 });
      console.log(`  ${green('✓')} Checked out ${HERMES_PINNED_TAG}`);
    } catch (e) {
      console.log(`  ${red('✗')} Fetch/checkout failed: ${e.message}`);
      return;
    }
  } else {
    // Fresh clone
    console.log(`  ${cyan('→')} Cloning from fork...`);
    mkdirSync(hermesHome, { recursive: true });
    try {
      execSync(
        `git clone --branch ${HERMES_PINNED_TAG} ${HERMES_FORK_REPO} ${installDir}`,
        { stdio: 'inherit', timeout: 120_000 }
      );
      console.log(`  ${green('✓')} Cloned`);
    } catch (e) {
      console.log(`  ${red('✗')} Clone failed: ${e.message}`);
      return;
    }
  }

  // Step 3: reinstall in venv
  console.log(`  ${cyan('→')} Installing dependencies...`);
  const localInstallScript = join(installDir, 'scripts', 'install.sh');
  try {
    if (existsSync(localInstallScript)) {
      execSync(`bash ${localInstallScript} --skip-setup`, {
        stdio: 'inherit', timeout: 300_000,
        env: { ...process.env, HERMES_INSTALL_DIR: installDir }
      });
    } else {
      const venvDir = join(installDir, 'venv');
      if (!existsSync(venvDir)) {
        execSync(`python3 -m venv ${venvDir}`, { stdio: 'inherit', timeout: 60_000 });
      }
      execSync(`${join(venvDir, 'bin', 'pip')} install -e ${installDir}`, {
        stdio: 'inherit', timeout: 300_000
      });
    }
  } catch (e) {
    console.log(`  ${red('✗')} Install failed: ${e.message}`);
    return;
  }

  // Verify
  const newBin = detectHermesBinary();
  const newVersion = newBin ? detectHermesVersion(newBin) : null;
  console.log('');
  if (newBin) {
    console.log(`  ${green('✓')} Hermes synced: ${cyan(newVersion || 'unknown version')}`);
  } else {
    console.log(`  ${yellow('!')} Install completed but hermes binary not found in PATH`);
    console.log(`  ${dim('You may need to restart your shell or source ~/.bashrc')}`);
  }
  console.log('');
}

/**
 * Install Hermes Agent from the Euraika-Labs fork at the pinned version tag.
 * Uses git clone + pip install for reproducible, version-controlled installs.
 * Falls back to the upstream install script if git is unavailable.
 * Returns the hermes binary path on success, null on failure.
 */
async function installHermesAgent() {
  console.log('');
  console.log(`  ${cyan('⬇')}  Installing Hermes Agent ${HERMES_PINNED_VERSION ? `v${HERMES_PINNED_VERSION}` : ''}...`);
  console.log(`  ${dim(`Source: ${HERMES_FORK_REPO} @ ${HERMES_PINNED_TAG}`)}`);
  console.log('');

  const hermesHome = join(homedir(), '.hermes');
  const installDir = join(hermesHome, 'hermes-agent');

  try {
    // Prefer our fork-based install for version control
    mkdirSync(hermesHome, { recursive: true });

    if (existsSync(installDir)) {
      // Existing install — update to pinned tag
      console.log(`  ${dim('Existing install found, updating to pinned version...')}`);
      execSync(`cd ${installDir} && git fetch origin && git checkout ${HERMES_PINNED_TAG}`, {
        stdio: 'inherit', timeout: 120_000
      });
    } else {
      // Fresh clone from our fork at the pinned tag
      execSync(
        `git clone --depth 1 --branch ${HERMES_PINNED_TAG} ${HERMES_FORK_REPO} ${installDir}`,
        { stdio: 'inherit', timeout: 120_000 }
      );
    }

    // Set the remote to our fork (in case it was previously pointing at NousResearch)
    try {
      execSync(`cd ${installDir} && git remote set-url origin ${HERMES_FORK_REPO}`, { stdio: 'ignore' });
    } catch {}

    // Install in venv using the upstream install script from the cloned repo
    const localInstallScript = join(installDir, 'scripts', 'install.sh');
    if (existsSync(localInstallScript)) {
      execSync(`bash ${localInstallScript} --skip-setup`, {
        stdio: 'inherit', timeout: 300_000,
        env: { ...process.env, HERMES_INSTALL_DIR: installDir }
      });
    } else {
      // Fallback: direct pip install
      const venvDir = join(installDir, 'venv');
      if (!existsSync(venvDir)) {
        execSync(`python3 -m venv ${venvDir}`, { stdio: 'inherit', timeout: 60_000 });
      }
      execSync(`${join(venvDir, 'bin', 'pip')} install -e ${installDir}`, {
        stdio: 'inherit', timeout: 300_000
      });
    }
  } catch (err) {
    console.log('');
    console.log(`  ${red('✗')} Hermes installation failed: ${err.message}`);
    console.log(`  ${dim('Try installing manually:')}`);
    console.log(`    ${cyan(`curl -fsSL ${HERMES_INSTALL_URL} | bash`)}`);
    return null;
  }

  // Find the binary after install
  const possiblePaths = [
    join(installDir, 'venv', 'bin', 'hermes'),
    join(installDir, '.venv', 'bin', 'hermes'),
    join(homedir(), '.local', 'bin', 'hermes'),
  ];

  // Also try sourcing the updated shell profile
  try {
    const shell = process.env.SHELL || '/bin/bash';
    const rcFile = shell.endsWith('zsh') ? '~/.zshrc' : '~/.bashrc';
    const found = execSync(
      `source ${rcFile} 2>/dev/null; command -v hermes`,
      { encoding: 'utf-8', shell: '/bin/bash', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }
    ).trim();
    if (found) return found;
  } catch {}

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }

  // Last resort: maybe it's in PATH now after install
  return detectHermesBinary();
}

// ─── .env parser/writer ─────────────────────────────────────────────────────

function loadEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function writeEnv(envPath, env) {
  const header = [
    '# Pan UI configuration',
    '# Generated by: pan-ui setup',
    `# Updated: ${new Date().toISOString()}`,
    '',
  ];
  const lines = header.concat(
    Object.entries(env).map(([k, v]) => `${k}=${v}`)
  );
  writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
}

// ─── Setup wizard ───────────────────────────────────────────────────────────

async function setup(forceWizard = false) {
  const existing = loadEnv(ENV_PATH);
  const isFirstRun = Object.keys(existing).length === 0;

  if (!forceWizard && !isFirstRun) {
    return existing;
  }

  banner();

  if (isFirstRun) {
    console.log(`  ${dim('First-time setup detected. Let\'s configure your workspace.')}`);
  } else {
    console.log(`  ${dim('Re-running setup. Current values shown as defaults.')}`);
  }
  console.log('');

  const env = { ...existing };

  // ── Step 1: Hermes Home ─────────────────────────────────────────────────

  console.log(bold('  1/6  Hermes Home'));
  const detectedHome = detectHermesHome();
  if (detectedHome) {
    console.log(`  ${green('✓')} Detected: ${cyan(detectedHome)}`);
  } else {
    console.log(`  ${yellow('!')} Could not auto-detect ~/.hermes`);
  }

  const currentHome = env.HERMES_HOME || detectedHome || join(homedir(), '.hermes');
  const homeAnswer = (await ask(`  ${dim(`HERMES_HOME [${currentHome}]:`)} `)).trim();
  env.HERMES_HOME = homeAnswer || currentHome;

  if (!existsSync(env.HERMES_HOME)) {
    console.log(`  ${yellow('⚠')} Path does not exist yet. It will be created when Hermes runs.`);
  }
  console.log('');

  // ── Step 2: Hermes API ──────────────────────────────────────────────────

  console.log(bold('  2/6  Hermes API Server'));
  const currentApi = env.HERMES_API_BASE_URL || 'http://127.0.0.1:8642';
  const apiAnswer = (await ask(`  ${dim(`API URL [${currentApi}]:`)} `)).trim();
  env.HERMES_API_BASE_URL = apiAnswer || currentApi;

  const apiUp = detectApiServer(env.HERMES_API_BASE_URL);
  if (apiUp) {
    console.log(`  ${green('✓')} API server is reachable`);
  } else {
    console.log(`  ${yellow('!')} API server not reachable right now — that's OK, Workspace will retry on startup`);
  }

  const currentApiKey = env.HERMES_API_KEY || '';
  if (currentApiKey) {
    console.log(`  ${dim('API key is set (leave blank to keep current)')}`);
  }
  const apiKeyAnswer = (await ask(`  ${dim(`API key [${currentApiKey ? '••••••' : 'none'}]:`)} `)).trim();
  if (apiKeyAnswer) {
    env.HERMES_API_KEY = apiKeyAnswer;
  } else if (currentApiKey) {
    env.HERMES_API_KEY = currentApiKey;
  }
  console.log('');

  // ── Step 3: Authentication ──────────────────────────────────────────────

  console.log(bold('  3/6  Workspace Authentication'));
  console.log(`  ${dim('Protects access to the web UI')}`);

  const currentUser = env.HERMES_WORKSPACE_USERNAME || 'admin';
  const userAnswer = (await ask(`  ${dim(`Username [${currentUser}]:`)} `)).trim();
  env.HERMES_WORKSPACE_USERNAME = userAnswer || currentUser;

  const currentPass = env.HERMES_WORKSPACE_PASSWORD || '';
  const hasPass = currentPass && currentPass !== 'changeme';
  if (hasPass) {
    const keepPass = (await ask(`  ${dim('Keep current password? [Y/n]:')} `)).trim().toLowerCase();
    if (keepPass === 'n' || keepPass === 'no') {
      const newPass = (await ask(`  ${dim('New password:')} `)).trim();
      env.HERMES_WORKSPACE_PASSWORD = newPass || 'changeme';
    } else {
      env.HERMES_WORKSPACE_PASSWORD = currentPass;
    }
  } else {
    const newPass = (await ask(`  ${dim('Password [changeme]:')} `)).trim();
    env.HERMES_WORKSPACE_PASSWORD = newPass || 'changeme';
  }

  // Auto-generate a session secret if none exists
  if (!env.HERMES_WORKSPACE_SECRET || env.HERMES_WORKSPACE_SECRET === 'dev-secret-change-me') {
    env.HERMES_WORKSPACE_SECRET = crypto.randomBytes(32).toString('hex');
    console.log(`  ${green('✓')} Generated secure session secret`);
  }
  console.log('');

  // ── Step 4: Port ────────────────────────────────────────────────────────

  console.log(bold('  4/6  Server Port'));
  const currentPort = env.PORT || '3199';
  const portAnswer = (await ask(`  ${dim(`Port [${currentPort}]:`)} `)).trim();
  env.PORT = portAnswer || currentPort;
  console.log('');

  // ── Step 5: Mock Mode ───────────────────────────────────────────────────

  console.log(bold('  5/6  Mock Mode'));
  console.log(`  ${dim('Use mock data when Hermes runtime is unavailable')}`);
  const currentMock = env.HERMES_MOCK_MODE || 'false';
  const mockAnswer = (await ask(`  ${dim(`Enable mock mode? [${currentMock}] (true/false):`)} `)).trim().toLowerCase();
  env.HERMES_MOCK_MODE = (mockAnswer === 'true' || mockAnswer === 'yes') ? 'true' : (mockAnswer || currentMock);
  console.log('');

  // ── Step 6: Diagnostics & Auto-Install ─────────────────────────────────

  console.log(bold('  6/6  Environment Check'));

  let hermesBin = detectHermesBinary();
  if (hermesBin) {
    const version = detectHermesVersion(hermesBin);
    console.log(`  ${green('✓')} Hermes binary: ${cyan(hermesBin)}${version ? ` (${version})` : ''}`);

    // Check version compatibility with Pan's pinned range
    const compat = checkHermesCompatibility(version);
    if (!compat.compatible && compat.needsUpgrade) {
      console.log(`  ${yellow('⚠')} ${compat.message}`);
      console.log(`  ${dim(`Pan is tested with Hermes >=${HERMES_MIN_VERSION} (${HERMES_FORK_REPO} @ ${HERMES_PINNED_TAG})`)}`);
      console.log('');
      const doUpgrade = (await ask(`  ${bold('Upgrade Hermes Agent now? [Y/n]:')} `)).trim().toLowerCase();

      if (doUpgrade === '' || doUpgrade === 'y' || doUpgrade === 'yes') {
        await syncHermes(true);
        // Re-detect after upgrade
        hermesBin = detectHermesBinary();
        if (hermesBin) {
          const newVersion = detectHermesVersion(hermesBin);
          console.log(`  ${green('✓')} Hermes upgraded: ${cyan(hermesBin)}${newVersion ? ` (${newVersion})` : ''}`);
        }
      } else {
        console.log(`  ${dim('Skipped. Some features may not work correctly with an older Hermes version.')}`);
      }
    }
  } else {
    console.log(`  ${yellow('!')} Hermes Agent not found in PATH`);
    console.log(`  ${dim('Pan needs Hermes Agent to function — sessions, skills, memory, and the gateway all require it.')}`);
    console.log('');
    const doInstall = (await ask(`  ${bold('Install Hermes Agent now? [Y/n]:')} `)).trim().toLowerCase();

    if (doInstall === '' || doInstall === 'y' || doInstall === 'yes') {
      hermesBin = await installHermesAgent();
      if (hermesBin) {
        const version = detectHermesVersion(hermesBin);
        console.log('');
        console.log(`  ${green('✓')} Hermes installed: ${cyan(hermesBin)}${version ? ` (${version})` : ''}`);

        // Update HERMES_HOME if it was just the default and install created it
        const newHome = detectHermesHome();
        if (newHome && newHome !== env.HERMES_HOME) {
          env.HERMES_HOME = newHome;
          console.log(`  ${green('✓')} HERMES_HOME updated to ${cyan(newHome)}`);
        }
      } else {
        console.log('');
        console.log(`  ${yellow('⚠')} Installation did not succeed. Pan will start but with limited functionality.`);
        console.log(`  ${dim('Install manually later:')}`);
        console.log(`    ${cyan(`curl -fsSL ${HERMES_INSTALL_URL} | bash`)}`);
      }
    } else {
      console.log(`  ${dim('Skipped. Pan will start in limited mode without Hermes.')}`);
      console.log(`  ${dim('Install later:')}`);
      console.log(`    ${cyan(`curl -fsSL ${HERMES_INSTALL_URL} | bash`)}`);
    }
  }

  if (detectPython()) {
    console.log(`  ${green('✓')} Python3 available (needed for runtime bridge)`);
  } else {
    console.log(`  ${yellow('!')} Python3 not found — some features will be limited`);
  }

  if (existsSync(env.HERMES_HOME)) {
    console.log(`  ${green('✓')} HERMES_HOME exists: ${cyan(env.HERMES_HOME)}`);
    const configPath = join(env.HERMES_HOME, 'config.yaml');
    if (existsSync(configPath)) {
      console.log(`  ${green('✓')} config.yaml found`);
    } else {
      // If hermes is available, offer to run setup
      if (hermesBin) {
        console.log(`  ${yellow('!')} config.yaml not found — running ${cyan('hermes setup')} to initialize...`);
        try {
          execSync(`${hermesBin} setup --non-interactive 2>/dev/null || true`, {
            stdio: 'inherit',
            timeout: 30_000,
          });
        } catch {
          console.log(`  ${yellow('!')} config.yaml not found — run ${cyan('hermes setup')} to configure API keys`);
        }
      } else {
        console.log(`  ${yellow('!')} config.yaml not found — run ${cyan('hermes setup')} after installing Hermes`);
      }
    }
  }

  if (env.HERMES_WORKSPACE_PASSWORD === 'changeme') {
    console.log(`  ${yellow('⚠')} Password is still the default — change it for production use`);
  }

  console.log('');

  // ── Write ───────────────────────────────────────────────────────────────

  writeEnv(ENV_PATH, env);
  console.log(`  ${green('✓')} Configuration saved to ${cyan(ENV_PATH)}`);
  console.log(`  ${dim('Re-run with:')} ${cyan('pan-ui setup')}`);
  console.log('');

  return env;
}

// ─── Server launcher ────────────────────────────────────────────────────────

function findStandaloneServer() {
  // When published: the standalone server lives inside the package
  const standaloneServer = join(PKG_ROOT, '.next', 'standalone', 'server.js');
  if (existsSync(standaloneServer)) return standaloneServer;

  // Dev fallback: check for a production build
  const regularNext = join(PKG_ROOT, 'node_modules', '.bin', 'next');
  if (existsSync(regularNext)) return null; // use next start instead
  return null;
}

/**
 * Patch required-server-files.json so the standalone build can find its
 * assets regardless of where npm installed the package.  The build bakes
 * in the absolute path of the *build* machine — we rewrite it to the
 * current installation path at startup.
 */
function patchStandalonePaths() {
  const rsfPath = join(PKG_ROOT, '.next', 'standalone', '.next', 'required-server-files.json');
  if (!existsSync(rsfPath)) return;

  try {
    const raw = readFileSync(rsfPath, 'utf-8');
    const data = JSON.parse(raw);
    let changed = false;

    const standaloneDir = join(PKG_ROOT, '.next', 'standalone');

    if (data.appDir && data.appDir !== standaloneDir) {
      data.appDir = standaloneDir;
      data.relativeAppDir = '';
      changed = true;
    }

    if (data.config?.outputFileTracingRoot && data.config.outputFileTracingRoot !== standaloneDir) {
      data.config.outputFileTracingRoot = standaloneDir;
      changed = true;
    }

    if (data.config?.turbopack?.root && data.config.turbopack.root !== standaloneDir) {
      data.config.turbopack.root = standaloneDir;
      changed = true;
    }

    if (changed) {
      writeFileSync(rsfPath, JSON.stringify(data), 'utf-8');
    }
  } catch {
    // Non-fatal — server may still work without the patch
  }
}

/**
 * Copy static assets into the standalone directory so server.js can serve them.
 * Next.js standalone output requires:
 *   .next/standalone/.next/static/  ← client JS/CSS chunks
 *   .next/standalone/public/        ← public assets (favicon, images, etc.)
 * These are NOT included in the standalone output by design; they must be copied.
 */
function prepareStandaloneAssets() {
  const standaloneDir = join(PKG_ROOT, '.next', 'standalone');
  const staticSrc = join(PKG_ROOT, '.next', 'static');
  const staticDst = join(standaloneDir, '.next', 'static');
  const publicSrc = join(PKG_ROOT, 'public');
  const publicDst = join(standaloneDir, 'public');

  // Copy .next/static/ → .next/standalone/.next/static/ (if not already there)
  if (existsSync(staticSrc) && !existsSync(staticDst)) {
    try {
      cpSync(staticSrc, staticDst, { recursive: true });
    } catch {
      // Non-fatal — pages may fail to load CSS/JS but the server will still start
    }
  }

  // Copy public/ → .next/standalone/public/ (if not already there)
  if (existsSync(publicSrc) && !existsSync(publicDst)) {
    try {
      cpSync(publicSrc, publicDst, { recursive: true });
    } catch {}
  }
}

function startServer(env, portOverride) {
  const port = portOverride || env.PORT || '3199';

  // Merge env vars
  const serverEnv = {
    ...process.env,
    ...env,
    PORT: port,
    NODE_ENV: 'production',
    HOSTNAME: '0.0.0.0',
  };

  const standaloneServer = findStandaloneServer();

  if (standaloneServer) {
    // Standalone mode — shipped as npm package
    patchStandalonePaths();
    prepareStandaloneAssets();
    startBanner(port);
    const child = spawn('node', [standaloneServer], {
      cwd: join(PKG_ROOT, '.next', 'standalone'),
      env: serverEnv,
      stdio: 'inherit',
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    process.on('SIGINT', () => { child.kill('SIGINT'); });
    process.on('SIGTERM', () => { child.kill('SIGTERM'); });
  } else {
    // Dev/unbuilt — use next start or next dev
    const hasProductionBuild = existsSync(join(PKG_ROOT, '.next', 'BUILD_ID'));
    const cmd = hasProductionBuild ? 'start' : 'dev';

    if (!hasProductionBuild) {
      console.log(`  ${yellow('!')} No production build found — starting in dev mode`);
      console.log(`  ${dim('Run')} ${cyan('npm run build')} ${dim('for production performance')}`);
      console.log('');
    }

    startBanner(port);
    const child = spawn('npx', ['next', cmd, '-p', port], {
      cwd: PKG_ROOT,
      env: serverEnv,
      stdio: 'inherit',
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    process.on('SIGINT', () => { child.kill('SIGINT'); });
    process.on('SIGTERM', () => { child.kill('SIGTERM'); });
  }
}

// ─── Daemon management ───────────────────────────────────────────────────────

function ensureRunDir() {
  if (!existsSync(RUN_DIR)) mkdirSync(RUN_DIR, { recursive: true });
}

function readPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
  if (isNaN(pid)) return null;
  return pid;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0); // signal 0 = check existence
    return true;
  } catch {
    return false;
  }
}

function getDaemonStatus() {
  const pid = readPid();
  if (!pid) return { running: false, pid: null };
  if (isProcessRunning(pid)) return { running: true, pid };
  // Stale PID file
  try { unlinkSync(PID_FILE); } catch {}
  return { running: false, pid: null };
}

function startDaemon(env, portOverride) {
  const { running, pid: existingPid } = getDaemonStatus();
  if (running) {
    console.log(`  ${yellow('!')} Pan UI is already running (PID ${existingPid})`);
    console.log(`  ${dim('Stop with:')} ${cyan('pan-ui stop')}`);
    process.exit(0);
  }

  ensureRunDir();

  const port = portOverride || env.PORT || '3199';
  const serverEnv = {
    ...process.env,
    ...env,
    PORT: port,
    NODE_ENV: 'production',
    HOSTNAME: '0.0.0.0',
  };

  const standaloneServer = findStandaloneServer();
  let cmd, cmdArgs, cwd;

  if (standaloneServer) {
    patchStandalonePaths();
    prepareStandaloneAssets();
    cmd = process.execPath; // node
    cmdArgs = [standaloneServer];
    cwd = join(PKG_ROOT, '.next', 'standalone');
  } else {
    const hasProductionBuild = existsSync(join(PKG_ROOT, '.next', 'BUILD_ID'));
    const nextCmd = hasProductionBuild ? 'start' : 'dev';
    cmd = 'npx';
    cmdArgs = ['next', nextCmd, '-p', port];
    cwd = PKG_ROOT;
  }

  // Open log file for stdout/stderr
  const logFd = openSync(LOG_FILE, 'a');

  const child = spawn(cmd, cmdArgs, {
    cwd,
    env: serverEnv,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });

  child.unref();

  writeFileSync(PID_FILE, String(child.pid), 'utf-8');

  console.log('');
  console.log(bold('  ╔══════════════════════════════════════════╗'));
  console.log(bold('  ║') + green('        ⚡ Pan UI started (daemon)         ') + bold('║'));
  console.log(bold('  ╚══════════════════════════════════════════╝'));
  console.log('');
  console.log(`  ${dim('PID:')}     ${cyan(String(child.pid))}`);
  console.log(`  ${dim('Local:')}   ${cyan(`http://localhost:${port}`)}`);
  console.log(`  ${dim('Log:')}     ${cyan(LOG_FILE)}`);
  console.log('');
  console.log(`  ${dim('Stop with:')}    ${cyan('pan-ui stop')}`);
  console.log(`  ${dim('View logs:')}    ${cyan('pan-ui logs')}`);
  console.log(`  ${dim('Check status:')} ${cyan('pan-ui status')}`);
  console.log('');
}

function stopDaemon() {
  const { running, pid } = getDaemonStatus();
  if (!running) {
    console.log(`  ${dim('Pan UI is not running.')}`);
    process.exit(0);
  }

  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ${green('✓')} Pan UI stopped (PID ${pid})`);
  } catch (err) {
    console.log(`  ${red('✗')} Failed to stop PID ${pid}: ${err.message}`);
  }

  try { unlinkSync(PID_FILE); } catch {}
}

function showStatus() {
  const { running, pid } = getDaemonStatus();
  const env = loadEnv(ENV_PATH);
  const port = env.PORT || '3199';

  if (running) {
    console.log('');
    console.log(`  ${green('●')} Pan UI is ${green('running')}`);
    console.log(`  ${dim('PID:')}     ${cyan(String(pid))}`);
    console.log(`  ${dim('Local:')}   ${cyan(`http://localhost:${port}`)}`);
    console.log(`  ${dim('Log:')}     ${cyan(LOG_FILE)}`);
    console.log('');
  } else {
    console.log('');
    console.log(`  ${red('●')} Pan UI is ${red('stopped')}`);
    console.log(`  ${dim('Start with:')} ${cyan('pan-ui start --daemon')}`);
    console.log('');
  }
}

function showLogs() {
  if (!existsSync(LOG_FILE)) {
    console.log(`  ${dim('No log file found. Start the daemon first.')}`);
    process.exit(0);
  }

  // Tail the last 50 lines, then follow
  const child = spawn('tail', ['-n', '50', '-f', LOG_FILE], {
    stdio: 'inherit',
  });
  process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0); });
  child.on('exit', (code) => process.exit(code ?? 0));
}

// ─── Systemd service management ─────────────────────────────────────────────

function getServiceDir() {
  return join(homedir(), '.config', 'systemd', 'user');
}

const SERVICE_NAME = 'pan-ui';

function getServicePath() {
  return join(getServiceDir(), `${SERVICE_NAME}.service`);
}

function generateServiceUnit(env) {
  const port = env.PORT || '3199';
  const nodePath = process.execPath;
  const binPath = resolve(__dirname, 'pan-ui.mjs');

  // Build environment lines (skip PORT — we add it explicitly below)
  const envLines = [];
  for (const [key, value] of Object.entries(env)) {
    if (key && value && key !== 'PORT') envLines.push(`Environment=${key}=${value}`);
  }
  envLines.push(`Environment=NODE_ENV=production`);
  envLines.push(`Environment=PORT=${port}`);
  envLines.push(`Environment=HOSTNAME=0.0.0.0`);

  return `[Unit]
Description=Pan UI — WebUI for Hermes Agent
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${binPath}
WorkingDirectory=${PKG_ROOT}
Restart=on-failure
RestartSec=5
${envLines.join('\n')}

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pan-ui

[Install]
WantedBy=default.target
`;
}

async function serviceInstall() {
  if (platform() !== 'linux') {
    console.log(`  ${red('✗')} Systemd services are only supported on Linux.`);
    console.log(`  ${dim('Use')} ${cyan('pan-ui start --daemon')} ${dim('instead.')}`);
    process.exit(1);
  }

  // Ensure setup has been run
  const env = loadEnv(ENV_PATH);
  if (Object.keys(env).length === 0) {
    console.log(`  ${yellow('!')} No configuration found. Running setup first...`);
    console.log('');
    const newEnv = await setup(true);
    rl.close();
    return doServiceInstall(newEnv);
  }
  rl.close();
  return doServiceInstall(env);
}

function doServiceInstall(env) {
  const serviceDir = getServiceDir();
  const servicePath = getServicePath();

  mkdirSync(serviceDir, { recursive: true });

  const unit = generateServiceUnit(env);
  writeFileSync(servicePath, unit, 'utf-8');

  console.log('');
  console.log(`  ${green('✓')} Service file written to ${cyan(servicePath)}`);

  // Reload and enable
  try {
    execSync('systemctl --user daemon-reload', { stdio: 'ignore' });
    console.log(`  ${green('✓')} Systemd daemon reloaded`);
  } catch {
    console.log(`  ${yellow('!')} Could not reload systemd daemon (are you in a user session?)`);
  }

  try {
    execSync(`systemctl --user enable ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(`  ${green('✓')} Service enabled (starts on login)`);
  } catch {
    console.log(`  ${yellow('!')} Could not enable service`);
  }

  try {
    execSync(`systemctl --user start ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(`  ${green('✓')} Service started`);
  } catch {
    console.log(`  ${yellow('!')} Could not start service — try: systemctl --user start ${SERVICE_NAME}`);
  }

  // Enable lingering so service runs even when not logged in
  try {
    execSync(`loginctl enable-linger ${process.env.USER || ''}`, { stdio: 'ignore' });
    console.log(`  ${green('✓')} Lingering enabled (survives logout)`);
  } catch {
    console.log(`  ${dim('Tip: run')} ${cyan(`loginctl enable-linger`)} ${dim('so the service survives logout')}`);
  }

  const port = env.PORT || '3199';
  console.log('');
  console.log(`  ${dim('Local:')}   ${cyan(`http://localhost:${port}`)}`);
  console.log('');
  console.log(`  ${dim('Manage with:')}`);
  console.log(`    ${cyan(`systemctl --user status ${SERVICE_NAME}`)}`);
  console.log(`    ${cyan(`systemctl --user restart ${SERVICE_NAME}`)}`);
  console.log(`    ${cyan(`journalctl --user -u ${SERVICE_NAME} -f`)}`);
  console.log(`    ${cyan(`pan-ui service remove`)}`);
  console.log('');
}

function serviceRemove() {
  if (platform() !== 'linux') {
    console.log(`  ${red('✗')} Systemd services are only supported on Linux.`);
    process.exit(1);
  }

  const servicePath = getServicePath();

  // Stop and disable
  try {
    execSync(`systemctl --user stop ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(`  ${green('✓')} Service stopped`);
  } catch {}

  try {
    execSync(`systemctl --user disable ${SERVICE_NAME}`, { stdio: 'ignore' });
    console.log(`  ${green('✓')} Service disabled`);
  } catch {}

  if (existsSync(servicePath)) {
    unlinkSync(servicePath);
    console.log(`  ${green('✓')} Removed ${servicePath}`);
  }

  try {
    execSync('systemctl --user daemon-reload', { stdio: 'ignore' });
    console.log(`  ${green('✓')} Systemd daemon reloaded`);
  } catch {}

  console.log('');
  console.log(`  ${dim('Pan UI service has been fully removed.')}`);
  console.log('');
}

function serviceStatus() {
  if (platform() !== 'linux') {
    console.log(`  ${red('✗')} Systemd services are only supported on Linux.`);
    process.exit(1);
  }

  try {
    const output = execSync(`systemctl --user status ${SERVICE_NAME} 2>&1`, { encoding: 'utf-8' });
    console.log(output);
  } catch (err) {
    // systemctl returns non-zero for inactive services
    if (err.stdout) console.log(err.stdout);
    else console.log(`  ${dim('Service not installed. Run:')} ${cyan('pan-ui service install')}`);
  }
}

// ─── CLI entry point ────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Parse global flags from any position
  const allArgs = new Set(args);
  let portOverride = null;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    portOverride = args[portIdx + 1];
  }
  const shortPortIdx = args.indexOf('-p');
  if (shortPortIdx !== -1 && args[shortPortIdx + 1]) {
    portOverride = args[shortPortIdx + 1];
  }

  const isDaemon = allArgs.has('--daemon') || allArgs.has('-d');

  // ── Version ────────────────────────────────────────────────────────────

  if (command === 'version' || command === '--version' || command === '-v') {
    rl.close();
    console.log(`pan-ui ${getCurrentVersion()}`);
    process.exit(0);
  }

  // ── Stop ──────────────────────────────────────────────────────────────

  if (command === 'stop') {
    rl.close();
    stopDaemon();
    process.exit(0);
  }

  // ── Status ────────────────────────────────────────────────────────────

  if (command === 'status') {
    rl.close();
    showStatus();
    process.exit(0);
  }

  // ── Logs ──────────────────────────────────────────────────────────────

  if (command === 'logs') {
    rl.close();
    showLogs();
    return; // showLogs takes over the process
  }

  // ── Service management ────────────────────────────────────────────────

  if (command === 'service') {
    const subcommand = args[1];
    if (subcommand === 'install') {
      await serviceInstall();
      process.exit(0);
    }
    if (subcommand === 'remove' || subcommand === 'uninstall') {
      rl.close();
      serviceRemove();
      process.exit(0);
    }
    if (subcommand === 'status') {
      rl.close();
      serviceStatus();
      process.exit(0);
    }
    // Unknown subcommand
    rl.close();
    console.log('');
    console.log(`  ${dim('Usage:')}`);
    console.log(`    ${cyan('pan-ui service install')}    Install systemd user service`);
    console.log(`    ${cyan('pan-ui service remove')}     Remove systemd user service`);
    console.log(`    ${cyan('pan-ui service status')}     Show service status`);
    console.log('');
    process.exit(1);
  }

  // ── Update ────────────────────────────────────────────────────────────

  if (command === 'update' || command === 'upgrade') {
    rl.close();
    await performUpdate();
    process.exit(0);
  }

  // ── Sync Hermes ──────────────────────────────────────────────────────

  if (command === 'sync-hermes') {
    rl.close();
    await syncHermes(allArgs.has('--force'));
    process.exit(0);
  }

  // ── Setup ─────────────────────────────────────────────────────────────

  if (command === 'setup') {
    const env = await setup(true);
    rl.close();
    console.log(`  ${dim('Start with:')} ${cyan('pan-ui start')}`);
    console.log('');
    process.exit(0);
  }

  // ── Help ──────────────────────────────────────────────────────────────

  if (command === 'help' || command === '--help' || command === '-h') {
    rl.close();
    showHelp();
    process.exit(0);
  }

  // ── Start (explicit or default) ───────────────────────────────────────

  if (command === 'start' || !command || command.startsWith('-')) {
    const env = await setup(false);
    rl.close();

    // Non-blocking update check at startup
    showUpdateNotice();

    if (isDaemon) {
      await startDaemon(env, portOverride);
      process.exit(0);
    }

    startServer(env, portOverride);
    return;
  }

  // ── Unknown command ───────────────────────────────────────────────────

  rl.close();
  console.log('');
  console.log(`  ${red('✗')} Unknown command: ${cyan(command)}`);
  console.log('');
  showHelp();
  process.exit(1);
}

function showHelp() {
  console.log('');
  console.log(bold('  pan-ui') + dim(` v${getCurrentVersion()} — Beautiful WebUI for Hermes Agent`));
  console.log('');
  console.log('  ' + bold('Commands:'));
  console.log(`    ${cyan('pan-ui start')}              Start the workspace (foreground)`);
  console.log(`    ${cyan('pan-ui start --daemon')}     Start in background`);
  console.log(`    ${cyan('pan-ui start --port 8080')}  Custom port`);
  console.log(`    ${cyan('pan-ui stop')}               Stop background daemon`);
  console.log(`    ${cyan('pan-ui status')}             Check if running`);
  console.log(`    ${cyan('pan-ui logs')}               Tail daemon logs`);
  console.log(`    ${cyan('pan-ui setup')}              Run setup wizard`);
  console.log(`    ${cyan('pan-ui update')}             Check for and install Pan updates`);
  console.log(`    ${cyan('pan-ui sync-hermes')}        Sync Hermes to the pinned version`);
  console.log(`    ${cyan('pan-ui version')}            Show current version`);
  console.log(`    ${cyan('pan-ui service install')}    Install as systemd user service`);
  console.log(`    ${cyan('pan-ui service remove')}     Remove systemd service`);
  console.log(`    ${cyan('pan-ui help')}               Show this help`);
  console.log('');
  console.log('  ' + bold('Environment variables:'));
  console.log(`    ${dim('HERMES_HOME')}                 Path to Hermes home (default: ~/.hermes)`);
  console.log(`    ${dim('HERMES_API_BASE_URL')}         Hermes API server URL (default: http://127.0.0.1:8642)`);
  console.log(`    ${dim('HERMES_API_KEY')}              API key for Hermes API server`);
  console.log(`    ${dim('HERMES_WORKSPACE_USERNAME')}   Login username (default: admin)`);
  console.log(`    ${dim('HERMES_WORKSPACE_PASSWORD')}   Login password (default: changeme)`);
  console.log(`    ${dim('HERMES_WORKSPACE_SECRET')}     Session signing secret`);
  console.log(`    ${dim('HERMES_MOCK_MODE')}            Enable mock data (default: false)`);
  console.log(`    ${dim('PORT')}                        Server port (default: 3199)`);
  console.log('');
}

main().catch((err) => {
  console.error(red(`  ✗ ${err.message}`));
  process.exit(1);
});
