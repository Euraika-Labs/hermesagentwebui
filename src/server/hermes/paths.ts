import fs from 'node:fs';
import path from 'node:path';

function profileNameFromScopedHome(home: string) {
  const normalized = path.normalize(home);
  const marker = `${path.sep}profiles${path.sep}`;
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return null;
  return normalized.slice(index + marker.length).split(path.sep)[0] || null;
}

export function getConfiguredHermesHome() {
  return process.env.HERMES_HOME || path.join(process.env.HOME || '', '.hermes');
}

export function getHermesHome() {
  const configured = getConfiguredHermesHome();
  const scopedProfile = profileNameFromScopedHome(configured);
  return scopedProfile ? path.dirname(path.dirname(configured)) : configured;
}

export function getActiveProfileNameFromHome() {
  return profileNameFromScopedHome(getConfiguredHermesHome());
}

export function getProfileName(profileId: string | null | undefined) {
  if (!profileId || profileId === 'default') return 'default';
  return profileId;
}

export function getProfileRoot(profileId: string | null | undefined) {
  const hermesHome = getHermesHome();
  const configuredHome = getConfiguredHermesHome();
  const activeProfile = getActiveProfileNameFromHome();
  const profileName = getProfileName(profileId);

  if (profileName === 'default') {
    return activeProfile ? configuredHome : hermesHome;
  }

  if (activeProfile && profileName === activeProfile) {
    return configuredHome;
  }

  return path.join(hermesHome, 'profiles', profileName);
}

export function getProfileStateDb(profileId: string | null | undefined) {
  return path.join(getProfileRoot(profileId), 'state.db');
}

export function getProfileMemoriesDir(profileId: string | null | undefined) {
  return path.join(getProfileRoot(profileId), 'memories');
}

export function getProfileSkillsDir(profileId: string | null | undefined) {
  return path.join(getProfileRoot(profileId), 'skills');
}

export function getProfileConfigPath(profileId: string | null | undefined) {
  return path.join(getProfileRoot(profileId), 'config.yaml');
}

/**
 * Return the effective home directory for the active Hermes profile.
 *
 * Uses the profile detection heuristic (sticky file, single-profile scan)
 * to resolve from the base HERMES_HOME to the actual profile subdirectory.
 * If no named profile is active, returns the configured HERMES_HOME as-is.
 */
export function getEffectiveHome(): string {
  // Lazy import to avoid circular deps at module load time
  const { detectHermesActiveProfileFromHome } = require('@/server/hermes/profile-context');
  const hermesHome = getHermesHome();
  const active: string = detectHermesActiveProfileFromHome();

  if (active && active !== 'default') {
    const profileDir = path.join(hermesHome, 'profiles', active);
    if (fs.existsSync(profileDir)) return profileDir;
  }

  return getConfiguredHermesHome();
}

export function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}
