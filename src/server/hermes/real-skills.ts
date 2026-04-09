import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Skill } from '@/lib/types/skill';
import { getHermesHome, getProfileConfigPath, getProfileSkillsDir, getProfileStateDb } from '@/server/hermes/paths';
import { readSqliteJson } from '@/server/hermes/sqlite-bridge';
import { parseYamlFrontmatter, readYamlFile, validateSkillContent, writeYamlFile } from '@/server/hermes/yaml-config';

const execFileAsync = promisify(execFile);

type SkillsConfigShape = {
  skills?: {
    disabled?: string[];
    platform_disabled?: Record<string, string[]>;
  };
};

type SkillOrigin = {
  path: string;
  source: Skill['source'];
  scope: Skill['scope'];
  provenance: Skill['provenance'];
  ownerProfileId?: string | null;
};

function collectSkillFiles(origin: Omit<SkillOrigin, 'path'> & { root: string }): SkillOrigin[] {
  if (!fs.existsSync(origin.root)) return [];
  const results: SkillOrigin[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        results.push({
          path: full,
          source: origin.source,
          scope: origin.scope,
          provenance: origin.provenance,
          ownerProfileId: origin.ownerProfileId,
        });
      }
    }
  };
  walk(origin.root);
  return results;
}

function getDisabledSkills(profileId: string | null | undefined): Set<string> {
  const config = readYamlFile<SkillsConfigShape>(getProfileConfigPath(profileId));
  const globalDisabled = new Set(config.skills?.disabled || []);
  const platformDisabled = new Set(config.skills?.platform_disabled?.cli || []);
  return new Set([...globalDisabled, ...platformDisabled]);
}

function writeSkillEnabled(profileId: string | null | undefined, skillId: string, enabled: boolean) {
  const configPath = getProfileConfigPath(profileId);
  const config = readYamlFile<SkillsConfigShape>(configPath);
  config.skills = config.skills || {};
  const disabled = new Set(config.skills.disabled || []);
  const platformDisabled = new Set(config.skills.platform_disabled?.cli || []);
  if (enabled) {
    disabled.delete(skillId);
    platformDisabled.delete(skillId);
  } else {
    disabled.add(skillId);
    platformDisabled.add(skillId);
  }
  config.skills.disabled = Array.from(disabled).sort();
  config.skills.platform_disabled = config.skills.platform_disabled || {};
  config.skills.platform_disabled.cli = Array.from(platformDisabled).sort();
  writeYamlFile(configPath, config);
}

function deriveCategory(skillPath: string, root: string): string | undefined {
  const skillDir = path.dirname(skillPath);
  const relative = path.relative(root, skillDir);
  const parts = relative.split(path.sep);
  if (parts.length <= 1) return undefined;
  // Category is everything except the last segment (which is the skill name)
  return parts.slice(0, -1).join('/');
}

function collectLinkedFiles(skillDir: string): import('@/lib/types/skill').SkillLinkedFile[] {
  const groups = ['references', 'templates', 'scripts', 'assets'];
  const results: import('@/lib/types/skill').SkillLinkedFile[] = [];
  for (const group of groups) {
    const groupDir = path.join(skillDir, group);
    if (!fs.existsSync(groupDir)) continue;
    for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      results.push({
        path: `${group}/${entry.name}`,
        name: entry.name,
        group,
      });
    }
  }
  return results;
}

function parseSkill(origin: SkillOrigin, disabled: Set<string>, root: string): Skill {
  const content = fs.readFileSync(origin.path, 'utf-8');
  const name = path.basename(path.dirname(origin.path));
  const skillDir = path.dirname(origin.path);
  const stats = fs.statSync(origin.path);
  const { frontmatter } = parseYamlFrontmatter(content);
  const description = typeof frontmatter.description === 'string'
    ? frontmatter.description
    : content.split('\n').find((line) => line.toLowerCase().startsWith('description:'))?.split(':').slice(1).join(':').trim() || 'Hermes skill';
  const version = typeof frontmatter.version === 'string' ? frontmatter.version : undefined;
  const impliedTools = Array.isArray(frontmatter.tools)
    ? frontmatter.tools.map((item) => String(item)).filter(Boolean)
    : undefined;

  // Extract metadata from frontmatter
  const meta = (frontmatter.metadata as Record<string, unknown>)?.hermes as Record<string, unknown> | undefined;
  const tags = Array.isArray(meta?.tags) ? meta.tags.map(String) : undefined;
  const relatedSkills = Array.isArray(meta?.related_skills) ? meta.related_skills.map(String) : undefined;
  const author = typeof frontmatter.author === 'string' ? frontmatter.author : undefined;
  const category = deriveCategory(origin.path, root);
  const linkedFiles = collectLinkedFiles(skillDir);

  return {
    id: name,
    name,
    description,
    source: origin.source,
    scope: origin.scope,
    provenance: origin.provenance,
    installed: true,
    enabled: !disabled.has(name),
    content,
    loadedInSessions: [],
    ownerProfileId: origin.ownerProfileId,
    filePath: origin.path,
    version,
    updatedAt: stats.mtime.toISOString(),
    impliedTools,
    category,
    tags,
    relatedSkills,
    linkedFiles: linkedFiles.length > 0 ? linkedFiles : undefined,
    author,
  };
}

export function listRealSkills(profileId: string | null | undefined): Skill[] {
  const hermesHome = getHermesHome();
  const builtinsRoot = path.join(hermesHome, 'hermes-agent', 'skills');
  const globalRoot = path.join(hermesHome, 'skills');
  const profileRoot = getProfileSkillsDir(profileId);
  const disabled = getDisabledSkills(profileId);
  const origins: Array<{ root: string; files: SkillOrigin[] }> = [
    { root: profileRoot, files: collectSkillFiles({ root: profileRoot, source: 'local', scope: 'profile', provenance: 'custom', ownerProfileId: profileId }) },
    { root: globalRoot, files: collectSkillFiles({ root: globalRoot, source: 'local', scope: 'global', provenance: 'custom' }) },
    { root: builtinsRoot, files: collectSkillFiles({ root: builtinsRoot, source: 'bundled', scope: 'builtin', provenance: 'built-in' }) },
  ];
  const seen = new Set<string>();
  const skills: Skill[] = [];
  for (const { root, files } of origins) {
    for (const file of files) {
      const parsed = parseSkill(file, disabled, root);
      if (seen.has(parsed.id)) continue;
      seen.add(parsed.id);
      skills.push(parsed);
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

export function getRealSkill(profileId: string | null | undefined, skillId: string): Skill | null {
  return listRealSkills(profileId).find((skill) => skill.id === skillId) || null;
}

export function updateRealSkill(profileId: string | null | undefined, skillId: string, content: string): Skill {
  validateSkillContent(content);
  const hermesHome = getHermesHome();
  const globalPath = path.join(hermesHome, 'skills', skillId, 'SKILL.md');
  const profilePath = path.join(getProfileSkillsDir(profileId), skillId, 'SKILL.md');
  // Prefer updating in-place if the skill already exists somewhere;
  // for NEW skills, always write to the global dir so they survive profile resets.
  const existing = [profilePath, globalPath].find((fp) => fs.existsSync(fp));
  const target = existing || globalPath;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf-8');
  return getRealSkill(profileId, skillId)!;
}

export function installRealSkill(profileId: string | null | undefined, skillId: string): Skill {
  const hermesHome = getHermesHome();
  const builtins = path.join(hermesHome, 'hermes-agent', 'skills', skillId, 'SKILL.md');
  // Always install to global dir so skills survive profile resets
  const target = path.join(hermesHome, 'skills', skillId, 'SKILL.md');
  if (fs.existsSync(builtins)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(builtins, target);
    return getRealSkill(profileId, skillId)!;
  }
  throw new Error('Real skill not found for install');
}

export function uninstallRealSkill(profileId: string | null | undefined, skillId: string) {
  const hermesHome = getHermesHome();
  // Remove from both profile and global dirs to fully uninstall
  const profileDir = path.join(getProfileSkillsDir(profileId), skillId);
  const globalDir = path.join(hermesHome, 'skills', skillId);
  let removed = false;
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
    removed = true;
  }
  if (fs.existsSync(globalDir)) {
    fs.rmSync(globalDir, { recursive: true, force: true });
    removed = true;
  }
  if (!removed) throw new Error('Installed real skill not found');
  return true;
}

export function setRealSkillEnabled(profileId: string | null | undefined, skillId: string, enabled: boolean): Skill {
  const skill = getRealSkill(profileId, skillId);
  if (!skill) throw new Error('Real skill not found');
  writeSkillEnabled(profileId, skillId, enabled);
  return getRealSkill(profileId, skillId)!;
}

export function readRealSkillLinkedFile(profileId: string | null | undefined, skillId: string, filePath: string): string | null {
  const skill = getRealSkill(profileId, skillId);
  if (!skill?.filePath) return null;
  const skillDir = path.dirname(skill.filePath);
  // Sanitize: prevent path traversal
  const normalized = path.normalize(filePath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  const allowedPrefixes = ['references/', 'templates/', 'scripts/', 'assets/'];
  if (!allowedPrefixes.some((prefix) => normalized.startsWith(prefix))) return null;
  const target = path.join(skillDir, normalized);
  if (!fs.existsSync(target)) return null;
  return fs.readFileSync(target, 'utf-8');
}

export function listRealSkillCategories(profileId: string | null | undefined): string[] {
  const skills = listRealSkills(profileId);
  const categories = new Set<string>();
  for (const skill of skills) {
    if (skill.category) categories.add(skill.category);
  }
  return Array.from(categories).sort();
}

export async function loadRealSkillIntoSession(profileId: string | null | undefined, sessionId: string, skillId: string) {
  await execFileAsync('hermes', ['skills', 'list'], { encoding: 'utf-8', timeout: 15000 });
  const dbPath = getProfileStateDb(profileId);
  if (!fs.existsSync(dbPath)) return skillId;
  readSqliteJson(
    dbPath,
    `import json\nsession_id=${JSON.stringify(sessionId)}\nskill_id=${JSON.stringify(skillId)}\ncur.execute("SELECT model_config FROM sessions WHERE id=?", (session_id,))\nr=cur.fetchone()\nif not r: print(json.dumps({'ok': False})); raise SystemExit\nconfig={}\nif r[0]:\n    try: config=json.loads(r[0]) or {}\n    except Exception: config={}\nloaded=config.get('loadedSkillIds', [])\nif skill_id not in loaded:\n    loaded=[skill_id, *loaded]\nconfig['loadedSkillIds']=loaded\ncur.execute("UPDATE sessions SET model_config=? WHERE id=?", (json.dumps(config), session_id))\nconn.commit()\nprint(json.dumps({'ok': True}))`,
  );
  return skillId;
}
