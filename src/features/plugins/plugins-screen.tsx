'use client';

import { useState } from 'react';
import { Puzzle } from 'lucide-react';
import { usePlugins, useTogglePlugin, useRemovePlugin } from '@/features/plugins/api/use-plugins';
import { PluginCard } from '@/features/plugins/components/plugin-card';
import { InstallPluginDialog } from '@/features/plugins/components/install-plugin-dialog';

export function PluginsScreen() {
  const pluginsQuery = usePlugins();
  const togglePlugin = useTogglePlugin();
  const removePlugin = useRemovePlugin();
  const [dialogOpen, setDialogOpen] = useState(false);

  const plugins = pluginsQuery.data ?? [];

  function handleToggle(id: string, enabled: boolean) {
    void togglePlugin.mutateAsync({ id, enabled });
  }

  function handleRemove(id: string) {
    void removePlugin.mutateAsync(id);
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 p-4 lg:p-6 pb-8 lg:pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plugins</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Plugins extend your agent with custom tools, hooks, and integrations. Install plugins from GitHub or manage built-in ones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Install Plugin
        </button>
      </div>

      {pluginsQuery.isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      )}

      {pluginsQuery.isError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-400">
          Failed to load plugins: {pluginsQuery.error instanceof Error ? pluginsQuery.error.message : 'Unknown error'}
        </div>
      )}

      {pluginsQuery.isSuccess && plugins.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Puzzle className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No plugins installed</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Plugins add custom tools, lifecycle hooks, and integrations to your agent.
            Install a plugin from a GitHub repository to get started, or enable built-in plugins as they become available.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Install your first plugin
          </button>
        </div>
      )}

      {pluginsQuery.isSuccess && plugins.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onToggle={handleToggle}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      <InstallPluginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
