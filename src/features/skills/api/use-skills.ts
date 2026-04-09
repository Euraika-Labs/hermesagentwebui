'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { normalizeSkill, normalizeSkills } from '@/lib/api/normalizers';
import type { Skill } from '@/lib/types/skill';

type SkillsResponse = { skills: Skill[] };
type SkillResponse = { skill: Skill };

export function useSkills(installedOnly = true) {
  return useQuery({
    queryKey: ['skills', installedOnly],
    queryFn: () => apiFetch<SkillsResponse>(`/api/skills${installedOnly ? '?installed=true' : ''}`),
    select: (data) => normalizeSkills(data.skills),
  });
}

export function useSkill(skillId: string | null) {
  return useQuery({
    queryKey: ['skill', skillId],
    queryFn: () => apiFetch<SkillResponse>(`/api/skills/${skillId}`),
    select: (data) => normalizeSkill(data.skill),
    enabled: Boolean(skillId),
  });
}

function invalidateSkills(queryClient: ReturnType<typeof useQueryClient>, skill: Skill) {
  const normalized = normalizeSkill(skill);
  queryClient.invalidateQueries({ queryKey: ['skills'] });
  queryClient.setQueryData(['skill', normalized.id], { skill: normalized });
}

export function useInstallSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => apiFetch<SkillResponse>(`/api/skills/${skillId}/install`, { method: 'POST' }),
    onSuccess: ({ skill }) => invalidateSkills(queryClient, skill),
  });
}

export function useEnableSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, enabled }: { skillId: string; enabled: boolean }) =>
      apiFetch<SkillResponse>(`/api/skills/${skillId}/enable`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: ({ skill }) => invalidateSkills(queryClient, skill),
  });
}

export function useUpdateSkillContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, content }: { skillId: string; content: string }) =>
      apiFetch<SkillResponse>(`/api/skills/${skillId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),
    onSuccess: ({ skill }) => invalidateSkills(queryClient, skill),
  });
}

export function useLoadSkillIntoSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, sessionId }: { skillId: string; sessionId: string }) =>
      apiFetch<SkillResponse>(`/api/skills/${skillId}/load`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
    onSuccess: ({ skill }, variables) => {
      invalidateSkills(queryClient, skill);
      queryClient.setQueryData(['session', variables.sessionId], (current: { session?: { loadedSkillIds?: string[] } } | undefined) => {
        if (!current?.session) return current;
        const loadedSkillIds = current.session.loadedSkillIds ?? [];
        return {
          ...current,
          session: {
            ...current.session,
            loadedSkillIds: loadedSkillIds.includes(variables.skillId) ? loadedSkillIds : [variables.skillId, ...loadedSkillIds],
          },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['session', variables.sessionId] });
    },
  });
}

export function useUninstallSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => apiFetch<SkillResponse>(`/api/skills/${skillId}`, { method: 'DELETE' }),
    onSuccess: ({ skill }) => invalidateSkills(queryClient, skill),
  });
}

export function useSkillCategories() {
  return useQuery({
    queryKey: ['skill-categories'],
    queryFn: () => apiFetch<{ categories: string[] }>('/api/skills/categories'),
    select: (data) => data.categories,
  });
}

export function useSkillLinkedFile(skillId: string | null, filePath: string | null) {
  return useQuery({
    queryKey: ['skill-file', skillId, filePath],
    queryFn: () =>
      apiFetch<{ path: string; content: string }>(
        `/api/skills/${skillId}/files?path=${encodeURIComponent(filePath!)}`,
      ),
    enabled: Boolean(skillId && filePath),
  });
}

// ─── Hub / Discover hooks ───────────────────────────────────

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
  detail?: {
    title: string;
    summary: string;
    weeklyInstalls: string;
    installCommand: string;
    securityAudits?: Record<string, string>;
  };
};

type HubResponse = { skills: HubSkill[]; total: number; filtered: number };

export function useHubSkills(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return useQuery({
    queryKey: ['hub-skills', query ?? ''],
    queryFn: () => apiFetch<HubResponse>(`/api/skills/hub${params}`),
  });
}

export function useInstallHubSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ identifier, category, force }: { identifier: string; category?: string; force?: boolean }) =>
      apiFetch<{ success: boolean; identifier: string }>('/api/skills/hub/install', {
        method: 'POST',
        body: JSON.stringify({ identifier, category, force }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['hub-skills'] });
      queryClient.invalidateQueries({ queryKey: ['skill-categories'] });
    },
  });
}
