'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { HubSkill } from '@/features/skills/api/use-skills';
import type { McpHubSearchResult } from '@/server/hermes/hub-mcp';
import type { Plugin } from '@/lib/types/plugin';

type PluginsResponse = { plugins: Plugin[] };
type HubSkillsResponse = { skills: HubSkill[]; total: number; filtered: number };

export type MarketplaceSearchResult = {
  skills: HubSkill[];
  mcpServers: McpHubSearchResult['servers'];
  plugins: Plugin[];
  total: number;
};

async function fetchMarketplaceSearch(query: string): Promise<MarketplaceSearchResult> {
  const q = encodeURIComponent(query);

  const [skillsRes, mcpRes, pluginsRes] = await Promise.all([
    apiFetch<HubSkillsResponse>(`/api/skills/hub?q=${q}`),
    apiFetch<McpHubSearchResult>(`/api/extensions/hub?q=${q}`),
    apiFetch<PluginsResponse>('/api/plugins'),
  ]);

  // Filter plugins client-side by query match on name/description
  const lowerQ = query.toLowerCase();
  const filteredPlugins = pluginsRes.plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQ) ||
      p.description.toLowerCase().includes(lowerQ),
  );

  return {
    skills: skillsRes.skills,
    mcpServers: mcpRes.servers,
    plugins: filteredPlugins,
    total: skillsRes.skills.length + mcpRes.servers.length + filteredPlugins.length,
  };
}

export function useMarketplaceSearch(query: string) {
  return useQuery({
    queryKey: ['marketplace-search', query],
    queryFn: () => fetchMarketplaceSearch(query),
    enabled: query.trim().length > 0,
  });
}
