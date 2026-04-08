import { NextResponse } from 'next/server';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PKG_NAME = '@euraika-labs/pan-ui';
const CACHE_DIR = join(tmpdir(), 'pan-ui');
const CACHE_FILE = join(CACHE_DIR, 'update-check.json');
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function getCurrentVersion(): string {
  try {
    // Read from our own package.json
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface UpdateCheckResult {
  current: string;
  latest: string;
  updateAvailable: boolean;
  checkedAt: number;
}

function getCachedResult(current: string): UpdateCheckResult | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    const cached: UpdateCheckResult = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    const age = Date.now() - (cached.checkedAt || 0);
    if (age < CACHE_TTL && cached.current === current) {
      return cached;
    }
  } catch { /* ignore corrupt cache */ }
  return null;
}

function cacheResult(result: UpdateCheckResult): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(result), 'utf-8');
  } catch { /* ignore write failure */ }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const current = getCurrentVersion();

  // Try cache first (unless force refresh)
  if (!force) {
    const cached = getCachedResult(current);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  // Query npm registry
  try {
    const latest = execSync(`npm view ${PKG_NAME} version 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    if (!latest) {
      return NextResponse.json(
        { current, latest: null, updateAvailable: false, error: 'Could not fetch latest version' },
        { status: 502 },
      );
    }

    const result: UpdateCheckResult = {
      current,
      latest,
      updateAvailable: latest !== current && compareVersions(latest, current) > 0,
      checkedAt: Date.now(),
    };

    cacheResult(result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { current, latest: null, updateAvailable: false, error: 'npm registry unreachable' },
      { status: 502 },
    );
  }
}
