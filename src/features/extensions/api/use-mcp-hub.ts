'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { McpHubSearchResult } from '@/server/hermes/hub-mcp';

type InstallPayload = {
  identifier: string;
  env?: Record<string, string>;
};

type InstallResponse = {
  success: boolean;
  error?: string;
};

export function useHubMcpServers(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : '';
  return useQuery({
    queryKey: ['hub-mcp', query ?? ''],
    queryFn: () => apiFetch<McpHubSearchResult>(`/api/extensions/hub${params}`),
  });
}

export function useInstallMcpServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InstallPayload) =>
      apiFetch<InstallResponse>('/api/extensions/hub/install', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hub-mcp'] });
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
    },
  });
}
