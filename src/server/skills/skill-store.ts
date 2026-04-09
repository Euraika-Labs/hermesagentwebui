import type { Skill } from '@/lib/types/skill';
import { getSession, updateSession } from '@/server/chat/session-store';
import { validateSkillContent } from '@/server/hermes/yaml-config';

const nowIso = () => new Date().toISOString();

function seedSkills(): Skill[] {
  return [
    {
      id: 'hermes-agent',
      name: 'hermes-agent',
      description: 'Core Hermes Agent operational knowledge and contributor reference.',
      source: 'bundled',
      scope: 'builtin',
      provenance: 'built-in',
      installed: true,
      enabled: true,
      content: '# Hermes Agent\n\nBundled skill content for Hermes Agent operations and extension patterns.',
      loadedInSessions: [],
      version: '1.0.0',
      updatedAt: nowIso(),
      impliedTools: ['shell', 'planning'],
    },
    {
      id: 'writing-plans',
      name: 'writing-plans',
      description: 'Write detailed implementation plans and phased delivery breakdowns.',
      source: 'hub',
      scope: 'global',
      provenance: 'verified',
      installed: true,
      enabled: true,
      content: '# Writing Plans\n\nUse this skill to turn specs into concrete engineering plans.',
      loadedInSessions: [],
      version: '1.1.0',
      updatedAt: nowIso(),
      impliedTools: ['planning'],
    },
    {
      id: 'mcp-operator',
      name: 'mcp-operator',
      description: 'Manage MCP servers, connectivity, and safe capability exposure.',
      source: 'hub',
      scope: 'global',
      provenance: 'verified',
      installed: false,
      enabled: false,
      content: '# MCP Operator\n\nInstall, test, and manage MCP servers for Hermes.',
      loadedInSessions: [],
      version: '0.8.0',
      updatedAt: nowIso(),
      impliedTools: ['mcp', 'diagnostics'],
    },
    {
      id: 'skill-authoring',
      name: 'skill-authoring',
      description: 'Create, edit, and maintain durable Hermes skills.',
      source: 'local',
      scope: 'profile',
      provenance: 'custom',
      installed: true,
      enabled: false,
      content: '# Skill Authoring\n\nLocal skill for creating and refining skills safely.',
      loadedInSessions: [],
      version: '0.2.0',
      updatedAt: nowIso(),
      impliedTools: ['editor'],
      ownerProfileId: 'default',
      filePath: '~/.hermes/profiles/default/skills/skill-authoring/SKILL.md',
    },
  ];
}

declare global {
  // eslint-disable-next-line no-var
  var __hermesWorkspaceSkills: Map<string, Skill> | undefined;
}

const seeded = seedSkills();
const skills = globalThis.__hermesWorkspaceSkills ?? new Map(seeded.map((skill) => [skill.id, skill]));
globalThis.__hermesWorkspaceSkills = skills;

export function listSkills({ installedOnly = false }: { installedOnly?: boolean } = {}) {
  return Array.from(skills.values())
    .filter((skill) => (installedOnly ? skill.installed : true))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkill(skillId: string) {
  return skills.get(skillId) ?? null;
}

export function installSkill(skillId: string) {
  const skill = getRequiredSkill(skillId);
  skill.installed = true;
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);
  return skill;
}

export function uninstallSkill(skillId: string) {
  const skill = getRequiredSkill(skillId);
  skill.installed = false;
  skill.enabled = false;
  skill.loadedInSessions = [];
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);
  return skill;
}

export function enableSkill(skillId: string) {
  const skill = getRequiredSkill(skillId);
  skill.installed = true;
  skill.enabled = true;
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);
  return skill;
}

export function disableSkill(skillId: string) {
  const skill = getRequiredSkill(skillId);
  skill.enabled = false;
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);
  return skill;
}

export function updateSkillContent(skillId: string, content: string) {
  validateSkillContent(content);
  const skill = getRequiredSkill(skillId);
  skill.content = content;
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);
  return skill;
}

export function loadSkillIntoSession(skillId: string, sessionId: string) {
  const skill = getRequiredSkill(skillId);
  if (!skill.installed) {
    skill.installed = true;
  }
  if (!skill.enabled) {
    skill.enabled = true;
  }
  if (!skill.loadedInSessions?.includes(sessionId)) {
    skill.loadedInSessions = [...(skill.loadedInSessions ?? []), sessionId];
  }
  skill.updatedAt = nowIso();
  skills.set(skill.id, skill);

  const session = getSession(sessionId);
  if (session) {
    updateSession(sessionId, (currentSession) => {
      const loadedSkills = currentSession.loadedSkillIds ?? [];
      if (!loadedSkills.includes(skillId)) {
        currentSession.loadedSkillIds = [skillId, ...loadedSkills];
      }
    });
  }

  return skill;
}

function getRequiredSkill(skillId: string) {
  const skill = skills.get(skillId);
  if (!skill) {
    throw new Error('Skill not found');
  }
  return { ...skill };
}
