import fs from 'node:fs';
import path from 'node:path';
import { getConfiguredHermesHome, getHermesHome } from '@/server/hermes/paths';

let cachedActiveProfile: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // re-detect every 60 s

/**
 * Detect the active Hermes profile.
 *
 * Priority:
 * 1. If HERMES_HOME points to a profile directory, use that.
 * 2. Read the `active_profile` sticky file (~/.hermes/active_profile).
 * 3. Fall back to 'default'.
 */
export function detectHermesActiveProfileFromHome(): string {
  // 1. If HERMES_HOME explicitly points to a profile dir, use that.
  const hermesHome = getConfiguredHermesHome();
  const normalized = path.normalize(hermesHome);
  const marker = `${path.sep}profiles${path.sep}`;
  const index = normalized.lastIndexOf(marker);
  if (index !== -1) {
    const fromPath = normalized.slice(index + marker.length).split(path.sep)[0];
    if (fromPath) return fromPath;
  }

  // Use cache to avoid reading the file on every request.
  const now = Date.now();
  if (cachedActiveProfile && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedActiveProfile;
  }

  // 2. Read the active_profile sticky file (written by `hermes profile use`).
  //    Located at ~/.hermes/active_profile (the base hermes home, not a profile subdir).
  const baseHome = getHermesHome();
  const stickyPath = path.join(baseHome, 'active_profile');
  try {
    const content = fs.readFileSync(stickyPath, 'utf-8').trim();
    if (content && content !== 'default') {
      // Verify the profile directory actually exists
      const profileDir = path.join(baseHome, 'profiles', content);
      if (fs.existsSync(profileDir)) {
        cachedActiveProfile = content;
        cacheTimestamp = now;
        return content;
      }
    }
  } catch {
    // File doesn't exist or is unreadable — fall through.
  }

  // 3. Scan profiles directory for a single non-default profile as a hint.
  //    If there's only one named profile, it's likely the intended active one.
  const profilesDir = path.join(baseHome, 'profiles');
  try {
    if (fs.existsSync(profilesDir)) {
      const entries = fs.readdirSync(profilesDir).filter((name) =>
        fs.statSync(path.join(profilesDir, name)).isDirectory()
      );
      if (entries.length === 1) {
        cachedActiveProfile = entries[0];
        cacheTimestamp = now;
        return entries[0];
      }
    }
  } catch {
    // Directory not readable — fall through.
  }

  cachedActiveProfile = 'default';
  cacheTimestamp = now;
  return 'default';
}

export function describeHermesProfileContext(profileId?: string | null) {
  const activeProfile = detectHermesActiveProfileFromHome();
  const requestedProfile = profileId || activeProfile;
  return {
    requestedProfile,
    activeProfile,
    usingRequestedProfile: requestedProfile === activeProfile,
    label: requestedProfile === activeProfile ? `${requestedProfile} · active runtime profile` : `${requestedProfile} · requested via WebUI`,
  };
}
