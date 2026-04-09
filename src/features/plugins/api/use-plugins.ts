'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { Plugin } from '@/lib/types/plugin';

type PluginsResponse = { plugins: Plugin[] };
type PluginResponse = { plugin: Plugin };
type InstallPluginResponse = { success: boolean; identifier: string };

export function usePlugins() {
  return useQuery({
    queryKey: ['plugins'],
    queryFn: () => apiFetch<PluginsResponse>('/api/plugins'),
    select: (data) => data.plugins,
  });
}

export function usePluginDetail(id: string) {
  return useQuery({
    queryKey: ['plugins', id],
    queryFn: () => apiFetch<PluginResponse>(`/api/plugins/${id}`),
    select: (data) => data.plugin,
    enabled: Boolean(id),
  });
}

export function useInstallPlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { identifier: string }) =>
      apiFetch<InstallPluginResponse>('/api/plugins/install', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}

export function useRemovePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/plugins/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}

export function useTogglePlugin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiFetch<PluginResponse>(`/api/plugins/${id}/enable`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });
}
